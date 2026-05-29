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

export function getPriceId(billing: string) {
  if (!['pay-in-full', 'monthly', 'biweekly'].includes(billing)) {
    throw new Error('Invalid billing option.')
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
