import CinematicLandingHero from './ui/CinematicLandingHero.jsx'
import { ArrowRight, HeartPulse, ShieldCheck, Target, Users } from 'lucide-react'

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

export default function Landing({ user, hasProgram, onStart, onDashboard, onSignOut }) {
  return (
    <main className="min-h-screen bg-bg text-body">
      <header className="fixed left-0 right-0 top-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-2 pr-4 backdrop-blur-md">
            <img
              src="/ehw-logo.jpeg"
              alt="Elevate Health and Wellness"
              className="h-10 w-10 rounded-lg border border-line object-cover sm:h-12 sm:w-12"
            />
            <div>
              <p className="font-heading text-2xl uppercase leading-none text-white">Elevate</p>
              <p className="text-xs uppercase tracking-[0.18em] text-body">Health and Wellness</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {hasProgram ? (
              <button
                type="button"
                onClick={onDashboard}
                className="min-h-11 rounded-lg border border-white/10 bg-black/40 px-4 font-heading text-lg uppercase text-white backdrop-blur-md transition hover:border-accent"
              >
                Dashboard
              </button>
            ) : null}
            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-11 rounded-lg border border-white/10 bg-black/40 px-4 font-heading text-lg uppercase text-white backdrop-blur-md transition hover:border-accent"
              >
                Sign Out
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <CinematicLandingHero user={user} hasProgram={hasProgram} onStart={onStart} onDashboard={onDashboard} />

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
                Hi, I&apos;m Lindsay, founder of Elevate Health &amp; Fitness. I created this business to help everyday people build healthier lifestyles without extreme diets, intimidating gyms, or unrealistic expectations.
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

            <button
              type="button"
              onClick={hasProgram ? onDashboard : onStart}
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 font-heading text-xl uppercase text-black transition hover:bg-white sm:w-auto"
            >
              {hasProgram ? 'Open Dashboard' : 'Start Your Assessment'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
