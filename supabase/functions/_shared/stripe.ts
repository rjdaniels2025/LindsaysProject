const stripeApiVersion = '2024-06-20'

export type Billing = 'pay-in-full' | 'monthly' | 'biweekly'
export type PlanId = 'transformation'

export const planNames: Record<PlanId, string> = {
  transformation: '6-Month Transformation Program',
}

export function checkoutMode(billing: Billing) {
  return billing === 'pay-in-full' ? 'payment' : 'subscription'
}

export function accessMonths(_billing: Billing) {
  return 6
}

export function priceEnvName(billing: Billing) {
  const billingKey = billing === 'pay-in-full' ? 'PAY_IN_FULL' : billing === 'monthly' ? 'MONTHLY' : 'BIWEEKLY'
  return `STRIPE_PRICE_TRANSFORMATION_${billingKey}`
}

// Founding-client launch offer: discounted one-time pay-in-full price, ends at the end of
// June 30, 2026 (midnight Eastern). Enforced here so the promo can't be claimed past the
// deadline regardless of what the client sends. Keep this cutoff in sync with
// src/lib/foundingOffer.js on the frontend.
export const FOUNDING_OFFER_ENDS_AT = Date.parse('2026-07-01T04:00:00Z')

export function isFoundingOfferActive(now: number = Date.now()) {
  return now < FOUNDING_OFFER_ENDS_AT
}

export function getPriceId(billing: string, opts: { foundingActive?: boolean } = {}) {
  if (!['pay-in-full', 'monthly', 'biweekly'].includes(billing)) {
    throw new Error('Invalid billing option.')
  }

  // The founding offer only applies to the one-time pay-in-full purchase. While active we
  // require the founding price to be configured rather than silently charging the regular
  // price, so a customer is never billed more than the advertised founding amount.
  if (billing === 'pay-in-full' && opts.foundingActive) {
    const foundingId = Deno.env.get('STRIPE_PRICE_TRANSFORMATION_FOUNDING')
    if (!foundingId) {
      throw new Error('Founding offer is active but STRIPE_PRICE_TRANSFORMATION_FOUNDING is not set.')
    }
    return foundingId
  }

  const envName = priceEnvName(billing as Billing)
  const priceId = Deno.env.get(envName)

  if (!priceId) {
    throw new Error(`Missing ${envName}.`)
  }

  return priceId
}

export async function stripeRequest(path: string, init: RequestInit = {}) {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY.')
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': stripeApiVersion,
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed with ${response.status}.`)
  }

  return data
}
