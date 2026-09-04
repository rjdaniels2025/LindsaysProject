import { Lock, Check, ArrowLeft } from 'lucide-react'

const kept = [
  'Your full training program',
  'Every workout you logged',
  'Your macro targets and progress',
  'Your whole coaching chat history',
]

export default function TrialEnded({ name, onSubscribe, onSignOut, onHome }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-8 text-body">
      <div className="w-full max-w-md rounded-lg border border-line bg-card p-6 shadow-2xl shadow-black/50 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent/10 text-accent">
          <Lock size={22} />
        </div>

        <p className="mt-5 font-heading text-sm uppercase text-accent">Elevate Health &amp; Fitness</p>
        <h1 className="mt-1 font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
          Your 7 days are up
        </h1>
        <p className="mt-3 text-sm leading-6 text-body">
          {name ? `${name.split(' ')[0]}, your` : 'Your'} free Kickstart has ended, but nothing has
          been deleted. Everything is waiting exactly where you left it.
        </p>

        <ul className="mt-5 grid gap-2 rounded-lg border border-line bg-[#111] p-4">
          {kept.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-6 text-white">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-black">
                <Check size={12} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onSubscribe}
          className="mt-6 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white"
        >
          Continue my program
        </button>

        <button
          type="button"
          onClick={onHome}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 w-full text-center text-sm text-body transition hover:text-white"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
