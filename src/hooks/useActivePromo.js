import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Asks the server whether a promo code is usable right now. This is the same
// RPC the coupon box calls before checkout, so an advertised promo and an
// accepted promo can never disagree: if the window has closed, this returns
// null and every surface that advertises it stops rendering.
export function useActivePromo(code) {
  const [promo, setPromo] = useState(null)

  useEffect(() => {
    if (!supabase || !code) return

    let cancelled = false

    supabase
      .rpc('active_discount_code', { lookup_code: code })
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPromo(data)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  return promo
}
