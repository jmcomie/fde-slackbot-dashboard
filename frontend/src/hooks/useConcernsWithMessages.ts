import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Concern, ConcernCategory, ConcernStatus, ConcernGroup, Message } from '@/types'

// Interface for slack_events table
interface SlackEvent {
  id: string
  event_id: string
  event_type: string | null
  team_id: string | null
  api_app_id: string | null
  channel_id: string | null
  user_id: string | null
  message_text: string | null
  message_ts: string | null
  thread_ts: string | null
  parent_user_id: string | null
  reply_count: number | null
  is_parent: boolean | null
  raw_payload: any
  created_at: string
}

// Extended message type with grouping metadata
export interface MessageWithGrouping extends Message {
  similarity_score?: number
  grouping_method: string
  confidence: string
  grouped_at: string
}

// Concern with its messages and grouping metadata
export interface ConcernWithMessages extends Concern {
  messages: MessageWithGrouping[]
}

// Map slack_events to Message format
function mapSlackEventToMessage(
  event: SlackEvent,
  grouping: ConcernGroup
): MessageWithGrouping {
  return {
    id: event.id,
    user_id: event.user_id || 'unknown',
    user_name: event.user_id || 'Unknown User',
    content: event.message_text || '',
    channel: event.channel_id || 'unknown',
    channel_name: undefined,
    thread_ts: event.thread_ts || undefined,
    message_ts: event.message_ts || '',
    message_type: undefined,
    ticket_id: undefined,
    created_at: event.created_at,
    updated_at: event.created_at,
    similarity_score: grouping.similarity_score,
    grouping_method: grouping.grouping_method,
    confidence: grouping.confidence,
    grouped_at: grouping.grouped_at,
  }
}

/**
 * Hook to fetch concerns with their associated messages
 * Queries concern, concern_group, and slack_events tables
 */
export function useConcernsWithMessages(
  category?: ConcernCategory,
  status?: ConcernStatus
) {
  const [concernsWithMessages, setConcernsWithMessages] = useState<ConcernWithMessages[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConcernsWithMessages() {
      try {
        // Step 1: Fetch concerns with filters
        let concernQuery = supabase
          .from('concern')
          .select('*')
          .order('last_updated', { ascending: false })

        if (status) {
          concernQuery = concernQuery.eq('status', status)
        }
        if (category) {
          concernQuery = concernQuery.eq('category', category)
        }

        const { data: concerns, error: concernError } = await concernQuery

        if (concernError) throw concernError

        // Step 2: For each concern, fetch its messages through concern_group
        const concernsWithMessagesData = await Promise.all(
          (concerns || []).map(async (concern) => {
            // Fetch concern_group entries for this concern
            const { data: groupings, error: groupError } = await supabase
              .from('concern_group')
              .select('*')
              .eq('concern_id', concern.id)
              .eq('foreign_table', 'slack_event')

            if (groupError) {
              console.error('Error fetching concern groups:', groupError)
              return { ...concern, messages: [] }
            }

            // Fetch messages for these groupings
            const messageIds = groupings?.map((g) => g.foreign_identifier) || []

            if (messageIds.length === 0) {
              return { ...concern, messages: [] }
            }

            const { data: slackEvents, error: messageError } = await supabase
              .from('slack_events')
              .select('*')
              .in('id', messageIds)
              .order('created_at', { ascending: true })

            if (messageError) {
              console.error('Error fetching slack events:', messageError)
              return { ...concern, messages: [] }
            }

            // Map messages with grouping metadata
            const messages = (slackEvents || []).map((event: SlackEvent) => {
              const grouping = groupings?.find((g) => g.foreign_identifier === event.id)
              return mapSlackEventToMessage(event, grouping!)
            })

            return {
              ...concern,
              messages,
            } as ConcernWithMessages
          })
        )

        setConcernsWithMessages(concernsWithMessagesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch concerns with messages')
        console.error('Error fetching concerns with messages:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConcernsWithMessages()

    // Subscribe to real-time updates for concerns
    const concernChannel = supabase
      .channel('concerns_with_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'concern',
        },
        (payload) => {
          console.log('Concern change received:', payload)
          // Refetch all data on any concern change
          // This ensures we stay in sync, though could be optimized
          fetchConcernsWithMessages()
        }
      )
      .subscribe()

    // Subscribe to concern_group changes
    const groupChannel = supabase
      .channel('concern_group_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'concern_group',
        },
        (payload) => {
          console.log('Concern group change received:', payload)
          // Refetch on any grouping change
          fetchConcernsWithMessages()
        }
      )
      .subscribe()

    return () => {
      concernChannel.unsubscribe()
      groupChannel.unsubscribe()
    }
  }, [category, status])

  return { concernsWithMessages, loading, error }
}
