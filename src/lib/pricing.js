// Billing options for the 6-Month Transformation, and what each one actually
// charges. Kept out of PricingPage.jsx so both the page and purchase tracking
// read the same numbers: a second copy of these prices would drift, and the
// symptom would be ad reporting quietly disagreeing with Stripe.
import { isFoundingOfferActive, FOUNDING_PAY_IN_FULL_PRICE } from './foundingOffer.js'
import {
  isHolidayOfferActive,
  HOLIDAY_LAST_DAY,
  HOLIDAY_PAY_IN_FULL_PRICE,
  HOLIDAY_SAVING,
} from './holidayOffer.js'

const baseBillingOptions = [
  {
    id: 'pay-in-full',
    label: 'Pay in Full',
    price: '$1,499',
    cadence: 'CAD upfront',
    badge: 'Best Value',
    highlight: 'Save $151 compared to monthly',
    description: 'One payment. Full 6-month access. No ongoing charges.',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$275',
    cadence: '/month for 6 months',
    badge: null,
    highlight: '$1,650 total',
    description: 'Spread your investment across 6 monthly payments.',
  },
  {
    id: 'biweekly',
    label: 'Biweekly',
    price: '$140',
    cadence: 'biweekly for 6 months',
    badge: null,
    highlight: 'Most flexible',
    description: 'Smaller payments that fit any schedule and budget.',
  },
]

// Both promotions discount the one-time pay-in-full price and nothing else.
// Outside their windows this returns the regular options unchanged, so the
// offers end on their own with no deploy.
//
// Callers pass nothing and get today's pricing. The flags exist so a caller can
// ask what pricing looked like, or would look like, at another moment -- which
// is how the date behaviour is tested without touching the system clock.
export function getBillingOptions(
  foundingActive = isFoundingOfferActive(),
  holidayActive = isHolidayOfferActive(),
) {
  // Founding first: it is the older and deeper discount, so if the two windows
  // ever overlapped nobody would be charged the higher of the two.
  const promo = foundingActive
    ? {
        price: FOUNDING_PAY_IN_FULL_PRICE,
        badge: 'Founding Offer',
        highlight: 'Save $500, ends June 30',
        description: 'Founding-client launch price. One payment, full 6-month access.',
      }
    : holidayActive
      ? {
          price: HOLIDAY_PAY_IN_FULL_PRICE,
          badge: 'Holiday Special',
          highlight: `Save ${HOLIDAY_SAVING}, register by ${HOLIDAY_LAST_DAY}`,
          description: 'Elevate Into 2027 holiday price. One payment, full 6-month access.',
        }
      : null

  if (!promo) return baseBillingOptions
  return baseBillingOptions.map((option) =>
    option.id === 'pay-in-full' ? { ...option, ...promo, originalPrice: option.price } : option,
  )
}

// What the member is actually charged for a billing choice, as a number.
// Exported so purchase tracking reports the real amount and reads it from the
// same table the page displays — a second copy of these prices would drift and
// quietly misreport ad revenue.
export function billingChargeAmount(billingId, now = new Date()) {
  const option = getBillingOptions(isFoundingOfferActive(now), isHolidayOfferActive(now))
    .find((o) => o.id === billingId)
  if (!option) return null
  const amount = Number.parseFloat(String(option.price).replace(/[^0-9.]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

// Renders an amount the way the billing table does, so a discounted figure sits
// beside the list price without looking like it came from somewhere else.
export function formatMoney(amount) {
  if (!Number.isFinite(amount)) return null
  const rounded = Math.round(amount * 100) / 100
  const whole = Number.isInteger(rounded)
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}
