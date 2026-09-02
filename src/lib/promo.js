// The September Reset promotion.
//
// The code, the percentage and the dates all live in the discount_codes row —
// this file only says which code is currently being advertised and what to call
// it. Every promo surface reads active_discount_code(), which returns nothing
// outside the row's window, so the banner and the pricing callout disappear on
// their own on October 1 with no deploy and nothing to remember.
//
// To run a different promotion later, change these two values and set up the
// matching row; to end this one early, switch is_active off in the database.
export const PROMO_CODE = 'REST30'
export const PROMO_NAME = 'September Reset'

// Dismissal is per-code, so a future promo is not silently hidden from someone
// who dismissed this one.
export const PROMO_DISMISS_KEY = `elevate_promo_dismissed_${PROMO_CODE}`

// valid_until is exclusive — the row ends at midnight on October 1, and the last
// usable day is September 30. Shown to members, so it must say the 30th.
export function promoLastDay(validUntil) {
  if (!validUntil) return null
  const end = new Date(new Date(validUntil).getTime() - 86400000)
  return end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
