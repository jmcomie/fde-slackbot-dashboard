import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types'

interface SlackEvent {
  id: string
  event_id: string
  event_type: string
  channel_id: string
  user_id: string
  message_text: string
  message_ts: string
  thread_ts: string | null
  parent_user_id: string | null
  reply_count: number | null
  is_parent: boolean
  raw_payload: any
  created_at: string
}

interface ThreadContext {
  parentMessage: Message | null
  replies: Message[]
  totalReplies: number
}

/**
 * Hook to fetch and manage thread context (parent message + replies)
 *
 * Queries slack_events table directly using indexed thread_ts column.
 * Assumes comprehensive message ingestion - all thread messages are in the database.
 *
 * @param threadTs - The thread timestamp (identifies the thread)
 * @param channelId - The channel ID where the thread exists
 * @returns Thread context data, loading state, error, and fetch function
 */
export function useThreadContext(threadTs: string | undefined, channelId: string | undefined) {
  const [context, setContext] = useState<ThreadContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapSlackEventToMessage = (event: SlackEvent): Message => {
    return {
      id: event.id,
      user_id: event.user_id,
      user_name: event.user_id, // Will be enhanced later with actual user names
      content: event.message_text,
      channel: event.channel_id,
      thread_ts: event.thread_ts || undefined,
      message_ts: event.message_ts,
      created_at: event.created_at,
      updated_at: event.created_at,
    }
  }

  const fetchThreadContext = async () => {
    if (!threadTs || !channelId) {
      setError('thread_ts and channel_id are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query all messages in thread directly from database
      // Uses idx_slack_events_thread_ts index for optimal performance
      const { data: messages, error: queryError } = await supabase
        .from('slack_events')
        .select('*')
        .eq('thread_ts', threadTs)
        .eq('channel_id', channelId)
        .order('message_ts', { ascending: true })

      if (queryError) {
        throw queryError
      }

      if (!messages || messages.length === 0) {
        setContext({
          parentMessage: null,
          replies: [],
          totalReplies: 0,
        })
        setLoading(false)
        return
      }

      // Separate parent (message_ts === thread_ts) from replies
      const parent = messages.find(m => m.message_ts === m.thread_ts)
      const replies = messages.filter(m => m.message_ts !== m.thread_ts)

      setContext({
        parentMessage: parent ? mapSlackEventToMessage(parent) : null,
        replies: replies.map(mapSlackEventToMessage),
        totalReplies: replies.length,
      })

    } catch (err) {
      console.error('Error fetching thread context:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch thread context')
    } finally {
      setLoading(false)
    }
  }

  return { context, loading, error, fetchThreadContext }
}
