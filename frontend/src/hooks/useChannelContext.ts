import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types'

interface SlackEvent {
  id: string
  event_id: string
  event_type: string
  channel_id: string
  user_id: string
  user_name: string | null
  channel_name: string | null
  message_text: string
  message_ts: string
  thread_ts: string | null
  raw_payload: any
  created_at: string
}

interface ChannelContext {
  before: Message[]
  after: Message[]
}

/**
 * Hook to fetch and manage channel context (messages before and after a target message)
 *
 * Queries slack_events table directly using composite (channel_id, message_ts) index.
 * Assumes comprehensive message ingestion - all channel messages are in the database.
 *
 * @param messageTs - The target message timestamp
 * @param channelId - The channel ID
 * @param beforeCount - Number of messages to fetch before the target (default: 5)
 * @param afterCount - Number of messages to fetch after the target (default: 5)
 * @returns Channel context data, loading state, error, and fetch function
 */
export function useChannelContext(
  messageTs: string | undefined,
  channelId: string | undefined,
  beforeCount: number = 5,
  afterCount: number = 5
) {
  const [context, setContext] = useState<ChannelContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapSlackEventToMessage = (event: SlackEvent): Message => {
    return {
      id: event.id,
      user_id: event.user_id,
      user_name: event.user_name || undefined,
      content: event.message_text,
      channel: event.channel_id,
      channel_name: event.channel_name || undefined,
      thread_ts: event.thread_ts || undefined,
      message_ts: event.message_ts,
      created_at: event.created_at,
      updated_at: event.created_at,
    }
  }

  const fetchChannelContext = async () => {
    if (!messageTs || !channelId) {
      setError('message_ts and channel_id are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query messages before target timestamp
      // Uses idx_slack_events_channel_time composite index for optimal performance
      const { data: beforeMessages, error: beforeError } = await supabase
        .from('slack_events')
        .select('*')
        .eq('channel_id', channelId)
        .lt('message_ts', messageTs)
        .order('message_ts', { ascending: false })
        .limit(beforeCount)

      // Query messages after target timestamp
      const { data: afterMessages, error: afterError } = await supabase
        .from('slack_events')
        .select('*')
        .eq('channel_id', channelId)
        .gt('message_ts', messageTs)
        .order('message_ts', { ascending: true })
        .limit(afterCount)

      if (beforeError || afterError) {
        throw beforeError || afterError
      }

      // Reverse 'before' messages to get chronological order
      setContext({
        before: (beforeMessages || []).reverse().map(mapSlackEventToMessage),
        after: (afterMessages || []).map(mapSlackEventToMessage),
      })

    } catch (err) {
      console.error('Error fetching channel context:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch channel context')
    } finally {
      setLoading(false)
    }
  }

  return { context, loading, error, fetchChannelContext }
}
