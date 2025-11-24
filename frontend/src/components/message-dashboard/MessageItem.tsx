import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageContextModal } from './MessageContextModal'
import { User, Hash, Clock, MessageSquare, Eye, TrendingUp } from 'lucide-react'
import type { MessageWithGrouping } from '@/hooks/useConcernsWithMessages'

interface MessageItemProps {
  message: MessageWithGrouping
}

/**
 * Component to display a single message within a concern group
 * Shows thread indicators, message content, and "View Context" button
 */
export function MessageItem({ message }: MessageItemProps) {
  const [showContextModal, setShowContextModal] = useState(false)

  // Determine if this is a thread parent
  const isThreadParent = message.thread_ts && message.message_ts === message.thread_ts

  // Determine if this message is in a thread
  const isInThread = Boolean(message.thread_ts)

  // Apply bold styling for thread parents
  // Note: We bold thread parents. We could also bold messages that share a thread with
  // other messages in the same concern, but that would require passing down all concern
  // messages as context, which we can add later if needed
  const shouldBeBold = isThreadParent

  return (
    <>
      <Card className="p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />

          <div className="flex-1 min-w-0 space-y-2">
            {/* Message Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${shouldBeBold ? 'font-bold' : 'font-semibold'}`}>
                {message.user_name}
              </span>

              {/* Channel Badge */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>{message.channel}</span>
              </div>

              {/* Thread Indicator */}
              {isInThread && (
                <Badge variant={isThreadParent ? 'default' : 'outline'} className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {isThreadParent ? 'Thread Parent' : 'In Thread'}
                </Badge>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(message.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Message Content */}
            <p className={`text-sm whitespace-pre-wrap break-words ${shouldBeBold ? 'font-bold' : ''}`}>
              {message.content}
            </p>

            {/* Message Metadata & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Similarity Score */}
              {message.similarity_score !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Similarity: {(message.similarity_score * 100).toFixed(1)}%</span>
                </div>
              )}

              {/* Confidence Badge */}
              <Badge
                variant={
                  message.confidence === 'high'
                    ? 'default'
                    : message.confidence === 'medium'
                    ? 'secondary'
                    : 'outline'
                }
                className="text-xs"
              >
                {message.confidence} confidence
              </Badge>

              {/* Grouping Method */}
              <Badge variant="outline" className="text-xs">
                {message.grouping_method.replace(/_/g, ' ')}
              </Badge>

              {/* View Context Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextModal(true)}
                className="ml-auto"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Context
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Context Modal */}
      {showContextModal && (
        <MessageContextModal
          message={message}
          onClose={() => setShowContextModal(false)}
        />
      )}
    </>
  )
}
