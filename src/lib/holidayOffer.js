// Elevate Into 2027 holiday special: $1,249 for the 6-Month Transformation
// (regularly $1,499), applied to the one-time pay-in-full option only.
// Registration closes at the end of December 31, 2026 (midnight Eastern), after
// which regular pricing resumes everywhere with no deploy.
//
// December is EST, UTC-5, so midnight Eastern on January 1 is 05:00Z. The
// founding offer used 04:00Z because its deadline fell in June, during EDT.
//
// NOTE: this controls only what's *displayed*. The actual amount charged is
// enforced server-side in supabase/functions/_shared/stripe.ts using the same
// cutoff, so the promo can't be claimed past the deadline by tampering with the
// client.
export const HOLIDAY_OFFER_ENDS_AT = new Date('2027-01-01T05:00:00Z')
export const HOLIDAY_PAY_IN_FULL_PRICE = '$1,249'
export const HOLIDAY_REGULAR_PRICE = '$1,499'
export const HOLIDAY_SAVING = '$250'
export const HOLIDAY_LAST_DAY = 'December 31'

export function isHolidayOfferActive(now = new Date()) {
  return now < HOLIDAY_OFFER_ENDS_AT
}
