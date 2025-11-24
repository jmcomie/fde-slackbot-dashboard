import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types'

// Interface for slack_events table
interface SlackEvent {
  id: string
  event_id: string
  event_type: string | null
  team_id: string | null
  api_app_id: string | null
  channel_id: string | null
  user_id: string | null
  user_name: string | null
  channel_name: string | null
  message_text: string | null
  message_ts: string | null
  thread_ts: string | null
  raw_payload: any
  created_at: string
}

// Map slack_events to Message format
function mapSlackEventToMessage(event: SlackEvent): Message {
  return {
    id: event.id,
    user_id: event.user_id || 'unknown',
    user_name: event.user_name || undefined,
    content: event.message_text || '',
    channel: event.channel_id || 'unknown',
    channel_name: event.channel_name || undefined,
    thread_ts: event.thread_ts || undefined,
    message_ts: event.message_ts || '',
    message_type: undefined, // Will be classified by edge function later
    ticket_id: undefined,
    created_at: event.created_at,
    updated_at: event.created_at,
  }
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('slack_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        const mappedMessages = (data || []).map(mapSlackEventToMessage)
        setMessages(mappedMessages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('slack-events-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'slack_events' }, (payload) => {
        const newMessage = mapSlackEventToMessage(payload.new as SlackEvent)
        setMessages((prev) => [newMessage, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { messages, loading, error }
}
