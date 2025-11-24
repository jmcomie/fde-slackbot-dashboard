import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useConcerns } from '@/hooks/useConcerns'
import { MessageSquare, Clock, TrendingUp } from 'lucide-react'
import type { ConcernCategory } from '@/types'

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getCategoryBadgeVariant(category: ConcernCategory): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (category) {
    case 'bug_report':
      return 'destructive'
    case 'feature_request':
      return 'secondary'
    case 'support_question':
      return 'default'
    case 'general_question':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ')
}

export default function Concerns() {
  const { concerns, loading, error } = useConcerns(undefined, 'open')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Concerns</h1>
        <p className="text-muted-foreground">
          Semantically grouped customer issues across all channels
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Concerns</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{concerns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {concerns.filter((c) => c.category === 'bug_report').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {concerns.filter((c) => c.category === 'feature_request').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Questions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {concerns.filter((c) => c.category === 'support_question').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Concerns List */}
      <Card>
        <CardHeader>
          <CardTitle>Open Concerns ({concerns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading concerns...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : concerns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No open concerns</p>
              <p className="text-muted-foreground text-sm mt-2">
                Concerns will appear here when similar messages are grouped together
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {concerns.map((concern) => (
                <div
                  key={concern.id}
                  className="border-l-4 border-primary/20 pl-4 py-3 hover:bg-accent/50 transition-colors rounded-r cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <h3 className="font-semibold text-lg">{concern.title}</h3>
                      <Badge variant={getCategoryBadgeVariant(concern.category)}>
                        {formatCategory(concern.category)}
                      </Badge>
                      {concern.priority && (
                        <Badge variant="outline">{concern.priority}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{concern.message_count} message{concern.message_count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatRelativeTime(concern.last_updated)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        Created {formatRelativeTime(concern.first_seen)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {concern.grouping_method.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
