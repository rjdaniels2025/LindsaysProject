import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { track } from '../lib/pixel.js'

const included = [
  'Personalized macro targets',
  '7-day meal guide',
  'Workout plan',
  'Daily accountability',
  'Access to the Elevate community',
  'Coach support',
]

const defaultForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  fitnessGoal: '',
  biggestChallenge: '',
  trackedMacros: '',
  company: '', // honeypot — must stay empty
}

function inputClass(hasError) {
  return `w-full rounded-lg border bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent ${
    hasError ? 'border-red-400' : 'border-line'
  }`
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-heading text-lg uppercase text-white">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-sm text-red-300">{error}</span> : null}
    </label>
  )
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Please enter a valid email.'
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.'
  if (!form.phone.trim()) errors.phone = 'Please enter a phone number.'
  if (!form.fitnessGoal.trim()) errors.fitnessGoal = 'Tell us your main goal.'
  if (!form.trackedMacros) errors.trackedMacros = 'Please choose one.'
  return errors
}

export default function TrialApplication({ onBack, onAuthenticated }) {
  const [form, setForm] = useState(defaultForm)
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const errors = validate(form)

  function setValue(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')
    setTouched({ name: true, email: true, password: true, phone: true, fitnessGoal: true, trackedMacros: true })
    if (Object.keys(errors).length > 0) return

    if (!supabase) {
      setServerError('Sign-up is not available right now. Please email us instead.')
      return
    }

    setSubmitting(true)
    try {
      // One call creates the account (already confirmed), starts the 7 days,
      // records the lead for Lindsay and sends both emails.
      const { data, error } = await supabase.functions.invoke('start-trial', {
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          fitnessGoal: form.fitnessGoal,
          biggestChallenge: form.biggestChallenge,
          trackedMacros: form.trackedMacros, // 'yes' | 'no'
          company: form.company,
        },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)

      // The free funnel's conversion. Lead is what ad reporting is usually read
      // against; StartTrial is Meta's own event for this, so campaigns can
      // optimise for it directly. Sent with no name, email, or phone.
      track('Lead')
      track('StartTrial')

      // Deliberately no localStorage profile draft here: a partial draft would
      // make routeForState treat the assessment as done and generate a program
      // from three fields. They take the real assessment, same as anyone else.
      const signIn = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (signIn.error) throw new Error(signIn.error.message)

      // Hands off to App, which routes them into the assessment exactly as it
      // does for a paid signup.
      await onAuthenticated?.()
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-6 text-body sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 font-heading text-sm uppercase text-body transition hover:text-accent"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Headline */}
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-5 sm:p-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-heading text-sm uppercase text-accent">
            🔥 Free 7-Day Kickstart
          </span>
          <h1 className="mt-3 font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
            Apply for your FREE 7-Day Elevate Kickstart
          </h1>
          <p className="mt-3 text-sm leading-6 text-body">
            Create your account and get full access for 7 days, with the same program, dashboard and
            coaching a paying member gets. No card required, and it doesn&apos;t auto-charge.
          </p>
        </div>

        {/* What's included */}
        <section className="mt-4 rounded-lg border border-line bg-card p-5 sm:p-6">
          <p className="font-heading text-sm uppercase text-accent">What's included</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-6 text-white">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-black">
                  <Check size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 rounded-lg border border-line bg-card p-5 sm:p-6">
          <Field label="Name" error={touched.name && errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setValue('name', e.target.value)}
              placeholder="Your full name"
              className={inputClass(touched.name && errors.name)}
            />
          </Field>

          <Field label="Email" error={touched.email && errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setValue('email', e.target.value)}
              placeholder="you@email.com"
              className={inputClass(touched.email && errors.email)}
            />
          </Field>

          <Field label="Create a password" error={touched.password && errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setValue('password', e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className={inputClass(touched.password && errors.password)}
            />
          </Field>

          <Field label="Phone number" error={touched.phone && errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setValue('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass(touched.phone && errors.phone)}
            />
          </Field>

          <Field label="Fitness goal" error={touched.fitnessGoal && errors.fitnessGoal}>
            <input
              type="text"
              value={form.fitnessGoal}
              onChange={(e) => setValue('fitnessGoal', e.target.value)}
              placeholder="e.g. Lose fat, build strength, feel healthier"
              className={inputClass(touched.fitnessGoal && errors.fitnessGoal)}
            />
          </Field>

          <Field label="Biggest challenge">
            <textarea
              value={form.biggestChallenge}
              onChange={(e) => setValue('biggestChallenge', e.target.value)}
              placeholder="What's been holding you back?"
              rows={3}
              className={inputClass(false)}
            />
          </Field>

          <Field label="Have you tracked macros before?" error={touched.trackedMacros && errors.trackedMacros}>
            <div className="grid grid-cols-2 gap-3">
              {['yes', 'no'].map((option) => {
                const selected = form.trackedMacros === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setValue('trackedMacros', option)}
                    className={`min-h-12 rounded-lg border px-4 py-3 font-heading text-lg uppercase transition ${
                      selected
                        ? 'border-accent bg-accent text-black'
                        : 'border-line bg-[#111] text-white hover:border-accent/70'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Honeypot — hidden from real users, catches bots */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(e) => setValue('company', e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          {serverError ? <p className="text-sm text-red-300">{serverError}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating your account…' : 'Start my free 7 days'}
          </button>
          <p className="text-center text-xs leading-5 text-body">
            No payment details needed. Your trial simply ends after 7 days, and nothing is charged
            automatically.
          </p>
        </form>

        <p className="mt-6 text-center text-sm leading-6 text-body">
          Love your results? Continue into the 30-Day September Health Reset and save 30%.
        </p>
      </div>
    </div>
  )
}
