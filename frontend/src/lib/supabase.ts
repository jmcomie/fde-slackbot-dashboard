import { createClient } from '@supabase/supabase-js'

/**
 * Environment-aware Supabase client
 *
 * Set VITE_SUPABASE_ENV to 'local' to use local Supabase (http://localhost:54321)
 * Set VITE_SUPABASE_ENV to 'production' (or leave unset) to use production Supabase
 *
 * Local development: Run `supabase start` first, then set VITE_SUPABASE_ENV=local
 * Production: Use your production Supabase URL and publishable key
 */

const isLocal = import.meta.env.VITE_SUPABASE_ENV === 'local'

const supabaseUrl = isLocal
  ? import.meta.env.VITE_SUPABASE_LOCAL_URL || 'http://localhost:54321'
  : import.meta.env.VITE_SUPABASE_URL

const supabasePublishableKey = isLocal
  ? import.meta.env.VITE_SUPABASE_LOCAL_PUBLISHABLE_KEY ||
    // Default local publishable key from Supabase CLI (safe to hardcode for localhost)
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Log which environment we're using (helpful for debugging)
if (import.meta.env.DEV) {
  console.log(`[Supabase] Using ${isLocal ? 'LOCAL' : 'PRODUCTION'} environment`)
  console.log(`[Supabase] URL: ${supabaseUrl}`)
}

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase environment variables are not set. Some features may not work.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    auth: {
      // Persist auth session in localStorage
      persistSession: true,
      // Auto-refresh session
      autoRefreshToken: true,
      // Detect session from URL (for OAuth flows)
      detectSessionInUrl: true,
    },
    // Enable realtime for local and production
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Export helper to check current environment
export const getSupabaseEnv = () => ({
  isLocal,
  url: supabaseUrl,
  mode: isLocal ? 'local' : 'production',
})
