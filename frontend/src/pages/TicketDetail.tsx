import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTicket } from '@/hooks/useTickets'
import { formatRelativeTime } from '@/lib/utils'

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { ticket, loading, error } = useTicket(id!)

  if (loading) {
    return <div className="p-6">Loading ticket...</div>
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading ticket: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{ticket.title}</h1>
          <p className="text-muted-foreground">
            {ticket.channel_name || ticket.channel} • {formatRelativeTime(ticket.created_at)}
          </p>
        </div>
        <Badge>{ticket.status}</Badge>
        <Badge variant="secondary">{ticket.priority}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages ({ticket.messages.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.map((message) => (
            <div key={message.id} className="border-l-2 border-primary pl-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{message.user_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(message.created_at)}
                  </p>
                </div>
              </div>
              <p className="mt-2">{message.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
