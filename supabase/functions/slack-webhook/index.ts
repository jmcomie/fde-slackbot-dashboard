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
    // TODO: Extract message data from payload
    // TODO: Use OpenAI to classify message type (support_question, bug_report, feature_request, general_question)
    // TODO: Group related messages into tickets
    // TODO: Store message and ticket in Supabase database

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseSecretKey = Deno.env.get('SUPABASE_SECRET_KEY')!
    const supabase = createClient(supabaseUrl, supabaseSecretKey)

    // Example: Store message in database
    // const { data, error } = await supabase
    //   .from('messages')
    //   .insert({
    //     user_id: payload.event.user,
    //     content: payload.event.text,
    //     channel: payload.event.channel,
    //     message_ts: payload.event.ts,
    //     thread_ts: payload.event.thread_ts,
    //   })

    return new Response(
      JSON.stringify({
        success: true,
        message: "Slack message received and queued for processing",
        id: crypto.randomUUID()
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
