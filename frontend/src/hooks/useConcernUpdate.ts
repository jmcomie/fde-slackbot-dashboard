import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ConcernStatus, ConcernPriority } from '@/types'

/**
 * Hook to update concern/ticket properties (status, priority, etc.)
 * Follows the pattern from useSettings for optimistic updates
 */
export function useConcernUpdate() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Update a concern's status
   */
  const updateStatus = async (concernId: string, status: ConcernStatus) => {
    setUpdating(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('concern')
        .update({ status })
        .eq('id', concernId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  /**
   * Update a concern's priority
   */
  const updatePriority = async (concernId: string, priority: ConcernPriority) => {
    setUpdating(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('concern')
        .update({ priority })
        .eq('id', concernId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update priority'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  /**
   * Update multiple concern fields at once
   */
  const updateConcern = async (
    concernId: string,
    updates: { status?: ConcernStatus; priority?: ConcernPriority }
  ) => {
    setUpdating(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('concern')
        .update(updates)
        .eq('id', concernId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update concern'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  return { updating, error, updateStatus, updatePriority, updateConcern }
}
