import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { BugEvent } from '@/types'

export function useBugs() {
  const [bugs, setBugs] = useState<BugEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBugs() {
      try {
        const { data, error } = await supabase
          .from('bug_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setBugs(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bugs')
      } finally {
        setLoading(false)
      }
    }

    fetchBugs()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('bug-events-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bug_events' }, (payload) => {
        const newBug = payload.new as BugEvent
        setBugs((prev) => [newBug, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { bugs, loading, error }
}
