export type MessageType = 'support_question' | 'bug_report' | 'feature_request' | 'general_question'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type UserRole = 'fde' | 'customer'

export interface User {
  id: string
  email: string
  username: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  user_id: string
  user_name: string
  content: string
  channel: string
  channel_name?: string
  thread_ts?: string
  message_ts: string
  message_type?: MessageType
  ticket_id?: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  title: string
  description?: string
  status: TicketStatus
  priority: TicketPriority
  message_type: MessageType
  message_count: number
  first_message_id: string
  last_message_id: string
  assigned_to?: string
  channel: string
  channel_name?: string
  thread_ts?: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

export interface TicketWithMessages extends Ticket {
  messages: Message[]
}

// For displaying ticket cards in the UI
export interface TicketSummary {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  message_type: MessageType
  message_count: number
  channel_name?: string
  last_updated: string
}

// Statistics for dashboard
export interface DashboardStats {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  resolved_today: number
  avg_response_time: number
}
