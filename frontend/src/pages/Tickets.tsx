import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTickets } from '@/hooks/useTickets'
import TicketsList from '@/components/dashboard/TicketsList'

export default function Tickets() {
  const { tickets, loading, error } = useTickets()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Tickets</h1>
        <p className="text-muted-foreground">
          View and manage all customer support tickets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading tickets...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground">No tickets found.</p>
          ) : (
            <TicketsList tickets={tickets} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
