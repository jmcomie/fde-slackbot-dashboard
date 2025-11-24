import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', SETTINGS_ID)
          .single()

        if (error) throw error
        setSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'settings',
        filter: `id=eq.${SETTINGS_ID}`
      }, (payload) => {
        const updatedSettings = payload.new as Settings
        setSettings(updatedSettings)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateSettings = async (updates: Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at'>>) => {
    setUpdating(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', SETTINGS_ID)
        .select()
        .single()

      if (error) throw error

      // Optimistically update local state
      setSettings(data)
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  return { settings, loading, error, updating, updateSettings }
}
