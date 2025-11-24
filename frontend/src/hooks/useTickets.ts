import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ticket, TicketWithMessages } from '@/types'

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTickets() {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) throw error
        setTickets(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { tickets, loading, error }
}

export function useTicket(ticketId: string) {
  const [ticket, setTicket] = useState<TicketWithMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTicket() {
      try {
        // Fetch ticket
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single()

        if (ticketError) throw ticketError

        // Fetch messages for this ticket
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })

        if (messagesError) throw messagesError

        setTicket({
          ...ticketData,
          messages: messagesData || [],
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ticket')
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId])

  return { ticket, loading, error }
}
