import { CheckCircle2 } from 'lucide-react'
import CinematicLandingHero from './ui/CinematicLandingHero.jsx'

const offers = [
  'Beginner friendly fitness coaching',
  'Simple workout plans',
  'Meal guidance and nutrition support',
  'Accountability and motivation',
  'Lifestyle focused wellness coaching',
  'Affordable programs designed for real life',
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

      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(232,255,71,0.10),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_24rem)]" />
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-heading text-lg uppercase text-accent">Progress over perfection</p>
              <h2 className="mt-2 font-heading text-5xl uppercase leading-none text-white sm:text-7xl">
                Real structure for real life.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-body sm:text-lg">
                Start with the questionnaire, choose the membership that fits, then use your private dashboard to follow the plan, check in, and keep momentum.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-card p-4 shadow-2xl shadow-black/40 sm:p-5">
              <p className="font-heading text-3xl uppercase text-white">We offer</p>
              <div className="mt-4 grid gap-3">
                {offers.map((offer) => (
                  <div key={offer} className="flex items-start gap-3 rounded-lg border border-line bg-[#111] p-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={20} />
                    <p className="leading-6 text-body">{offer}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-accent/30 bg-accent/10 p-4">
                <p className="font-heading text-2xl uppercase text-white">Progress over perfection</p>
                <p className="mt-2 leading-7 text-body">
                  At Elevate Health and Wellness, it is not about perfection, it is about progress, consistency, and becoming the strongest, healthiest version of yourself.
                </p>
                <p className="mt-4 leading-7 text-body">
                  No extreme diets. No intimidation. Just real support, real results, and a community that wants to see you win.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
