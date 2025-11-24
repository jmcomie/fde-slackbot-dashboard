import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTickets } from '@/hooks/useTickets'
import { useMessages } from '@/hooks/useMessages'
import TicketsList from '@/components/dashboard/TicketsList'
import StatsWidget from '@/components/dashboard/StatsWidget'

export default function Dashboard() {
  const { tickets, loading: ticketsLoading } = useTickets()
  const { messages, loading: messagesLoading } = useMessages()

  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const todayMessages = messages.filter(m => {
    const today = new Date().toDateString()
    return new Date(m.created_at).toDateString() === today
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of customer messages and tickets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsWidget
          label="Total Tickets"
          value={ticketsLoading ? '...' : tickets.length.toString()}
        />
        <StatsWidget
          label="Open Tickets"
          value={ticketsLoading ? '...' : openTickets.toString()}
          variant="warning"
        />
        <StatsWidget
          label="In Progress"
          value={ticketsLoading ? '...' : inProgressTickets.toString()}
          variant="info"
        />
        <StatsWidget
          label="Messages Today"
          value={messagesLoading ? '...' : todayMessages.toString()}
          variant="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <p className="text-muted-foreground">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground">No tickets yet. Messages will appear here once customers start asking questions.</p>
          ) : (
            <TicketsList tickets={tickets.slice(0, 10)} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
