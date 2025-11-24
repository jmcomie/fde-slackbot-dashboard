import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Concern } from '@/types'

/**
 * Simplified concern type for dropdown display
 */
export interface AvailableConcern {
  id: string
  title: string
  category: string
  message_count: number
  bug_count: number
}

/**
 * Hook to fetch all available concerns for the move dropdown.
 * Excludes the current concern and closed concerns from the list.
 */
export function useAvailableConcerns(excludeConcernId?: string) {
  const [concerns, setConcerns] = useState<AvailableConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConcerns() {
      try {
        let query = supabase
          .from('concern')
          .select('id, title, category, message_count, bug_count, status')
          .neq('status', 'closed')
          .order('last_updated', { ascending: false })

        // Exclude current concern if provided
        if (excludeConcernId) {
          query = query.neq('id', excludeConcernId)
        }

        const { data, error } = await query

        if (error) throw error

        setConcerns(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch concerns')
        console.error('Error fetching available concerns:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConcerns()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('available_concerns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'concern',
        },
        (payload) => {
          console.log('Available concern change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newConcern = payload.new as Concern
            // Only add if not the excluded concern and not closed
            if (newConcern.id !== excludeConcernId && newConcern.status !== 'closed') {
              setConcerns((prev) => [
                {
                  id: newConcern.id,
                  title: newConcern.title,
                  category: newConcern.category,
                  message_count: newConcern.message_count,
                  bug_count: newConcern.bug_count,
                },
                ...prev,
              ])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedConcern = payload.new as Concern
            // If concern was updated to 'closed', remove it from the list
            if (updatedConcern.status === 'closed') {
              setConcerns((prev) =>
                prev.filter((concern) => concern.id !== updatedConcern.id)
              )
            } else {
              // Otherwise update it in the list
              setConcerns((prev) =>
                prev.map((concern) =>
                  concern.id === updatedConcern.id
                    ? {
                        id: updatedConcern.id,
                        title: updatedConcern.title,
                        category: updatedConcern.category,
                        message_count: updatedConcern.message_count,
                        bug_count: updatedConcern.bug_count,
                      }
                    : concern
                )
              )
            }
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
  }, [excludeConcernId])

  return { concerns, loading, error }
}
