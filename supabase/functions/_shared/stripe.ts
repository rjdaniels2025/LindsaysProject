const stripeApiVersion = '2024-06-20'

export type Billing = 'monthly' | 'six-month'
export type PlanId = 'starter' | 'transformation' | 'elite'

export const planNames: Record<PlanId, string> = {
  starter: 'Starter',
  transformation: 'Transformation',
  elite: 'Elite Coaching',
}

export function checkoutMode(billing: Billing) {
  return billing === 'monthly' ? 'subscription' : 'payment'
}

export function accessMonths(billing: Billing) {
  return billing === 'monthly' ? 1 : 6
}

export function priceEnvName(planId: PlanId, billing: Billing) {
  const planKey = planId.toUpperCase().replaceAll('-', '_')
  const billingKey = billing === 'six-month' ? 'SIX_MONTH' : 'MONTHLY'
  return `STRIPE_PRICE_${planKey}_${billingKey}`
}

export function getPriceId(planId: string, billing: string) {
  if (!['starter', 'transformation', 'elite'].includes(planId)) {
    throw new Error('Invalid membership plan.')
  }

  if (!['monthly', 'six-month'].includes(billing)) {
    throw new Error('Invalid billing option.')
  }

  const envName = priceEnvName(planId as PlanId, billing as Billing)
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
