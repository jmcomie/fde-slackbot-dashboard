import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ThreadRequest {
  thread_ts: string
  channel_id: string
}

interface SlackMessage {
  type: string
  user?: string
  text?: string
  ts: string
  thread_ts?: string
  parent_user_id?: string
  reply_count?: number
  reply_users?: string[]
  reply_users_count?: number
  latest_reply?: string
  [key: string]: any
}

interface SlackRepliesResponse {
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
    const { thread_ts, channel_id }: ThreadRequest = await req.json()

    // Validate input
    if (!thread_ts || !channel_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'thread_ts and channel_id are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Fetch thread from Slack API
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN')
    if (!slackToken) {
      throw new Error('SLACK_BOT_TOKEN not configured')
    }

    console.log(`Fetching thread: ${thread_ts} from channel: ${channel_id}`)

    const slackResponse = await fetch(
      `https://slack.com/api/conversations.replies?channel=${channel_id}&ts=${thread_ts}&limit=200`,
      {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const slackData: SlackRepliesResponse = await slackResponse.json()

    if (!slackData.ok) {
      console.error('Slack API error:', slackData.error)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Slack API error: ${slackData.error}`
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

    // Store any new messages we don't have yet
    const messages = slackData.messages || []
    let storedCount = 0
    let skippedCount = 0

    for (const message of messages) {
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
        event_id: `fetched_thread_${message.ts}_${Date.now()}`,
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

    // Fetch the complete thread from database
    const { data: threadMessages, error: fetchError } = await supabase
      .from('slack_events')
      .select('*')
      .eq('thread_ts', thread_ts)
      .order('message_ts', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages: threadMessages,
        message_count: threadMessages?.length || 0,
        stored_count: storedCount,
        skipped_count: skippedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error('Error fetching thread:', error)
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
