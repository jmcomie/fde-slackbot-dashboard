import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMessages } from '@/hooks/useMessages'
import { TestTube } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Sample test messages for different scenarios
const TEST_MESSAGES = [
  {
    user_id: 'U123TEST',
    channel_id: 'C456SUPPORT',
    message_text: 'The payment button is not working. I keep getting an error when I try to checkout.',
    event_type: 'message',
  },
  {
    user_id: 'U789TEST',
    channel_id: 'C456SUPPORT',
    message_text: 'How do I reset my password? I cannot find the option in settings.',
    event_type: 'message',
  },
  {
    user_id: 'U456TEST',
    channel_id: 'C789FEEDBACK',
    message_text: 'Would love to see a dark mode option added to the app!',
    event_type: 'message',
  },
  {
    user_id: 'U234TEST',
    channel_id: 'C456SUPPORT',
    message_text: 'Getting a 500 error when trying to upload files. This is urgent!',
    event_type: 'message',
  },
  {
    user_id: 'U567TEST',
    channel_id: 'C789FEEDBACK',
    message_text: 'Thanks for the quick response yesterday! The issue is resolved.',
    event_type: 'message',
  },
]

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getMessageTypeBadgeVariant(type?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!type) return 'outline'
  switch (type) {
    case 'bug_report':
      return 'destructive'
    case 'support_question':
      return 'default'
    case 'feature_request':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatMessageType(type?: string): string {
  if (!type) return 'unclassified'
  return type.replace(/_/g, ' ')
}

export default function Messages() {
  const { messages, loading, error } = useMessages()
  const [isInserting, setIsInserting] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)

  const handleAddTestMessage = async () => {
    setIsInserting(true)
    setInsertError(null)

    try {
      // Pick a random test message
      const randomMessage = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)]

      // Generate unique event_id
      const eventId = `test_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Generate message timestamp (Slack format: seconds.microseconds)
      const messageTs = `${Date.now() / 1000}`

      // Create raw_payload matching Slack's event structure
      const rawPayload = {
        type: 'event_callback',
        event: {
          type: randomMessage.event_type,
          channel: randomMessage.channel_id,
          user: randomMessage.user_id,
          text: randomMessage.message_text,
          ts: messageTs,
        },
        event_id: eventId,
        event_time: Math.floor(Date.now() / 1000),
      }

      // Insert into slack_events table
      const { error: insertError } = await supabase
        .from('slack_events')
        .insert({
          event_id: eventId,
          event_type: randomMessage.event_type,
          channel_id: randomMessage.channel_id,
          user_id: randomMessage.user_id,
          message_text: randomMessage.message_text,
          message_ts: messageTs,
          raw_payload: rawPayload,
        })

      if (insertError) {
        throw insertError
      }

      console.log('Test message added successfully:', eventId)

      // Cooldown period to prevent spam
      setTimeout(() => setIsInserting(false), 1000)
    } catch (err) {
      setInsertError(err instanceof Error ? err.message : 'Failed to add test message')
      setIsInserting(false)
      console.error('Error adding test message:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Real-time feed of all customer messages from Slack
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Messages ({messages.length})</CardTitle>
            <Button
              onClick={handleAddTestMessage}
              disabled={isInserting}
              variant="outline"
              size="sm"
            >
              <TestTube className="mr-2 h-4 w-4" />
              {isInserting ? 'Adding...' : 'Add Test Message'}
            </Button>
          </div>
          {insertError && (
            <p className="text-sm text-destructive mt-2">
              Error: {insertError}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading messages...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No messages yet
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Messages will appear here when customers send messages in Slack
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Click "Add Test Message" above to insert a fake message for testing
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border-l-4 border-primary/20 pl-4 py-3 hover:bg-accent/50 transition-colors rounded-r"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{message.user_name || message.user_id}</p>
                      {message.message_type && (
                        <Badge variant={getMessageTypeBadgeVariant(message.message_type)}>
                          {formatMessageType(message.message_type)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>#{message.channel_name || message.channel}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(message.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.thread_ts && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Thread reply
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
