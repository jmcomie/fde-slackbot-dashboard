import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ChannelContextRequest {
  message_ts: string
  channel_id: string
  before_count?: number
  after_count?: number
}

interface SlackMessage {
  type: string
  user?: string
  text?: string
  ts: string
  thread_ts?: string
  [key: string]: any
}

interface SlackHistoryResponse {
  ok: boolean
  messages?: SlackMessage[]
  error?: string
  has_more?: boolean
  response_metadata?: {
    next_cursor?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      message_ts,
      channel_id,
      before_count = 5,
      after_count = 5
    }: ChannelContextRequest = await req.json()

    // Validate input
    if (!message_ts || !channel_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'message_ts and channel_id are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    const slackToken = Deno.env.get('SLACK_BOT_TOKEN')
    if (!slackToken) {
      throw new Error('SLACK_BOT_TOKEN not configured')
    }

    console.log(`Fetching context for message ${message_ts} in channel ${channel_id}`)

    // Fetch messages BEFORE the target (older messages)
    const beforeResponse = await fetch(
      `https://slack.com/api/conversations.history?` +
      `channel=${channel_id}&latest=${message_ts}&limit=${before_count}&inclusive=false`,
      {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const beforeData: SlackHistoryResponse = await beforeResponse.json()

    if (!beforeData.ok) {
      console.error('Slack API error (before):', beforeData.error)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Slack API error: ${beforeData.error}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Fetch messages AFTER the target (newer messages)
    const afterResponse = await fetch(
      `https://slack.com/api/conversations.history?` +
      `channel=${channel_id}&oldest=${message_ts}&limit=${after_count + 1}&inclusive=true`,
      {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const afterData: SlackHistoryResponse = await afterResponse.json()

    if (!afterData.ok) {
      console.error('Slack API error (after):', afterData.error)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Slack API error: ${afterData.error}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Combine all messages (excluding the target message from after results)
    const beforeMessages = beforeData.messages || []
    const afterMessages = (afterData.messages || []).filter(m => m.ts !== message_ts)
    const allMessages = [...beforeMessages, ...afterMessages]

    let storedCount = 0
    let skippedCount = 0

    // Store any new messages
    for (const message of allMessages) {
      // Check if we already have this message
      const { data: existing } = await supabase
        .from('slack_events')
        .select('id')
        .eq('message_ts', message.ts)
        .eq('channel_id', channel_id)
        .maybeSingle()

      if (existing) {
        skippedCount++
        continue
      }

      // Store the new message
      const { error: insertError } = await supabase.from('slack_events').insert({
        event_id: `fetched_context_${message.ts}_${Date.now()}`,
        event_type: 'message',
        channel_id: channel_id,
        user_id: message.user || 'unknown',
        message_text: message.text || '',
        message_ts: message.ts,
        thread_ts: message.thread_ts,
        raw_payload: {
          type: 'event_callback',
          event: message
        },
      })

      if (insertError) {
        console.error('Error storing message:', insertError)
      } else {
        storedCount++
      }
    }

    console.log(`Stored ${storedCount} new messages, skipped ${skippedCount} existing messages`)

    // Fetch messages from database for consistent response format
    const targetTimestamp = parseFloat(message_ts)

    const { data: beforeMessagesDb } = await supabase
      .from('slack_events')
      .select('*')
      .eq('channel_id', channel_id)
      .lt('message_ts', message_ts)
      .order('message_ts', { ascending: false })
      .limit(before_count)

    const { data: afterMessagesDb } = await supabase
      .from('slack_events')
      .select('*')
      .eq('channel_id', channel_id)
      .gt('message_ts', message_ts)
      .order('message_ts', { ascending: true })
      .limit(after_count)

    return new Response(
      JSON.stringify({
        success: true,
        before: (beforeMessagesDb || []).reverse(), // Reverse to get chronological order
        after: afterMessagesDb || [],
        stored_count: storedCount,
        skipped_count: skippedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error('Error fetching channel context:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})
