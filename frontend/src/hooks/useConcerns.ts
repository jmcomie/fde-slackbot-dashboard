import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Concern, ConcernCategory, ConcernStatus } from '@/types'

/**
 * Hook to fetch and subscribe to concerns from Supabase.
 *
 * Queries the `concern` table directly with optional filtering.
 */
export function useConcerns(
  category?: ConcernCategory,
  status: ConcernStatus = 'open'
) {
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConcerns() {
      try {
        let query = supabase
          .from('concern')
          .select('*')
          .order('last_updated', { ascending: false })

        // Apply filters if provided
        if (status) {
          query = query.eq('status', status)
        }
        if (category) {
          query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) throw error

        setConcerns(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch concerns')
        console.error('Error fetching concerns:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConcerns()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('concerns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'concern',
        },
        (payload) => {
          console.log('Concern change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newConcern = payload.new as Concern
            // Check if it matches our filters
            if (
              (!status || newConcern.status === status) &&
              (!category || newConcern.category === category)
            ) {
              setConcerns((prev) => [newConcern, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setConcerns((prev) =>
              prev.map((concern) =>
                concern.id === payload.new.id ? (payload.new as Concern) : concern
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setConcerns((prev) =>
              prev.filter((concern) => concern.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [category, status])

  return { concerns, loading, error }
}
