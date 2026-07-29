// One place that decides whether a user is entitled to the app, so the paid
// path and the free-trial path can never drift apart.
//
// A paid membership stays active regardless of current_period_end: nothing
// advances that date after purchase today, so treating it as an expiry would
// lock out paying members. Only trials expire.

export const TRIAL_DAYS = 7

export function membershipAccess(row) {
  const status = row?.status || null
  const endsAt = row?.current_period_end ? new Date(row.current_period_end) : null
  const trialing = status === 'trialing'
  const expired = trialing && (!endsAt || endsAt.getTime() <= Date.now())

  let daysLeft = null
  if (trialing && endsAt) {
    daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000))
  }

  return {
    status,
    active: status === 'active' || (trialing && !expired),
    trialing: trialing && !expired,
    expired,
    daysLeft,
    endsAt,
  }
}
