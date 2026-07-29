import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const TRIAL_DAYS = Number(Deno.env.get('FREE_TRIAL_DAYS') || 7)
// The trial grants the same plan a paying member gets — it is the identical
// product, just time-limited. 'billing' records how they got in.
const TRIAL_PLAN_ID = 'transformation'
const TRIAL_BILLING = 'trial'

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
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment.')

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sign in to start your free trial.' }, 401)
    }
    const user = authData.user

    // One trial per account, ever. Any existing membership — active, already
    // trialing, or a lapsed one — means they've had their turn.
    const { data: existing } = await supabase
      .from('user_memberships')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return jsonResponse({ alreadyMember: true, membership: existing })
      }
      if (existing.status === 'trialing') {
        // Re-entering an in-flight trial is fine; it just returns what they have.
        return jsonResponse({ membership: existing })
      }
      return jsonResponse(
        { error: 'This account has already used its free trial.' },
        409,
      )
    }

    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + TRIAL_DAYS)

    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: user.id,
        plan_id: TRIAL_PLAN_ID,
        billing: TRIAL_BILLING,
        status: 'trialing',
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single()

    // 23505: a concurrent call created the row first — not an error for the user.
    if (membershipError) {
      if (membershipError.code === '23505') {
        const { data: raced } = await supabase
          .from('user_memberships')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle()
        return jsonResponse({ membership: raced })
      }
      throw membershipError
    }

    // Best effort: let Lindsay see in the dashboard who actually started.
    if (user.email) {
      await supabase
        .from('trial_applications')
        .update({ status: 'enrolled' })
        .eq('email', user.email)
        .eq('status', 'new')
    }

    return jsonResponse({ membership })
  } catch (err) {
    console.error('[start-trial]', err)
    return jsonResponse({ error: 'Could not start your free trial. Please try again.' }, 500)
  }
})
