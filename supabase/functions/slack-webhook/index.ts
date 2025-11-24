import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("process-slack-message function started")

interface SlackEvent {
  type: string
  subtype?: string
  user?: string
  text?: string
  ts: string
  channel: string
  thread_ts?: string
  // Fields for message_changed events
  message?: {
    user: string
    text: string
    ts: string
    thread_ts?: string
  }
  previous_message?: {
    user: string
    text: string
    ts: string
  }
  // Fields for message_deleted events
  deleted_ts?: string
}

interface SlackPayload {
  token: string
  team_id: string
  event: SlackEvent
  type: string
  challenge?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const payload: SlackPayload = await req.json()

    // Handle Slack URL verification challenge
    if (payload.type === 'url_verification' && payload.challenge) {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // TODO: Validate Slack request signature for security

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseSecretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseSecretKey)

    // Only process message events (including subtypes)
    if (payload.type !== 'event_callback' || payload.event.type !== 'message') {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Event received but not a message event"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    const event = payload.event

    // Handle message_changed subtype (edits)
    if (event.subtype === 'message_changed' && event.message) {
      console.log('Processing message edit:', event.message.ts)

      const { error: updateError } = await supabase
        .from('slack_events')
        .update({
          message_text: event.message.text,
          raw_payload: payload,
        })
        .eq('channel_id', event.channel)
        .eq('message_ts', event.message.ts)

      if (updateError) {
        console.error('Error updating edited message:', updateError)
        // Don't throw - message edit is not critical
      } else {
        console.log('Successfully updated edited message')
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Message edit processed",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 200,
        }
      )
    }

    // Handle message_deleted subtype
    if (event.subtype === 'message_deleted' && event.deleted_ts) {
      console.log('Processing message deletion:', event.deleted_ts)

      // Soft delete: Update message_text to indicate deletion
      const { error: deleteError } = await supabase
        .from('slack_events')
        .update({
          message_text: '[deleted]',
          raw_payload: payload,
        })
        .eq('channel_id', event.channel)
        .eq('message_ts', event.deleted_ts)

      if (deleteError) {
        console.error('Error processing deleted message:', deleteError)
        // Don't throw - message deletion is not critical
      } else {
        console.log('Successfully processed deleted message')
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Message deletion processed",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 200,
        }
      )
    }

    // Handle bot messages and other subtypes we want to ignore
    if (event.subtype && !['message_changed', 'message_deleted'].includes(event.subtype)) {
      console.log('Ignoring message subtype:', event.subtype)
      return new Response(
        JSON.stringify({
          success: true,
          message: `Ignored message subtype: ${event.subtype}`
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    // Handle standard new messages (no subtype or subtypes we don't handle above)
    if (!event.text || !event.user) {
      console.log('Message missing required fields (text or user)')
      return new Response(
        JSON.stringify({
          success: true,
          message: "Message missing required fields"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    console.log('Processing new Slack message:', event.text)

    // Step 1: Insert the message into slack_events table
    const { data: insertedEvent, error: insertError } = await supabase
      .from('slack_events')
      .insert({
        event_id: `slack_${event.ts}_${Date.now()}`,
        event_type: event.type,
        team_id: payload.team_id,
        channel_id: event.channel,
        user_id: event.user,
        message_text: event.text,
        message_ts: event.ts,
        thread_ts: event.thread_ts,
        raw_payload: payload,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting slack_event:', insertError)
      throw insertError
    }

    console.log('Inserted slack_event with id:', insertedEvent.id)

    // Step 2: Call processing edge function to classify and group the message
    const processUrl = `${supabaseUrl}/functions/v1/process-slack-event`

    try {
      const processResponse = await fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseSecretKey}`
        },
        body: JSON.stringify({ message_ids: [insertedEvent.id] }),
      })

      if (!processResponse.ok) {
        console.error('Processing edge function failed:', await processResponse.text())
      } else {
        const processResult = await processResponse.json()
        console.log('Processing result:', processResult)
      }
    } catch (processError) {
      // Log but don't fail the webhook - message is already saved
      console.error('Error calling process edge function:', processError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Slack message received and processed",
        event_id: insertedEvent.id
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing Slack message:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      }
    )
  }
})
