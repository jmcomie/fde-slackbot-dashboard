import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useConcernsWithMessages } from '@/hooks/useConcernsWithMessages'
import { ConcernMessageGroup } from '@/components/message-dashboard/ConcernMessageGroup'
import { LayoutDashboard, MessageSquare, Bug, Sparkles, HelpCircle } from 'lucide-react'
import type { ConcernCategory, ConcernStatus } from '@/types'

export default function MessageDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<ConcernCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ConcernStatus>('open')

  const categoryFilter = selectedCategory === 'all' ? undefined : selectedCategory
  const { concernsWithMessages, loading, error } = useConcernsWithMessages(categoryFilter, selectedStatus)

  const categoryLabels: Record<ConcernCategory | 'all', string> = {
    all: 'All',
    bug_report: 'Bug Reports',
    feature_request: 'Feature Requests',
    support_question: 'Support Questions',
    general_question: 'General Questions',
  }

  // Calculate stats for all categories
  const allConcerns = concernsWithMessages
  const bugCount = allConcerns.filter(c => c.category === 'bug_report').length
  const featureCount = allConcerns.filter(c => c.category === 'feature_request').length
  const supportCount = allConcerns.filter(c => c.category === 'support_question').length
  const generalCount = allConcerns.filter(c => c.category === 'general_question').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Message Dashboard</h1>
        <p className="text-muted-foreground">
          View all categorized messages grouped by their tickets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allConcerns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
            <Bug className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bugCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featureCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Questions</CardTitle>
            <HelpCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>Grouped Messages ({allConcerns.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex gap-2">
                {(['open', 'in_progress', 'resolved', 'closed'] as ConcernStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                    className="capitalize"
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Category Filter Tabs */}
          <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ConcernCategory | 'all')} className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({allConcerns.length})
              </TabsTrigger>
              <TabsTrigger value="bug_report">
                Bugs ({bugCount})
              </TabsTrigger>
              <TabsTrigger value="feature_request">
                Features ({featureCount})
              </TabsTrigger>
              <TabsTrigger value="support_question">
                Support ({supportCount})
              </TabsTrigger>
              <TabsTrigger value="general_question">
                General ({generalCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading message groups...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error: {error}</p>
            </div>
          ) : allConcerns.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                No {selectedCategory === 'all' ? selectedStatus : categoryLabels[selectedCategory].toLowerCase()} messages found
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Message groups will appear here when messages are categorized and grouped
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {allConcerns.map((concern) => (
                <ConcernMessageGroup key={concern.id} concern={concern} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
