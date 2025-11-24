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

export interface BugEvent {
  id: string
  title: string
  description: string
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

// ========== Concern Grouping Types ==========

export type ConcernCategory = 'bug_report' | 'feature_request' | 'support_question' | 'general_question'
export type ConcernStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type ConcernPriority = 'high' | 'medium' | 'low'
export type GroupingMethod =
  | 'new_concern'
  | 'thread_match'
  | 'cosine_high_conf'
  | 'cosine_medium_conf'
  | 'low_similarity'
  | 'exact_duplicate'
  | 'manual'
  | 'initial'
export type Confidence = 'high' | 'medium' | 'low'

// Represents a conceptual issue grouping related messages and bugs
export interface Concern {
  id: string
  category: ConcernCategory
  centroid_embedding: number[]
  title: string
  summary?: string
  message_count: number
  bug_count: number
  status: ConcernStatus
  priority?: ConcernPriority
  first_seen: string
  last_updated: string
  grouping_method: GroupingMethod
  created_at: string
}

// Maps messages to concerns (polymorphic join table)
export interface ConcernGroup {
  id: string
  concern_id: string
  foreign_table: string
  foreign_identifier: string
  similarity_score?: number
  grouping_method: GroupingMethod
  confidence: Confidence
  grouped_at: string
}

// Concern with its related messages (for detail view)
export interface ConcernWithMessages extends Concern {
  messages: Message[]
}

// For displaying concern cards in the UI
export interface ConcernSummary {
  id: string
  title: string
  category: ConcernCategory
  status: ConcernStatus
  message_count: number
  first_seen: string
  last_updated: string
}

// ========== Settings Types ==========

export type ClassificationMethod = 'embedding' | 'llm'

// Application-wide settings
export interface Settings {
  id: string
  bot_name?: string | null
  classification_method: ClassificationMethod
  llm_model: string
  grouping_model: string
  created_at: string
  updated_at: string
}
