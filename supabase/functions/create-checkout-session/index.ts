import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { checkoutMode, getPriceId, planNames, type Billing, type PlanId, stripeRequest } from '../_shared/stripe.ts'

type CheckoutBody = {
  billing?: Billing
}

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
    const siteUrl = Deno.env.get('SITE_URL') || 'https://elevatehnf.com'

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase function environment.')
    }

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sign in before checkout.' }, 401)
    }

    const body = await request.json() as CheckoutBody
    const billing: Billing = body.billing || 'monthly'
    const planId: PlanId = 'transformation'
    const priceId = getPriceId(billing)
    const mode = checkoutMode(billing)
    const user = authData.user
    const params = new URLSearchParams()

    params.set('mode', mode)
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
    params.set('client_reference_id', user.id)
    params.set('customer_email', user.email || '')
    params.set('success_url', `${siteUrl}/?checkout=success`)
    params.set('cancel_url', `${siteUrl}/#pricing`)
    params.set('metadata[user_id]', user.id)
    params.set('metadata[plan_id]', planId)
    params.set('metadata[billing]', billing)
    params.set('metadata[plan_name]', planNames[planId])

    const session = await stripeRequest('checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const { error: upsertError } = await supabase
      .from('user_memberships')
      .upsert({
        user_id: user.id,
        stripe_checkout_session_id: session.id,
        plan_id: planId,
        billing,
        status: 'pending',
      }, { onConflict: 'user_id' })

    if (upsertError) {
      throw new Error(upsertError.message)
    }

    return jsonResponse({ url: session.url })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unable to start checkout.' }, 400)
  }
})
