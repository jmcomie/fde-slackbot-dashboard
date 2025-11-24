import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("process-slack-message function started")

interface SlackEvent {
  type: string
  user: string
  text: string
  ts: string
  channel: string
  thread_ts?: string
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

    // Only process message events
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

    console.log('Processing Slack message:', payload.event.text)

    // Step 1: Insert the message into slack_events table
    const { data: insertedEvent, error: insertError } = await supabase
      .from('slack_events')
      .insert({
        event_id: `slack_${payload.event.ts}_${Date.now()}`,
        event_type: payload.event.type,
        team_id: payload.team_id,
        channel_id: payload.event.channel,
        user_id: payload.event.user,
        message_text: payload.event.text,
        message_ts: payload.event.ts,
        thread_ts: payload.event.thread_ts,
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
