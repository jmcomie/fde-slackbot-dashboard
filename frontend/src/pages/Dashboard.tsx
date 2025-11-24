import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConcerns } from '@/hooks/useConcerns'
import { useMessages } from '@/hooks/useMessages'
import StatsWidget from '@/components/dashboard/StatsWidget'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import type { Concern } from '@/types'

export default function Dashboard() {
  const { concerns, loading: concernsLoading } = useConcerns()
  const { messages, loading: messagesLoading } = useMessages()

  const openConcerns = concerns.filter(c => c.status === 'open').length
  const bugReports = concerns.filter(c => c.category === 'bug_report').length
  const todayMessages = messages.filter(m => {
    const today = new Date().toDateString()
    return new Date(m.created_at).toDateString() === today
  }).length

  // Group concerns by category for display
  const concernsByCategory = {
    bug_report: concerns.filter(c => c.category === 'bug_report'),
    feature_request: concerns.filter(c => c.category === 'feature_request'),
    support_question: concerns.filter(c => c.category === 'support_question'),
    general_question: concerns.filter(c => c.category === 'general_question'),
  }

  const categoryLabels = {
    bug_report: 'Bug Reports',
    feature_request: 'Feature Requests',
    support_question: 'Support Questions',
    general_question: 'General Questions',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of customer concerns and messages
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsWidget
          label="Total Concerns"
          value={concernsLoading ? '...' : concerns.length.toString()}
        />
        <StatsWidget
          label="Open Concerns"
          value={concernsLoading ? '...' : openConcerns.toString()}
          variant="warning"
        />
        <StatsWidget
          label="Bug Reports"
          value={concernsLoading ? '...' : bugReports.toString()}
          variant="warning"
        />
        <StatsWidget
          label="Messages Today"
          value={messagesLoading ? '...' : todayMessages.toString()}
          variant="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(concernsByCategory).map(([category, categoryConcerns]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">
                {categoryLabels[category as keyof typeof categoryLabels]} ({categoryConcerns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {concernsLoading ? (
                <p className="text-muted-foreground">Loading concerns...</p>
              ) : categoryConcerns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {categoryLabels[category as keyof typeof categoryLabels].toLowerCase()} yet
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryConcerns.slice(0, 5).map((concern: Concern) => (
                    <div
                      key={concern.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{concern.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {concern.message_count} {concern.message_count === 1 ? 'message' : 'messages'} •
                          {' '}{formatDistanceToNow(new Date(concern.last_updated), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge
                        variant={concern.status === 'open' ? 'default' : 'secondary'}
                        className="ml-2 flex-shrink-0"
                      >
                        {concern.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {concernsLoading ? (
            <p className="text-muted-foreground">Loading concerns...</p>
          ) : concerns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No concerns yet</p>
              <p className="text-sm text-muted-foreground">
                Add test messages in the Messages tab to see semantic grouping in action
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {concerns
                .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
                .slice(0, 10)
                .map((concern: Concern) => (
                  <div
                    key={concern.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{concern.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {concern.category.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {concern.message_count} messages • Updated {formatDistanceToNow(new Date(concern.last_updated), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={concern.status === 'open' ? 'default' : 'secondary'}>
                      {concern.status}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
