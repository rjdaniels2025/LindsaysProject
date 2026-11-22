import { Gift, X } from 'lucide-react'
import { useState } from 'react'
import { HOLIDAY_LAST_DAY, HOLIDAY_SAVING, isHolidayOfferActive } from '../lib/holidayOffer.js'

// Top announcement bar for the Elevate Into 2027 holiday special.
//
// PromoBanner is the same idea for percentage codes and reads the database to
// decide whether its code is live. This offer is not a code -- it is a straight
// swap of the pay-in-full price -- so there is no row to read and the date
// window is the whole condition. It stops rendering on January 1 by itself.
const DISMISS_KEY = 'elevate_holiday_2027_dismissed'

export default function HolidayBanner({ onPricing }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (!isHolidayOfferActive() || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // A browser refusing storage is not a reason to keep the banner up.
    }
  }

  return (
    <div className="relative border-b border-accent/30 bg-accent/10 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 pr-8 text-center">
        <Gift size={15} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="font-heading text-base uppercase text-accent sm:text-lg">
          Holiday Special: Save {HOLIDAY_SAVING} on 6-Month Coaching
        </span>
        <span className="text-xs leading-5 text-body sm:text-sm">
          Register by {HOLIDAY_LAST_DAY}
        </span>
        {onPricing ? (
          <button
            type="button"
            onClick={onPricing}
            className="rounded-full border border-accent/60 px-3 py-0.5 font-heading text-xs uppercase text-accent transition hover:bg-accent hover:text-black sm:text-sm"
          >
            See Pricing
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss holiday offer"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-body transition hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
