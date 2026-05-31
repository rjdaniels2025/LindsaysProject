import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase function environment.')
    }

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sign in before redeeming a coupon.' }, 401)
    }

    const body = await request.json()
    const code = (body.code || '').toUpperCase().trim()

    if (!code) {
      return jsonResponse({ error: 'No coupon code provided.' }, 400)
    }

    const { data: coupon, error: couponError } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (couponError || !coupon) {
      return jsonResponse({ error: 'Invalid or expired coupon code.' }, 400)
    }

    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return jsonResponse({ error: 'This coupon has reached its usage limit.' }, 400)
    }

    if (coupon.discount_percent !== 100) {
      return jsonResponse({ error: 'This coupon cannot be redeemed directly.' }, 400)
    }

    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 6)

    const { error: membershipError } = await supabase
      .from('user_memberships')
      .upsert(
        {
          user_id: authData.user.id,
          plan_id: coupon.plan_id,
          billing: coupon.billing,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
        },
        { onConflict: 'user_id' },
      )

    if (membershipError) throw membershipError

    await supabase
      .from('discount_codes')
      .update({ uses_count: coupon.uses_count + 1 })
      .eq('code', code)

    return jsonResponse({ success: true })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'An error occurred. Please try again.' }, 500)
  }
})
