import { useEffect, useState } from 'react'
import { useThreadContext } from '@/hooks/useThreadContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, User, Loader2, AlertCircle } from 'lucide-react'

interface ThreadViewProps {
  threadTs: string
  channelId: string
  autoLoad?: boolean
}

/**
 * Component to display a thread with parent message and replies
 * Supports lazy loading (click to expand) or auto-loading
 */
export function ThreadView({ threadTs, channelId, autoLoad = false }: ThreadViewProps) {
  const { context, loading, error, fetchThreadContext } = useThreadContext(threadTs, channelId)
  const [isExpanded, setIsExpanded] = useState(autoLoad)

  useEffect(() => {
    if (autoLoad) {
      fetchThreadContext()
    }
  }, [threadTs, channelId, autoLoad])

  const handleToggle = () => {
    if (!context && !loading) {
      fetchThreadContext()
    }
    setIsExpanded(!isExpanded)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="ml-8 mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading thread...
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="ml-8 mt-2 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Error: {error}
      </div>
    )
  }

  // Show collapsed state with button to expand
  if (!isExpanded || !context) {
    const replyCount = context?.totalReplies ?? 0
    return (
      <button
        onClick={handleToggle}
        className="ml-8 mt-2 text-sm text-primary hover:underline flex items-center gap-1"
      >
        <MessageSquare className="h-4 w-4" />
        {replyCount > 0 ? `View thread (${replyCount} ${replyCount === 1 ? 'reply' : 'replies'})` : 'View thread'}
      </button>
    )
  }

  // Show expanded thread view
  return (
    <div className="ml-8 mt-2 space-y-2">
      <button
        onClick={handleToggle}
        className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"
      >
        <MessageSquare className="h-4 w-4" />
        Hide thread ({context.totalReplies} {context.totalReplies === 1 ? 'reply' : 'replies'})
      </button>

      <div className="border-l-2 border-primary/20 pl-4 space-y-2">
        {/* Parent message */}
        {context.parentMessage && (
          <Card className="p-3 bg-accent/30">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">
                    {context.parentMessage.user_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Parent
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(context.parentMessage.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {context.parentMessage.content}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Thread replies */}
        {context.replies.map((reply) => (
          <Card key={reply.id} className="p-3 bg-background">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">
                    {reply.user_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reply.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {reply.content}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Empty state */}
        {context.replies.length === 0 && context.parentMessage && (
          <p className="text-sm text-muted-foreground italic">
            No replies yet
          </p>
        )}
      </div>
    </div>
  )
}
