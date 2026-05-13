import { ArrowRight, CheckCircle2, HeartPulse, Sparkles } from 'lucide-react'

const offers = [
  'Beginner friendly fitness coaching',
  'Simple workout plans',
  'Meal guidance and nutrition support',
  'Accountability and motivation',
  'Lifestyle focused wellness coaching',
  'Affordable programs designed for real life',
]

export default function Landing({ onStart }) {
  return (
    <main className="min-h-screen bg-bg text-body">
      <section className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(232,255,71,0.12),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_24rem)]" />

        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-accent text-black">
                <HeartPulse size={21} />
              </div>
              <div>
                <p className="font-heading text-2xl uppercase leading-none text-white">Elevate</p>
                <p className="text-xs uppercase tracking-[0.18em] text-body">Health and Fitness</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="hidden rounded-lg border border-line bg-[#111] px-4 py-2 font-heading text-lg uppercase text-white transition hover:border-accent sm:inline-flex"
            >
              Start
            </button>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                <Sparkles size={15} />
                <span className="font-heading text-sm uppercase">Real support. Real progress.</span>
              </div>
              <h1 className="max-w-4xl font-heading text-5xl uppercase leading-none text-white sm:text-7xl lg:text-8xl">
                Welcome to Elevate Health and Fitness
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-body sm:text-lg">
                At Elevate Health and Fitness, our mission is simple, helping real people build healthier lifestyles in a realistic, supportive, and sustainable way.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-body sm:text-lg">
                We believe fitness should feel empowering, not overwhelming. Whether you are just starting your journey, getting back on track, or looking for accountability and guidance, we are here to help you elevate your health one step at a time.
              </p>
              <button
                type="button"
                onClick={onStart}
                className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-accent px-6 py-3 font-heading text-xl uppercase text-black transition hover:brightness-95 sm:w-auto"
              >
                Build My Plan
                <ArrowRight size={20} />
              </button>
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
                  At Elevate Health and Fitness, it is not about perfection, it is about progress, consistency, and becoming the strongest, healthiest version of yourself.
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
