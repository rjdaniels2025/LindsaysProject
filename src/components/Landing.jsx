import CinematicLandingHero from './ui/CinematicLandingHero.jsx'

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
    </main>
  )
}
