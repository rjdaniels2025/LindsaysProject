// The only module in the app that talks to the Meta Pixel.
//
// Two rules it exists to enforce:
//
// 1. Tracking can never break the product. Every call is wrapped, and fbq is
//    simply absent for anyone running an ad blocker, so a missing pixel must
//    behave exactly like a working one from the app's point of view. Nothing
//    here throws, and nothing here is awaited.
//
// 2. Nothing identifying or medical is ever sent. The assessment collects
//    injuries and limitations (see src/utils/programSafety.js, which reads
//    profile.limitations to flag contraindicated exercises) and members give
//    their name, email and phone. None of that goes to Meta. Events carry a
//    value and a currency or nothing at all, which is why `track` accepts only
//    a small allowlist of parameters rather than an arbitrary object — a
//    future caller cannot accidentally widen it by passing more.

const ALLOWED_PARAMS = ['value', 'currency', 'content_name', 'content_category']

function fbq(...args) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq(...args)
  } catch {
    // A blocked or half-loaded pixel must never surface to the member.
  }
}

// Strips anything not on the allowlist. Deliberate: the guarantee above is only
// worth something if it holds for calls written later by someone reading this
// months from now.
function safeParams(params) {
  if (!params || typeof params !== 'object') return null
  const out = {}
  for (const key of ALLOWED_PARAMS) {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') out[key] = value
  }
  return Object.keys(out).length ? out : null
}

export function track(event, params) {
  const clean = safeParams(params)
  if (clean) fbq('track', event, clean)
  else fbq('track', event)
}

// Hash routing means the browser never reloads, so Meta would otherwise see one
// landing page hit and none of the funnel.
export function trackPageView() {
  fbq('track', 'PageView')
}

// Prices are strings for display ("$1,499", "$275"). Meta wants a number.
export function priceToValue(price) {
  const n = Number.parseFloat(String(price ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
