import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBugs } from '@/hooks/useBugs'
import { Bug, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function Bugs() {
  const { bugs, loading, error } = useBugs()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Validate
      if (!title.trim()) {
        throw new Error('Title is required')
      }

      // Insert into bug_events table
      const { data: insertedData, error: insertError } = await supabase
        .from('bug_events')
        .insert({
          title: title.trim(),
          description: description.trim() || '',
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      console.log('Bug created successfully:', insertedData.id)

      // Call processing edge function to group the bug
      try {
        const { data: processResult, error: processError } = await supabase.functions.invoke(
          'process-bug-event',
          {
            body: { bug_ids: [insertedData.id] }
          }
        )

        if (processError) {
          console.error('Processing error:', processError)
        } else {
          console.log('Bug processed:', processResult)
        }
      } catch (procError) {
        // Don't fail the whole operation - bug is already inserted
        console.error('Failed to process bug:', procError)
      }

      // Reset form
      setTitle('')
      setDescription('')
      setShowForm(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create bug')
      console.error('Error creating bug:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bug Tracker</h1>
        <p className="text-muted-foreground">
          Manually enter bugs to track and group with related Slack messages
        </p>
      </div>

      {/* Create Bug Form */}
      {showForm ? (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Bug</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setTitle('')
                  setDescription('')
                  setSubmitError(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter bug title (used for semantic grouping)"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only the title is used for semantic grouping with concerns
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter bug description (optional)"
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                />
              </div>

              {submitError && (
                <p className="text-sm text-destructive">
                  Error: {submitError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setTitle('')
                    setDescription('')
                    setSubmitError(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Bug'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bug
        </Button>
      )}

      {/* Bugs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bugs ({bugs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading bugs...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : bugs.length === 0 ? (
            <div className="text-center py-12">
              <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                No bugs yet
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Click "Create Bug" above to add your first bug
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bugs.map((bug) => (
                <div
                  key={bug.id}
                  className="border-l-4 border-destructive/40 pl-4 py-3 hover:bg-accent/50 transition-colors rounded-r"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-destructive" />
                      <h3 className="font-semibold">{bug.title}</h3>
                      <Badge variant="destructive">Bug Report</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatRelativeTime(bug.created_at)}</span>
                    </div>
                  </div>
                  {bug.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                      {bug.description}
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
