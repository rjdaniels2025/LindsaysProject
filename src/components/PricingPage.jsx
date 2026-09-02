import { ArrowLeft, CheckCircle2, ShieldCheck, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { isFoundingOfferActive } from '../lib/foundingOffer.js'
import { billingChargeAmount, formatMoney, getBillingOptions } from '../lib/pricing.js'
import { useActivePromo } from '../hooks/useActivePromo.js'
import { PROMO_CODE, PROMO_NAME, promoLastDay } from '../lib/promo.js'

const features = [
  'Personalized workout guidance',
  'Meal guidance',
  'Accountability coaching',
  'Weekly check-ins',
  'Lifestyle support',
  'Habit coaching',
]

const whyItWorks = [
  'Habits take longer than 4 weeks to actually stick',
  'Accountability is what separates results from good intentions',
  'Progress compounds when coaching adapts as you grow',
  'Lifestyle transformation outlasts any short challenge',
]

export default function PricingPage({
  onCheckout,
  onStartAssessment,
  initialBilling = 'monthly',
  requiresAssessment = false,
  isLoading,
  isVerifyingPayment,
  error,
  onHome,
}) {
  const [billing, setBilling] = useState(initialBilling)
  const billingOptions = getBillingOptions(isFoundingOfferActive())
  const selected = billingOptions.find((o) => o.id === billing)

  const activePromo = useActivePromo(PROMO_CODE)
  const [couponInput, setCouponInput] = useState('')
  const [couponStatus, setCouponStatus] = useState('idle') // 'idle' | 'checking' | 'valid' | 'invalid'
  const [couponMessage, setCouponMessage] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const stored = localStorage.getItem('elevate_coupon')
      if (stored) { localStorage.removeItem('elevate_coupon'); return JSON.parse(stored) }
    } catch {}
    return null
  })

  const isFree = appliedCoupon?.discount_percent === 100
  // A partial code used to render "30% off applied" while the page still showed
  // — and Stripe still charged — the full price. Show what will actually be
  // taken, from the same table the checkout is built from.
  const discountPercent = appliedCoupon && !isFree ? appliedCoupon.discount_percent : 0
  const discountedPrice = discountPercent
    ? formatMoney(billingChargeAmount(billing) * (1 - discountPercent / 100))
    : null
  const actionLabel = requiresAssessment
    ? 'Start Assessment'
    : isFree
    ? 'Claim Free Access'
    : 'Continue to Checkout'

  async function applyCoupon(rawCode = couponInput) {
    const code = String(rawCode).trim().toUpperCase()
    if (!code) return
    setCouponInput(code)
    setCouponStatus('checking')
    setCouponMessage('')

    // Date-aware: a seasonal code has a window, and the server decides whether
    // now is inside it. Reading discount_codes directly would ignore that.
    const { data } = await supabase.rpc('active_discount_code', { lookup_code: code }).maybeSingle()
    if (data) {
      setAppliedCoupon(data)
      setCouponStatus('valid')
      return
    }

    // Say why. A September code tried in August is not the same thing as a
    // typo, and "invalid code" for a real code is a support message waiting to
    // happen.
    const { data: known } = await supabase.rpc('discount_code_window', { lookup_code: code }).maybeSingle()
    if (known?.valid_from || known?.valid_until) {
      const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      const from = known.valid_from ? fmt(known.valid_from) : null
      // valid_until is exclusive, so the last usable day is the day before.
      const until = known.valid_until ? fmt(new Date(new Date(known.valid_until).getTime() - 86400000)) : null
      setCouponMessage(
        from && until ? `${code} is valid ${from} to ${until}.`
          : from ? `${code} starts on ${from}.`
          : `${code} expired after ${until}.`,
      )
    }
    setCouponStatus('invalid')
  }

  function removeCoupon() {
    setCouponMessage('')
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponStatus('idle')
  }

  return (
    <main className="relative min-h-screen bg-bg px-4 py-5 text-body sm:px-6 sm:py-6 lg:px-8">
      {isVerifyingPayment ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/90 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-accent/30 bg-card p-8 text-center shadow-2xl">
            <p className="font-heading text-3xl uppercase leading-none text-white">Verifying Payment</p>
            <p className="mt-3 text-sm leading-6 text-body">
              Confirming your payment with Stripe. This usually takes a few seconds.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-3 w-3 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-lg uppercase text-accent">Elevate Health and Fitness</p>
            <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl sm:text-6xl">
              6-Month Transformation
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-body">
              We believe healthy living should feel achievable and affordable. Choose the payment option that works best for you.
              {requiresAssessment ? ' Your assessment comes next so the program can be built around you.' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-[#111] px-4 font-heading text-lg uppercase text-white transition hover:border-accent sm:w-auto"
          >
            <ArrowLeft size={18} />
            Home
          </button>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {billingOptions.map((option) => {
            const isActive = billing === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setBilling(option.id)}
                className={`relative flex flex-col rounded-lg border p-5 text-left transition ${
                  isActive ? 'border-accent bg-accent/10' : 'border-line bg-card hover:border-accent/40'
                }`}
              >
                {option.badge ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 font-heading text-xs uppercase text-black">
                    {option.badge}
                  </span>
                ) : (
                  <span className="mb-3 block h-[26px]" />
                )}
                <p className="font-heading text-xl uppercase text-white">{option.label}</p>
                <p className="mt-2 font-heading text-4xl uppercase leading-none text-white">
                  {option.originalPrice ? (
                    <span className="mr-2 align-middle font-body text-lg normal-case text-body/50 line-through">
                      {option.originalPrice}
                    </span>
                  ) : null}
                  {option.price}
                  <span className="ml-1 align-middle font-body text-sm normal-case text-body">{option.cadence}</span>
                </p>
                <p className="mt-2 text-sm text-accent">{option.highlight}</p>
                <p className="mt-1 text-sm leading-6 text-body">{option.description}</p>
                {isActive ? <CheckCircle2 className="absolute right-4 top-4 text-accent" size={20} /> : null}
              </button>
            )
          })}
        </section>

        <section className="rounded-lg border border-accent/30 bg-accent/10 p-5">
          {error ? (
            <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
          ) : null}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-2xl uppercase text-white">
                {selected.label}:{' '}
                {isFree ? (
                  <>
                    <span className="text-accent">FREE</span>
                    <span className="ml-2 font-body text-base normal-case line-through text-body/50">{selected.price}</span>
                  </>
                ) : (
                  <span className="text-accent">
                    {discountedPrice || selected.price}
                    <span className="font-body text-base normal-case text-body"> {selected.cadence}</span>
                    {(discountedPrice || selected.originalPrice) ? (
                      <span className="ml-2 font-body text-base normal-case text-body/50 line-through">
                        {discountedPrice ? selected.price : selected.originalPrice}
                      </span>
                    ) : null}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-body">
                {requiresAssessment
                  ? 'Select your option now. After the assessment and account step, you will return here to complete secure checkout.'
                  : isFree
                  ? 'Your coupon covers the full cost. No payment info required.'
                  : 'Stripe handles payment securely. Your program generates immediately after confirmation.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (requiresAssessment) {
                  if (appliedCoupon) {
                    try { localStorage.setItem('elevate_coupon', JSON.stringify(appliedCoupon)) } catch {}
                  }
                  onStartAssessment?.(billing)
                } else {
                  onCheckout?.(billing, appliedCoupon)
                }
              }}
              disabled={isLoading}
              className="min-h-13 w-full shrink-0 rounded-lg bg-accent px-8 font-heading text-xl uppercase text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? 'Working' : actionLabel}
            </button>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            {activePromo && !appliedCoupon ? (
              <button
                type="button"
                onClick={() => applyCoupon(activePromo.code)}
                disabled={couponStatus === 'checking'}
                className="mb-3 flex w-full items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-left transition hover:border-accent disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block font-heading text-base uppercase text-accent">
                    {PROMO_NAME} — {activePromo.discount_percent}% off
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-body">
                    Code {activePromo.code}
                    {promoLastDay(activePromo.valid_until)
                      ? `, through ${promoLastDay(activePromo.valid_until)}`
                      : ''}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg border border-accent/60 px-3 py-1.5 font-heading text-sm uppercase text-accent">
                  Apply
                </span>
              </button>
            ) : null}
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/5 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={15} className="text-accent" />
                  <span className="font-heading uppercase text-accent">{appliedCoupon.code}</span>
                  <span className="text-body">— {appliedCoupon.discount_percent}% off applied</span>
                </div>
                <button type="button" onClick={removeCoupon} className="text-body transition hover:text-white">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus('idle') }}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                  placeholder="Coupon code"
                  className="flex-1 rounded-lg border border-line bg-[#111] px-4 py-2.5 font-heading text-sm uppercase text-white outline-none transition placeholder:normal-case placeholder:text-[#666] focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => applyCoupon()}
                  disabled={!couponInput.trim() || couponStatus === 'checking'}
                  className="rounded-lg border border-line bg-[#111] px-4 font-heading text-sm uppercase text-white transition hover:border-accent disabled:opacity-50"
                >
                  {couponStatus === 'checking' ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponStatus === 'invalid' ? (
              <p className="mt-1.5 text-xs text-red-300">
                {/* A real code outside its dates says so; only a genuinely
                    unknown code falls back to the generic line. */}
                {couponMessage || 'Invalid or expired coupon code.'}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-card p-5">
            <h2 className="font-heading text-3xl uppercase text-white">What's Included</h2>
            <ul className="mt-4 grid gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm leading-6 text-body">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={18} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-card p-5">
            <h2 className="font-heading text-3xl uppercase text-white">Why 6 Months</h2>
            <p className="mt-3 text-sm leading-7 text-body">
              This is Lifestyle Transformation Coaching, not a 4-week challenge. Most people quit too early because they're missing accountability and real lifestyle coaching, not just a plan.
            </p>
            <ul className="mt-4 grid gap-3">
              {whyItWorks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-body">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={18} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-8 rounded-lg border border-line bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-accent" size={24} />
            <div>
              <h2 className="font-heading text-3xl uppercase text-white">After 6 Months</h2>
              <p className="mt-1 font-heading text-lg uppercase text-accent">Lifestyle Maintenance Coaching</p>
              <p className="mt-3 text-sm leading-7 text-body">
                Continue your momentum with ongoing accountability and maintenance coaching at{' '}
                <span className="text-white">$150/month.</span> Perfect for staying on track, maintaining your results, and long-term support.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
