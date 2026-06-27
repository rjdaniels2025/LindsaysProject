import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAppSettings() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase
      .from('app_settings')
      .select('instagram_url, contact_email')
      .single()
      .then(({ data }) => {
        if (!cancelled) setSettings(data)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return settings
}
