import { useEffect } from 'react'
import { useChannelContext } from '@/hooks/useChannelContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Loader2, AlertCircle, User, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react'
import type { MessageWithGrouping } from '@/hooks/useConcernsWithMessages'
import type { Message } from '@/types'

interface MessageContextModalProps {
  message: MessageWithGrouping
  onClose: () => void
}

/**
 * Modal to display channel context around a message
 * Shows 5 messages before and 5 messages after the target message
 */
export function MessageContextModal({ message, onClose }: MessageContextModalProps) {
  const { context, loading, error, fetchChannelContext } = useChannelContext(
    message.message_ts,
    message.channel,
    5, // beforeCount
    5  // afterCount
  )

  // Fetch context when modal opens
  useEffect(() => {
    fetchChannelContext()
  }, [message.message_ts, message.channel])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Helper to determine if a message should be bolded
  const shouldBeBold = (msg: Message | MessageWithGrouping) => {
    // Bold if it's the target message (always a concern message)
    if (msg.id === message.id) return true

    // Bold if it's a thread parent
    return msg.thread_ts && msg.message_ts === msg.thread_ts
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-background rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Message Context</h2>
              <p className="text-sm text-muted-foreground">
                Viewing messages before and after in #{message.channel}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading context...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <span className="ml-2 text-destructive">Error: {error}</span>
              </div>
            ) : context ? (
              <div className="space-y-4">
                {/* Messages Before */}
                {context.before.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground sticky top-0 bg-background py-2">
                      <ChevronUp className="h-4 w-4" />
                      <span className="font-medium">
                        {context.before.length} message{context.before.length === 1 ? '' : 's'} before
                      </span>
                    </div>
                    {context.before.map((msg) => (
                      <Card key={msg.id} className="p-3 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-sm ${shouldBeBold(msg) ? 'font-bold' : 'font-semibold'}`}>
                                {msg.user_name}
                              </span>
                              {msg.thread_ts && msg.message_ts === msg.thread_ts && (
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Thread Parent
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap break-words ${shouldBeBold(msg) ? 'font-bold' : ''}`}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Target Message (Highlighted) */}
                <div className="my-4">
                  <div className="text-center text-sm font-medium text-primary mb-2 border-t border-b border-primary py-2">
                    ⬇ Target Message (Concern/Ticket) ⬇
                  </div>
                  <Card className="p-4 bg-primary/10 border-primary border-2">
                    <div className="flex items-start gap-2">
                      <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-bold">
                            {message.user_name}
                          </span>
                          {message.thread_ts && message.message_ts === message.thread_ts && (
                            <Badge variant="default" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Thread Parent
                            </Badge>
                          )}
                          {message.thread_ts && message.message_ts !== message.thread_ts && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              In Thread
                            </Badge>
                          )}
                          <Badge variant="default" className="text-xs">
                            Concern Message
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words font-bold">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Messages After */}
                {context.after.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronDown className="h-4 w-4" />
                      <span className="font-medium">
                        {context.after.length} message{context.after.length === 1 ? '' : 's'} after
                      </span>
                    </div>
                    {context.after.map((msg) => (
                      <Card key={msg.id} className="p-3 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-sm ${shouldBeBold(msg) ? 'font-bold' : 'font-semibold'}`}>
                                {msg.user_name}
                              </span>
                              {msg.thread_ts && msg.message_ts === msg.thread_ts && (
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Thread Parent
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap break-words ${shouldBeBold(msg) ? 'font-bold' : ''}`}>
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {context.before.length === 0 && context.after.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No surrounding messages found in this channel
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="border-t p-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
