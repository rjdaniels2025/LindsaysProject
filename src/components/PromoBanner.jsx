import { Tag, X } from 'lucide-react'
import { useState } from 'react'
import { useActivePromo } from '../hooks/useActivePromo.js'
import { PROMO_CODE, PROMO_DISMISS_KEY, PROMO_NAME, promoLastDay } from '../lib/promo.js'

// The promotion had been live in the database for a week with nobody using it,
// because nothing on the site said it existed — it only worked if you already
// knew the code. This is the part that tells people.
//
// It renders only while the server says the code is usable, so it needs no
// end date of its own and cannot advertise an expired offer.
export default function PromoBanner({ onPricing }) {
  const promo = useActivePromo(PROMO_CODE)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(PROMO_DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (!promo || dismissed) return null

  const lastDay = promoLastDay(promo.valid_until)

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(PROMO_DISMISS_KEY, '1')
    } catch {
      // A browser refusing storage is not a reason to keep the banner up.
    }
  }

  return (
    <div className="relative border-b border-accent/30 bg-accent/10 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 pr-8 text-center">
        <Tag size={15} className="shrink-0 text-accent" />
        <span className="font-heading text-base uppercase text-accent sm:text-lg">
          {PROMO_NAME} — {promo.discount_percent}% off
        </span>
        <span className="text-xs leading-5 text-body sm:text-sm">
          Use code <span className="font-heading uppercase text-white">{promo.code}</span>
          {lastDay ? ` at checkout, through ${lastDay}` : ' at checkout'}
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
        aria-label="Dismiss offer"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-body transition hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
