import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Ticket } from '@/types'
import { formatRelativeTime, getMessageTypeColor, getStatusColor, getPriorityColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TicketsListProps {
  tickets: Ticket[]
}

export default function TicketsList({ tickets }: TicketsListProps) {
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      getMessageTypeColor(ticket.message_type)
                    )}
                  />
                  <h3 className="font-semibold">{ticket.title}</h3>
                </div>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{ticket.channel_name || ticket.channel}</span>
                  <span>•</span>
                  <span>{ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(ticket.updated_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge
                  className={cn(
                    'text-white',
                    getStatusColor(ticket.status)
                  )}
                >
                  {ticket.status.replace('_', ' ')}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-white',
                    getPriorityColor(ticket.priority)
                  )}
                >
                  {ticket.priority}
                </Badge>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
