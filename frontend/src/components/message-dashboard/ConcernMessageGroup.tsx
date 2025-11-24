import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageItem } from './MessageItem'
import { ChevronDown, ChevronRight, Bug, MessageSquare, Clock } from 'lucide-react'
import type { ConcernWithMessages } from '@/hooks/useConcernsWithMessages'
import type { ConcernCategory } from '@/types'

interface ConcernMessageGroupProps {
  concern: ConcernWithMessages
}

function getCategoryBadgeVariant(category: ConcernCategory): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (category) {
    case 'bug_report':
      return 'destructive'
    case 'feature_request':
      return 'secondary'
    case 'support_question':
      return 'default'
    case 'general_question':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ')
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Component to display a concern (ticket) with its grouped messages
 * Shows category, bug count, and collapsible message list
 */
export function ConcernMessageGroup({ concern }: ConcernMessageGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Card className="overflow-hidden">
      {/* Concern Header */}
      <div className="border-b bg-accent/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-6 w-6"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <h3 className="font-semibold text-lg">{concern.title}</h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap ml-8">
              {/* Category Badge */}
              <Badge variant={getCategoryBadgeVariant(concern.category)}>
                {formatCategory(concern.category)}
              </Badge>

              {/* Bug Count */}
              <div className="flex items-center gap-1 text-sm">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="font-medium">{concern.bug_count}</span>
                <span className="text-muted-foreground">
                  bug{concern.bug_count === 1 ? '' : 's'}
                </span>
              </div>

              {/* Message Count */}
              <div className="flex items-center gap-1 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{concern.message_count}</span>
                <span className="text-muted-foreground">
                  message{concern.message_count === 1 ? '' : 's'}
                </span>
              </div>

              {/* Last Updated */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated {formatRelativeTime(concern.last_updated)}</span>
              </div>

              {/* Priority Badge */}
              {concern.priority && (
                <Badge variant="outline" className="text-xs capitalize">
                  {concern.priority}
                </Badge>
              )}

              {/* Grouping Method */}
              <Badge variant="outline" className="text-xs">
                {concern.grouping_method.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {concern.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages in this concern
            </p>
          ) : (
            concern.messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
        </div>
      )}
    </Card>
  )
}
