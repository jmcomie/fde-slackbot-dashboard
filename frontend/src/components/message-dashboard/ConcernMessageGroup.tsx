import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageItem } from './MessageItem'
import { useConcernUpdate } from '@/hooks/useConcernUpdate'
import { useAvailableConcerns } from '@/hooks/useAvailableConcerns'
import { useMessageReassignment } from '@/hooks/useMessageReassignment'
import { ChevronDown, ChevronRight, Bug, MessageSquare, Clock, Loader2, ArrowRightLeft } from 'lucide-react'
import type { ConcernWithMessages } from '@/hooks/useConcernsWithMessages'
import type { ConcernCategory, ConcernStatus } from '@/types'

interface ConcernMessageGroupProps {
  concern: ConcernWithMessages
  defaultExpanded?: boolean
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

function getStatusBadgeVariant(status: ConcernStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'open':
      return 'default'
    case 'in_progress':
      return 'secondary'
    case 'resolved':
      return 'outline'
    case 'closed':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

/**
 * Component to display a concern (ticket) with its grouped messages
 * Shows category, bug count, and collapsible message list
 */
export function ConcernMessageGroup({ concern, defaultExpanded = true }: ConcernMessageGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Sync local state when parent changes defaultExpanded (for expand/collapse all)
  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const { updating, error, updateStatus } = useConcernUpdate()
  const { moving, error: moveError, moveMessagesToConcern } = useMessageReassignment()
  const { concerns: availableConcerns, loading: loadingConcerns } = useAvailableConcerns(concern.id)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moveDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(event.target as Node)) {
        setShowMoveDropdown(false)
      }
    }

    if (showStatusDropdown || showMoveDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusDropdown, showMoveDropdown])

  const handleStatusChange = async (newStatus: ConcernStatus) => {
    setShowStatusDropdown(false)
    const result = await updateStatus(concern.id, newStatus)
    if (!result.success) {
      // Error is already set in the hook, we could show a toast here
      console.error('Failed to update status:', result.error)
    }
  }

  const handleMoveToConcern = async (targetConcernId: string) => {
    setShowMoveDropdown(false)
    const result = await moveMessagesToConcern(concern.id, targetConcernId)
    if (result.success) {
      console.log(
        `Moved ${result.messagesMovedCount} message(s) and ${result.bugsMovedCount} bug(s) to concern ${targetConcernId}`
      )
    } else {
      console.error('Failed to move messages:', result.error)
    }
  }

  return (
    <Card className="overflow-visible">
      {/* Concern Header */}
      <div className="border-b bg-accent/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-6 w-6"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <h3 className="font-semibold text-lg">{concern.title}</h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap ml-8">
              {/* Category Badge */}
              <Badge variant={getCategoryBadgeVariant(concern.category)}>
                {formatCategory(concern.category)}
              </Badge>

              {/* Bug Count */}
              <div className="flex items-center gap-1 text-sm">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="font-medium">{concern.bug_count}</span>
                <span className="text-muted-foreground">
                  bug{concern.bug_count === 1 ? '' : 's'}
                </span>
              </div>

              {/* Message Count */}
              <div className="flex items-center gap-1 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{concern.message_count}</span>
                <span className="text-muted-foreground">
                  message{concern.message_count === 1 ? '' : 's'}
                </span>
              </div>

              {/* Last Updated */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated {formatRelativeTime(concern.last_updated)}</span>
              </div>

              {/* Priority Badge */}
              {concern.priority && (
                <Badge variant="outline" className="text-xs capitalize">
                  {concern.priority}
                </Badge>
              )}

              {/* Grouping Method */}
              <Badge variant="outline" className="text-xs">
                {concern.grouping_method.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {/* Status Selector and Move Button */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-2">
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={updating}
                  className="min-w-[140px] justify-between capitalize"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Badge variant={getStatusBadgeVariant(concern.status)} className="text-xs capitalize">
                        {formatStatus(concern.status)}
                      </Badge>
                      <ChevronDown className="h-3 w-3 ml-2" />
                    </>
                  )}
                </Button>

                {/* Status Dropdown */}
                {showStatusDropdown && !updating && (
                  <div className="absolute right-0 top-full mt-1 w-[160px] bg-background border rounded-md shadow-lg z-50">
                    {(['open', 'in_progress', 'resolved', 'closed'] as ConcernStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-accent transition-colors ${
                          concern.status === status ? 'bg-accent/50 font-medium' : ''
                        }`}
                      >
                        {formatStatus(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Move to Ticket Button */}
            <div className="flex flex-col gap-2">
              <div className="relative" ref={moveDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                  disabled={moving || loadingConcerns}
                  className="min-w-[140px] justify-between"
                >
                  {moving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-3 w-3 mr-2" />
                      Move to Ticket
                      <ChevronDown className="h-3 w-3 ml-2" />
                    </>
                  )}
                </Button>

                {/* Move Dropdown */}
                {showMoveDropdown && !moving && (
                  <div className="absolute right-0 top-full mt-1 w-[280px] max-h-[300px] overflow-y-auto bg-background border rounded-md shadow-lg z-50">
                    {loadingConcerns ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading tickets...
                      </div>
                    ) : availableConcerns.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No other tickets available
                      </div>
                    ) : (
                      availableConcerns.map((availableConcern) => (
                        <button
                          key={availableConcern.id}
                          onClick={() => handleMoveToConcern(availableConcern.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{availableConcern.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getCategoryBadgeVariant(availableConcern.category as ConcernCategory)} className="text-xs">
                                  {formatCategory(availableConcern.category)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {availableConcern.message_count}m · {availableConcern.bug_count}b
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {moveError && (
                <p className="text-xs text-destructive">{moveError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {concern.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages in this concern
            </p>
          ) : (
            concern.messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
        </div>
      )}
    </Card>
  )
}
