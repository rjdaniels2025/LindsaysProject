import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { accessMonths, checkoutMode, getPriceId, isFoundingOfferActive, planNames, type Billing, type PlanId, stripeRequest } from '../_shared/stripe.ts'

type CheckoutBody = {
  billing?: Billing
  code?: string
}

// A percentage code has to become a Stripe coupon before Stripe will honour it.
//
// The coupon id is derived from the code AND the billing mode, because the
// duration differs between them and caching a single coupon per code would let
// whoever checked out first decide it for everyone after: a monthly buyer
// landing on a "once" coupon would get one discounted payment out of six, which
// is exactly the outcome that was ruled out.
//
// Deterministic ids also make this idempotent — retrieve, and only create when
// it is genuinely missing — so retries never pile up duplicate coupons.
function couponIdFor(code: string, billing: Billing) {
  return `${code.toUpperCase()}-${checkoutMode(billing)}`
}

async function ensureCoupon(code: string, percentOff: number, billing: Billing) {
  const id = couponIdFor(code, billing)

  try {
    const existing = await stripeRequest(`coupons/${encodeURIComponent(id)}`)
    if (existing?.id) return existing.id as string
  } catch {
    // Not found is the normal path the first time this code is used.
  }

  const params = new URLSearchParams()
  params.set('id', id)
  params.set('percent_off', String(percentOff))
  params.set('name', `${code.toUpperCase()} (${percentOff}% off)`)
  if (checkoutMode(billing) === 'subscription') {
    // The discount holds for the whole six months. On a monthly plan that is
    // the difference between about $82 and about $495 off, and "30% off the
    // program" has to mean the program.
    params.set('duration', 'repeating')
    params.set('duration_in_months', String(accessMonths(billing)))
  } else {
    params.set('duration', 'once')
  }

  const coupon = await stripeRequest('coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  return coupon.id as string
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
    const foundingActive = isFoundingOfferActive()
    const priceId = getPriceId(billing, { foundingActive })
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
    params.set('metadata[founding_offer]', billing === 'pay-in-full' && foundingActive ? 'true' : 'false')

    // The code is re-read here and never trusted from the client. The pricing
    // page can be told anything; what gets charged is decided from the row,
    // inside its date window, exactly as the founding offer is enforced rather
    // than believed.
    const requestedCode = String(body.code || '').trim()
    if (requestedCode) {
      const { data: valid } = await supabase
        .rpc('active_discount_code', { lookup_code: requestedCode })
        .maybeSingle()

      if (!valid) {
        return jsonResponse({ error: 'That code is not valid right now.' }, 400)
      }
      if (valid.billing !== 'any' && valid.billing !== billing) {
        return jsonResponse({ error: `That code only applies to the ${valid.billing} option.` }, 400)
      }
      // 100% codes never reach Stripe; redeem-coupon grants access directly.
      if (valid.discount_percent > 0 && valid.discount_percent < 100) {
        const couponId = await ensureCoupon(valid.code, valid.discount_percent, billing)
        params.set('discounts[0][coupon]', couponId)
        params.set('metadata[discount_code]', valid.code)
      }
    }

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
