import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface ProcessRequest {
  bug_ids: string[]  // Array to support batch processing
}

interface ProcessResult {
  bug_id: string
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
    const { bug_ids }: ProcessRequest = await req.json()

    if (!bug_ids || bug_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'bug_ids array required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8000'
    const results: ProcessResult[] = []

    console.log(`Processing ${bug_ids.length} bug(s) via backend: ${backendUrl}`)

    // Process each bug
    for (const bug_id of bug_ids) {
      try {
        const response = await fetch(`${backendUrl}/process-bug`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bug_id }),
        })

        if (response.ok) {
          const result = await response.json()
          results.push({ bug_id, success: true, result })
          console.log(`✅ Successfully processed bug ${bug_id}`)
        } else {
          const error = await response.text()
          results.push({ bug_id, success: false, error })
          console.error(`❌ Failed to process bug ${bug_id}: ${error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.push({ bug_id, success: false, error: errorMsg })
        console.error(`❌ Error processing bug ${bug_id}:`, errorMsg)
      }
    }

    // Return overall success if at least one bug processed successfully
    const successCount = results.filter(r => r.success).length
    const overallSuccess = successCount > 0

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        processed: successCount,
        total: bug_ids.length,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error('Error processing bugs:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
