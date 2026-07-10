import CinematicLandingHero from './ui/CinematicLandingHero.jsx'
import { ArrowRight, BadgeDollarSign, CheckCircle2, Clock, HeartPulse, Link2, LogIn, Mail, ShieldCheck, Sparkles, Target, Users } from 'lucide-react'
import { isFoundingOfferActive } from '../lib/foundingOffer.js'
import { useAppSettings } from '../hooks/useAppSettings.js'
import { transformationImage } from '../assets/transformationImage.js'

const foundingOfferPerks = [
  'Personalized Accountability',
  'Meal Guidance',
  'Simple Workout Plans',
  'Lifestyle Coaching',
  'Ongoing Support',
]

const coachingPrinciples = [
  {
    Icon: HeartPulse,
    title: 'Sustainable habits',
    text: 'Simple workouts, realistic meal guidance, and routines designed around the life you already have.',
  },
  {
    Icon: ShieldCheck,
    title: 'Confidence first',
    text: 'A welcoming path for beginners and returning members who want structure without intimidation.',
  },
  {
    Icon: Target,
    title: 'Progress over perfection',
    text: 'Clear weekly actions that help you build momentum without chasing extreme diets or unrealistic goals.',
  },
]

export default function Landing({ user, hasProgram, onStart, onPricing, onDashboard, onLogin, onSignOut, onAdmin }) {
  const appSettings = useAppSettings()

  return (
    <main className="min-h-screen bg-bg text-body">
      <CinematicLandingHero
        user={user}
        hasProgram={hasProgram}
        onStart={onStart}
        onPricing={onPricing}
        onDashboard={onDashboard}
        onLogin={onLogin}
        onSignOut={onSignOut}
      />

      {isFoundingOfferActive() ? (
      <section className="relative overflow-hidden border-y border-accent/30 bg-gradient-to-br from-[#14160a] via-[#0b0b0b] to-[#14160a] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(232,255,71,0.16),transparent_22rem),radial-gradient(circle_at_88%_90%,rgba(232,255,71,0.1),transparent_22rem)]" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-accent">
              <Sparkles size={15} />
              <span className="font-heading text-sm uppercase">Founding Client Launch Offer</span>
            </div>
            <h2 className="mt-4 font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
              6 months of coaching for{' '}
              <span className="text-accent">just $999</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-body sm:text-lg">
              Be one of the first clients at Elevate Health &amp; Fitness and lock in founding-client
              pricing before spots fill.
            </p>
            <ul className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {foundingOfferPerks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-white sm:text-base">
                  <CheckCircle2 size={18} className="shrink-0 text-accent" aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-black/50 p-6 backdrop-blur-sm lg:items-center lg:text-center">
            <div className="flex items-center gap-2 text-accent">
              <Clock size={18} aria-hidden="true" />
              <span className="font-heading text-sm uppercase">Limited Time</span>
            </div>
            <p className="text-sm leading-6 text-body">
              Offer ends <span className="font-semibold text-white">June 30, 2026</span> - or when all
              founding spots are filled.
            </p>
            <button
              type="button"
              onClick={onPricing}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-heading text-base uppercase text-black transition hover:brightness-110"
            >
              Claim Your Founding Spot
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
      ) : null}

      <section className="relative overflow-hidden border-t border-white/10 bg-[#0b0b0b] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,255,71,0.1),transparent_24rem),radial-gradient(circle_at_84%_0%,rgba(255,255,255,0.06),transparent_28rem)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60">
              <img
                src="/coach-lindsay.jpeg"
                alt="Coach Lindsay standing in a boxing gym"
                className="aspect-[4/5] w-full object-cover object-[55%_center] sm:aspect-[5/4] lg:aspect-[4/5]"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-black/72 p-4 backdrop-blur-md sm:left-6 sm:right-auto sm:max-w-sm">
              <p className="font-heading text-3xl uppercase leading-none text-white">Coach Lindsay</p>
              <p className="mt-1 text-sm leading-6 text-body">Founder of Elevate Health & Fitness</p>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Users size={15} />
              <span className="font-heading text-sm uppercase">Meet Your Coach</span>
            </div>
            <h2 className="mt-5 font-heading text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">
              Built for everyday people ready to feel stronger.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-body sm:text-lg">
              <p>
                Hi, I&apos;m Lindsay a.k.a Dukes, founder of Elevate Health &amp; Fitness. I created this business to help everyday people build healthier lifestyles without extreme diets, intimidating gyms, or unrealistic expectations.
              </p>
              <p>
                I know how overwhelming starting a health journey can feel, which is why my coaching focuses on simple workouts, meal guidance, accountability, and sustainable habits that fit real life.
              </p>
              <p>
                My goal is to help women, men, and beginners feel stronger, healthier, and more confident, one step at a time.
              </p>
              <p>
                At Elevate Health &amp; Fitness, we focus on progress over perfection and creating lasting lifestyle changes that actually feel manageable.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {coachingPrinciples.map((principle) => {
                const Icon = principle.Icon

                return (
                  <div key={principle.title} className="rounded-lg border border-white/10 bg-black/35 p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                      <Icon size={19} />
                    </div>
                    <h3 className="mt-4 font-heading text-2xl uppercase leading-none text-white">{principle.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-body">{principle.text}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {!hasProgram && (
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 font-heading text-xl uppercase text-black transition hover:bg-white sm:w-auto"
                >
                  Start Your Assessment
                  <ArrowRight size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={onPricing}
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-accent/70 bg-black/35 px-6 font-heading text-xl uppercase text-white transition hover:border-accent hover:bg-accent/10 sm:w-auto"
              >
                Pricing
                <BadgeDollarSign size={20} />
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-accent/70 bg-black/35 px-6 font-heading text-xl uppercase text-white transition hover:border-accent hover:bg-accent/10 sm:w-auto"
              >
                Member Login
                <LogIn size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 bg-[#101010] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(232,255,71,0.08),transparent_24rem),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.05),transparent_28rem)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60">
            <img
              src={transformationImage}
              alt="Coach Lindsay transformation photo showing her journey from 2009 to 2026"
              className="w-full bg-black object-cover"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Sparkles size={15} />
              <span className="font-heading text-sm uppercase">Coach Lindsay</span>
            </div>
            <h2 className="mt-5 font-heading text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">
              My Transformation
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-body sm:text-lg">
              <p>This isn&apos;t about being perfect. It isn&apos;t about competing. It&apos;s about becoming stronger than I was yesterday.</p>
              <p>The photo on the left is where my journey began. The photo on the right is the result of consistency, discipline, balanced nutrition, and refusing to give up, even through setbacks.</p>
              <p>I didn&apos;t transform overnight. There were busy days, injuries, moments of doubt, and times when motivation was low. But I kept showing up.</p>
              <p>That journey is exactly why I created Elevate HnF.</p>
              <p>I know what it&apos;s like to feel overwhelmed, frustrated, or unsure where to start. My mission is to help everyday people build sustainable habits, gain confidence, lose body fat, build strength, and create a lifestyle they can maintain for years, not just a few weeks.</p>
              <p>You don&apos;t have to be perfect. You just have to start.</p>
              <p>If I can do it, so can you. I&apos;d love to help you become the strongest, healthiest version of yourself.</p>
              <p className="font-semibold text-white">Ready to transform your life? Let&apos;s do it together.</p>
              <p>Book your FREE consultation today and let&apos;s elevate your health, nutrition, and fitness.</p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {!hasProgram && (
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 font-heading text-xl uppercase text-black transition hover:bg-white sm:w-auto"
                >
                  Book Your Free Consultation
                  <ArrowRight size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={onPricing}
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-accent/70 bg-black/35 px-6 font-heading text-xl uppercase text-white transition hover:border-accent hover:bg-accent/10 sm:w-auto"
              >
                View Coaching Options
                <BadgeDollarSign size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-[#0b0b0b] px-4 py-4 text-center">
        <p className="mb-2 text-xs text-body/50">Powered by AI based on Coach Lindsay&apos;s personal transformation methods</p>
        {appSettings && (
          <div className="mb-3 flex items-center justify-center gap-4">
            <a
              href={appSettings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-body/50 transition hover:text-body/80"
            >
              <Link2 size={14} />
              Instagram
            </a>
            <a
              href={`mailto:${appSettings.contact_email}`}
              className="inline-flex items-center gap-1.5 text-xs text-body/50 transition hover:text-body/80"
            >
              <Mail size={14} />
              {appSettings.contact_email}
            </a>
          </div>
        )}
        <button
          type="button"
          onClick={onAdmin}
          className="text-xs text-body/30 transition hover:text-body/60"
        >
          Admin
        </button>
      </footer>
    </main>
  )
}
