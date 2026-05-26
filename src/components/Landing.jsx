import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

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
      <section className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(232,255,71,0.12),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_24rem)]" />

        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <img
                src="/ehw-logo.jpeg"
                alt="Elevate Health and Wellness"
                className="h-12 w-12 rounded-lg border border-line object-cover sm:h-14 sm:w-14"
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
                  className="rounded-lg border border-line bg-[#111] px-4 py-2 font-heading text-lg uppercase text-white transition hover:border-accent"
                >
                  Dashboard
                </button>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="rounded-lg border border-line bg-[#111] px-4 py-2 font-heading text-lg uppercase text-white transition hover:border-accent"
                >
                  Sign Out
                </button>
              ) : null}
            </div>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                <Sparkles size={15} />
                <span className="font-heading text-sm uppercase">Your member dashboard</span>
              </div>
              <h1 className="max-w-4xl font-heading text-5xl uppercase leading-none text-white sm:text-7xl lg:text-8xl">
                Welcome{user?.name ? `, ${user.name}` : ''}.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-body sm:text-lg">
                This is your private Elevate dashboard. Start with the questionnaire so Elevate can build your personalized eight week workout, meal, recovery, and progress plan.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-body sm:text-lg">
                Once your plan is generated, it stays saved here for the full eight weeks so you can return to your workouts and guidance every time you log in.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {hasProgram ? (
                  <button
                    type="button"
                    onClick={onDashboard}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 py-3 font-heading text-xl uppercase text-black transition hover:brightness-95 sm:w-auto"
                  >
                    Open My Dashboard
                    <ArrowRight size={20} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStart}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 py-3 font-heading text-xl uppercase text-black transition hover:brightness-95 sm:w-auto"
                  >
                    Start Questionnaire
                    <ArrowRight size={20} />
                  </button>
                )}
                {user ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex min-h-13 w-full items-center justify-center rounded-lg border border-line bg-[#111] px-6 py-3 font-heading text-xl uppercase text-white transition hover:border-accent sm:hidden"
                  >
                    Sign Out
                  </button>
                ) : null}
              </div>
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
