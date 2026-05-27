const secretKey = process.env.STRIPE_SECRET_KEY
const projectRef = process.env.SUPABASE_PROJECT_REF
const siteUrl = process.env.SITE_URL || 'https://elevatehnf.com'

if (!secretKey) {
  throw new Error('Set STRIPE_SECRET_KEY before running this script.')
}

const plans = [
  {
    id: 'starter',
    productId: 'elevate_starter',
    name: 'Elevate Starter',
    monthlyAmount: 7900,
    sixMonthAmount: 39900,
  },
  {
    id: 'transformation',
    productId: 'elevate_transformation',
    name: 'Elevate Transformation',
    monthlyAmount: 19900,
    sixMonthAmount: 99900,
  },
  {
    id: 'elite',
    productId: 'elevate_elite',
    name: 'Elevate Elite Coaching',
    monthlyAmount: 34900,
    sixMonthAmount: 179900,
  },
]

async function stripe(path, options = {}) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': '2024-06-20',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed: ${response.status}`)
  }

  return data
}

async function getOrCreateProduct(plan) {
  try {
    return await stripe(`products/${plan.productId}`)
  } catch (error) {
    if (!error.message.includes('No such product')) throw error
  }

  const params = new URLSearchParams({
    id: plan.productId,
    name: plan.name,
    description: `${plan.name} membership for Elevate Health and Fitness`,
    'metadata[plan_id]': plan.id,
  })

  return stripe('products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

async function getOrCreatePrice({ productId, lookupKey, amount, recurring }) {
  const existing = await stripe(`prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&limit=1`)

  if (existing.data?.[0]) {
    return existing.data[0]
  }

  const params = new URLSearchParams({
    product: productId,
    currency: 'usd',
    unit_amount: String(amount),
    lookup_key: lookupKey,
  })

  if (recurring) {
    params.set('recurring[interval]', 'month')
  }

  return stripe('prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
}

async function getOrCreateWebhookEndpoint() {
  if (!projectRef) return null

  const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/stripe-webhook`
  const endpoints = await stripe('webhook_endpoints?limit=100')
  const existing = endpoints.data?.find((endpoint) => endpoint.url === webhookUrl)

  if (existing) {
    return { endpoint: existing, secret: null }
  }

  const params = new URLSearchParams({
    url: webhookUrl,
    'enabled_events[]': 'checkout.session.completed',
  })
  params.append('enabled_events[]', 'customer.subscription.deleted')
  params.append('enabled_events[]', 'customer.subscription.updated')

  const endpoint = await stripe('webhook_endpoints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  return { endpoint, secret: endpoint.secret }
}

const env = {
  SITE_URL: siteUrl,
}

for (const plan of plans) {
  await getOrCreateProduct(plan)
  const monthly = await getOrCreatePrice({
    productId: plan.productId,
    lookupKey: `elevate_${plan.id}_monthly`,
    amount: plan.monthlyAmount,
    recurring: true,
  })
  const sixMonth = await getOrCreatePrice({
    productId: plan.productId,
    lookupKey: `elevate_${plan.id}_six_month`,
    amount: plan.sixMonthAmount,
    recurring: false,
  })
  const envPlan = plan.id.toUpperCase().replaceAll('-', '_')

  env[`STRIPE_PRICE_${envPlan}_MONTHLY`] = monthly.id
  env[`STRIPE_PRICE_${envPlan}_SIX_MONTH`] = sixMonth.id
}

const webhook = await getOrCreateWebhookEndpoint()

if (webhook?.secret) {
  env.STRIPE_WEBHOOK_SECRET = webhook.secret
}

console.log(JSON.stringify({
  prices: env,
  webhookEndpointId: webhook?.endpoint?.id || null,
  webhookSecretCreated: Boolean(webhook?.secret),
}, null, 2))
