import { useState } from 'react'

/**
 * Hook to handle moving all messages/bugs from one concern to another.
 * Calls the backend API to perform the reassignment and update counts.
 */
export function useMessageReassignment() {
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Move all messages and bugs from one concern to another
   *
   * @param fromConcernId - The source concern ID
   * @param toConcernId - The target concern ID
   * @returns Promise with success status and counts moved
   */
  const moveMessagesToConcern = async (
    fromConcernId: string,
    toConcernId: string
  ) => {
    setMoving(true)
    setError(null)

    try {
      // Get backend API URL from environment or use default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      // Call backend endpoint to reassign messages
      const response = await fetch(`${apiUrl}/reassign-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_concern_id: fromConcernId,
          to_concern_id: toConcernId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to move messages')
      }

      const result = await response.json()

      return {
        success: true,
        messagesMovedCount: result.messages_moved_count,
        bugsMovedCount: result.bugs_moved_count,
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to move messages'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setMoving(false)
    }
  }

  return { moving, error, moveMessagesToConcern }
}
