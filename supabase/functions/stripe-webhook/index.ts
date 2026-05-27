import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { accessMonths, stripeRequest, type Billing, type PlanId } from '../_shared/stripe.ts'

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((result, item) => {
    const [key, value] = item.split('=')
    if (!key || !value) return result
    result[key] = [...(result[key] || []), value]
    return result
  }, {})
  const timestamp = parts.t?.[0]
  const signatures = parts.v1 || []

  if (!timestamp || !signatures.length) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedPayload = `${timestamp}.${payload}`
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const digestHex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return signatures.includes(digestHex)
}

function periodEndFromNow(billing: Billing) {
  const date = new Date()
  date.setMonth(date.getMonth() + accessMonths(billing))
  return date.toISOString()
}

async function periodEndFromSession(session: Record<string, unknown>, billing: Billing) {
  if (billing === 'monthly' && typeof session.subscription === 'string') {
    const subscription = await stripeRequest(`subscriptions/${session.subscription}`)

    if (subscription.current_period_end) {
      return new Date(subscription.current_period_end * 1000).toISOString()
    }
  }

  return periodEndFromNow(billing)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing webhook environment.')
    }

    const payload = await request.text()
    const signature = request.headers.get('Stripe-Signature') || ''
    const isVerified = await verifyStripeSignature(payload, signature, webhookSecret)

    if (!isVerified) {
      return jsonResponse({ error: 'Invalid Stripe signature.' }, 401)
    }

    const event = JSON.parse(payload)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id as PlanId | undefined
      const billing = session.metadata?.billing as Billing | undefined

      if (userId && planId && billing) {
        const currentPeriodEnd = await periodEndFromSession(session, billing)

        const { error } = await supabase
          .from('user_memberships')
          .upsert({
            user_id: userId,
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
            stripe_checkout_session_id: session.id,
            stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
            plan_id: planId,
            billing,
            status: 'active',
            current_period_end: currentPeriodEnd,
          })

        if (error) throw new Error(error.message)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const { error } = await supabase
        .from('user_memberships')
        .update({
          status: 'canceled',
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) throw new Error(error.message)
    }

    return jsonResponse({ received: true })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Webhook failed.' }, 400)
  }
})
