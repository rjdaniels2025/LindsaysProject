// Founding-client launch offer: $999 for the 6-Month Transformation (regularly $1,500),
// applied to the one-time pay-in-full option only. The offer auto-expires at the end of
// June 30, 2026 (midnight Eastern), after which regular pricing resumes everywhere.
//
// NOTE: this controls only what's *displayed*. The actual amount charged is enforced
// server-side in supabase/functions/_shared/stripe.ts using the same cutoff, so the
// promo can't be claimed past the deadline by tampering with the client.
export const FOUNDING_OFFER_ENDS_AT = new Date('2026-07-01T04:00:00Z')
export const FOUNDING_PAY_IN_FULL_PRICE = '$999'

export function isFoundingOfferActive(now = new Date()) {
  return now < FOUNDING_OFFER_ENDS_AT
}
