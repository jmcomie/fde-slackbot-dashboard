import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface ProcessRequest {
  message_ids: string[]  // Array to support batch processing
}

interface ProcessResult {
  message_id: string
  success: boolean
  result?: any
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message_ids }: ProcessRequest = await req.json()

    if (!message_ids || message_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'message_ids array required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8000'
    const results: ProcessResult[] = []

    console.log(`Processing ${message_ids.length} message(s) via backend: ${backendUrl}`)

    // Process each message
    for (const message_id of message_ids) {
      try {
        const response = await fetch(`${backendUrl}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id }),
        })

        if (response.ok) {
          const result = await response.json()
          results.push({ message_id, success: true, result })
          console.log(`✅ Successfully processed message ${message_id}`)
        } else {
          const error = await response.text()
          results.push({ message_id, success: false, error })
          console.error(`❌ Failed to process message ${message_id}: ${error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.push({ message_id, success: false, error: errorMsg })
        console.error(`❌ Error processing message ${message_id}:`, errorMsg)
      }
    }

    // Return overall success if at least one message processed successfully
    const successCount = results.filter(r => r.success).length
    const overallSuccess = successCount > 0

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        processed: successCount,
        total: message_ids.length,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error('Error processing messages:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
