import { useState } from 'react'
import { useChannelContext } from '@/hooks/useChannelContext'
import { Card } from '@/components/ui/card'
import { ChevronUp, ChevronDown, Loader2, AlertCircle } from 'lucide-react'

interface ChannelContextViewProps {
  messageTs: string
  channelId: string
  beforeCount?: number
  afterCount?: number
}

/**
 * Component to display channel context (messages before and after a target message)
 * Uses lazy loading - context is fetched when user clicks to expand
 */
export function ChannelContextView({
  messageTs,
  channelId,
  beforeCount = 5,
  afterCount = 5
}: ChannelContextViewProps) {
  const { context, loading, error, fetchChannelContext } = useChannelContext(
    messageTs,
    channelId,
    beforeCount,
    afterCount
  )
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = () => {
    if (!context && !loading) {
      fetchChannelContext()
    }
    setIsExpanded(!isExpanded)
  }

  // Show loading state
  if (loading && !context) {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading channel context...
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Error: {error}
      </div>
    )
  }

  // Show collapsed state with button to expand
  if (!isExpanded || !context) {
    return (
      <button
        onClick={handleToggle}
        className="text-xs text-muted-foreground hover:text-primary mt-2"
      >
        Show channel context
      </button>
    )
  }

  // Show expanded context view
  return (
    <div className="mt-2 space-y-2">
      <button
        onClick={handleToggle}
        className="text-xs text-muted-foreground hover:text-primary"
      >
        Hide channel context
      </button>

      <div className="space-y-2">
        {/* Messages before */}
        {context.before.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
              <span>{context.before.length} message{context.before.length === 1 ? '' : 's'} before</span>
            </div>
            {context.before.map((msg) => (
              <Card key={msg.id} className="p-2 text-sm opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">{msg.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Target message indicator */}
        <div className="my-2 text-center text-xs text-muted-foreground border-t border-b border-primary/20 py-1">
          <span className="bg-background px-2">⬇ Target Message ⬇</span>
        </div>

        {/* Messages after */}
        {context.after.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
              <span>{context.after.length} message{context.after.length === 1 ? '' : 's'} after</span>
            </div>
            {context.after.map((msg) => (
              <Card key={msg.id} className="p-2 text-sm opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">{msg.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {context.before.length === 0 && context.after.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            No surrounding messages found
          </p>
        )}
      </div>
    </div>
  )
}
