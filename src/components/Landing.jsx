import { useState } from 'react'
import CinematicLandingHero from './ui/CinematicLandingHero.jsx'
import PromoBanner from './PromoBanner.jsx'
import { ArrowRight, BadgeDollarSign, CheckCircle2, Clock, ExternalLink, Handshake, HeartPulse, Link2, LogIn, Mail, Quote, ShieldCheck, Sparkles, Target, Users } from 'lucide-react'
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

const PARTNER_SERVICES = [
  'Physiotherapy',
  'Chiropractic Care',
  'Registered Massage Therapy (RMT)',
  'Acupuncture',
  'Fascial Stretch Therapy (FST)',
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

export default function Landing({ user, hasProgram, onStart, onApply, onPricing, onDashboard, onLogin, onSignOut, onAdmin }) {
  const appSettings = useAppSettings()
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const isSameerActive = testimonialIndex === 0
  const isJacquieActive = testimonialIndex === 1
  const isJasonActive = testimonialIndex === 2
  const isVictoriaActive = testimonialIndex === 3

  const showPreviousTestimonial = () => {
    setTestimonialIndex((currentIndex) => (currentIndex + 3) % 4)
  }

  const showNextTestimonial = () => {
    setTestimonialIndex((currentIndex) => (currentIndex + 1) % 4)
  }

  return (
    <main className="min-h-screen bg-bg text-body">
      <PromoBanner onPricing={onPricing} />
      <CinematicLandingHero
        user={user}
        hasProgram={hasProgram}
        onStart={onStart}
        onApply={onApply}
        onPricing={onPricing}
        onDashboard={onDashboard}
        onLogin={onLogin}
        onSignOut={onSignOut}
      />

      {/* Free 7-Day Kickstart lead-capture CTA */}
      <section className="border-y border-accent/30 bg-gradient-to-br from-[#14160a] via-[#0b0b0b] to-[#14160a] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-heading text-sm uppercase text-accent">
            🔥 Free 7-Day Kickstart
          </span>
          <h2 className="font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
            Try Elevate free for 7 days
          </h2>
          <p className="max-w-2xl text-base leading-7 text-body sm:text-lg">
            Apply for your FREE 7-Day Elevate Kickstart. Tell us your goal and Lindsay will personally reach
            out to build your macros, meal guide, and workout plan.
          </p>
          <button
            type="button"
            onClick={onApply}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-heading text-lg uppercase text-black transition hover:bg-white"
          >
            Apply Now
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

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
                  Start Assessment
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

      {/* Client testimonials */}
      <section className="relative overflow-hidden border-t border-white/10 bg-[#0b0b0b] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,255,71,0.1),transparent_26rem)]" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
            <Quote size={15} aria-hidden="true" />
            <span className="font-heading text-sm uppercase">Client Stories</span>
          </div>
          <h2 className="mt-5 font-heading text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">
            Real People. Real Progress.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-body sm:text-lg">
            Hear what the Elevate journey is helping clients build beyond the workout.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-3" aria-label="Testimonial navigation">
              <button
                type="button"
                onClick={showPreviousTestimonial}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl text-white transition hover:border-accent/60 hover:text-accent"
                aria-label="Previous testimonial"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setTestimonialIndex(0)}
                className={`h-2.5 rounded-full transition-all ${isSameerActive ? 'w-8 bg-accent' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
                aria-label="Show Sameer testimonial"
                aria-current={isSameerActive ? 'true' : undefined}
              />
              <button
                type="button"
                onClick={() => setTestimonialIndex(1)}
                className={`h-2.5 rounded-full transition-all ${isJacquieActive ? 'w-8 bg-accent' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
                aria-label="Show Jacquie testimonial"
                aria-current={isJacquieActive ? 'true' : undefined}
              />
              <button
                type="button"
                onClick={() => setTestimonialIndex(2)}
                className={`h-2.5 rounded-full transition-all ${isJasonActive ? 'w-8 bg-accent' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
                aria-label="Show Jason testimonial"
                aria-current={isJasonActive ? 'true' : undefined}
              />
              <button
                type="button"
                onClick={() => setTestimonialIndex(3)}
                className={`h-2.5 rounded-full transition-all ${isVictoriaActive ? 'w-8 bg-accent' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
                aria-label="Show Victoria testimonial"
                aria-current={isVictoriaActive ? 'true' : undefined}
              />
              <button
                type="button"
                onClick={showNextTestimonial}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl text-white transition hover:border-accent/60 hover:text-accent"
                aria-label="Next testimonial"
              >
                ›
              </button>
            </div>
            <p className="text-sm text-body">
              {isSameerActive ? '1 of 4 · Sameer' : isJacquieActive ? '2 of 4 · Jacquie' : isJasonActive ? '3 of 4 · Jason' : '4 of 4 · Victoria'}
            </p>
          </div>

          <div
            className="relative mt-6"
            onTouchStart={(event) => {
              event.currentTarget.dataset.touchStartX = String(event.touches[0].clientX)
            }}
            onTouchEnd={(event) => {
              const startX = Number(event.currentTarget.dataset.touchStartX)
              const endX = event.changedTouches[0].clientX
              if (Number.isFinite(startX) && Math.abs(startX - endX) > 50) {
                if (startX > endX) {
                  showNextTestimonial()
                } else {
                  showPreviousTestimonial()
                }
              }
            }}
          >
            {isSameerActive ? (
              <article key="sameer" className="mx-auto max-w-4xl">
                <figure className="rounded-2xl border border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/[0.04] p-6 text-left shadow-2xl shadow-black/40 sm:p-10">
                  <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="h-52 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-72 lg:h-[26rem] lg:p-2">
                      <img
                        src="/sameer-journey-2.webp"
                        alt="Sameer earlier in his Elevate journey"
                        loading="lazy"
                        className="h-full w-full object-cover object-top lg:object-contain"
                      />
                    </div>
                    <div className="h-52 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-72 lg:h-[26rem] lg:p-2">
                      <img
                        src="/sameer-journey-1.webp"
                        alt="Sameer during his Elevate journey"
                        loading="lazy"
                        className="h-full w-full object-cover object-top lg:object-contain"
                      />
                    </div>
                    <div className="h-52 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-72 lg:h-[26rem] lg:p-2">
                      <img
                        src="/sameer-journey-3.webp"
                        alt="Sameer progressing in his Elevate journey"
                        loading="lazy"
                        className="h-full w-full object-cover object-top lg:object-contain"
                      />
                    </div>
                  </div>
                  <p className="font-heading text-2xl uppercase text-accent sm:text-3xl">Sameer’s Elevate Journey</p>
                  <Quote size={38} className="mt-5 text-accent" aria-hidden="true" />
                  <blockquote className="mt-5 space-y-4 text-xl font-medium leading-9 text-white sm:text-2xl sm:leading-10">
                    <p>“I started my health and fitness journey in February 2024, and since then, I’ve continued to grow, learn, and become a better version of myself. This journey has changed more than just my appearance—it has helped me build consistency, discipline, and healthier habits.</p>
                    <p>I’m proud of how far I’ve come and excited to keep progressing. It’s been a journey, and I’m grateful to have kept showing up.”</p>
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-heading text-lg uppercase text-black">S</span>
                    <div>
                      <p className="font-heading text-xl uppercase text-white">Sameer</p>
                      <p className="text-sm text-body">Elevate client</p>
                    </div>
                  </figcaption>
                </figure>
              </article>
            ) : isJacquieActive ? (
              <article key="jacquie" className="mx-auto max-w-4xl">
                <figure className="rounded-2xl border border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/[0.04] p-6 text-left shadow-2xl shadow-black/40 sm:p-10">
                  <Quote size={38} className="text-accent" aria-hidden="true" />
                  <blockquote className="mt-5 text-xl font-medium leading-9 text-white sm:text-2xl sm:leading-10">
                    “This is the best thing I’ve done for myself in a long time! I’m learning to prioritize myself, create healthy routines, set boundaries, and stay focused without feeling overwhelmed. I’m so grateful I took this step and started my journey with Elevate!”
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-heading text-lg uppercase text-black">J</span>
                    <div>
                      <p className="font-heading text-xl uppercase text-white">Jacquie</p>
                      <p className="text-sm text-body">Elevate client</p>
                    </div>
                  </figcaption>
                </figure>
              </article>
            ) : isJasonActive ? (
              <article key="jason" className="mx-auto max-w-4xl">
                <figure className="rounded-2xl border border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/[0.04] p-6 text-left shadow-2xl shadow-black/40 sm:p-10">
                  <Quote size={38} className="text-accent" aria-hidden="true" />
                  <blockquote className="mt-5 space-y-4 text-xl font-medium leading-9 text-white sm:text-2xl sm:leading-10">
                    <p>“Elevate has been instrumental in my health journey. I am 50 years old and been working out for many years. I been eating clean-ish but could never lose the weight I thought I should.</p>
                    <p>After being guided and influenced by Elevate fitness, I went from 215lbs to 188lbs ripped with abs for the first time in my life.</p>
                    <p>Thank you Elevate for the education in helping me see food and fitness differently.”</p>
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-heading text-lg uppercase text-black">J</span>
                    <div>
                      <p className="font-heading text-xl uppercase text-white">Jason</p>
                      <p className="text-sm text-body">Elevate client</p>
                    </div>
                  </figcaption>
                </figure>
              </article>
            ) : (
              <article key="victoria" className="mx-auto max-w-4xl">
                <figure className="rounded-2xl border border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/[0.04] p-6 text-left shadow-2xl shadow-black/40 sm:p-10">
                  <Quote size={38} className="text-accent" aria-hidden="true" />
                  <blockquote className="mt-5 space-y-4 text-xl font-medium leading-9 text-white sm:text-2xl sm:leading-10">
                    <p>“Since joining Elevate, I’ve really enjoyed working out and have noticed a big difference in my overall fitness. With consistency, I’ve gotten stronger and more confident in my abilities.</p>
                    <p>I also have more energy, and seeing my results motivates me to keep going. The workouts and food recommendations are personalized to my needs, and I truly appreciate the guidance and encouragement along the way. I’m very happy with my progress and would definitely recommend Elevate to anyone looking to get stronger and improve their fitness.”</p>
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-heading text-lg uppercase text-black">V</span>
                    <div>
                      <p className="font-heading text-xl uppercase text-white">Victoria</p>
                      <p className="text-sm text-body">Elevate client</p>
                    </div>
                  </figcaption>
                </figure>
              </article>
            )}
          </div>
        </div>
      </section>

      {/* Trusted partner — Wellness Bliss Physiotherapy */}
      <section className="relative overflow-hidden border-t border-white/10 bg-[#0b0b0b] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.08),transparent_26rem),radial-gradient(circle_at_10%_90%,rgba(232,255,71,0.06),transparent_24rem)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div className="mx-auto w-full max-w-xs lg:mx-0">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black p-6 shadow-2xl shadow-black/60">
              <img
                src="/wellness-bliss-physio.jpeg"
                alt="Wellness Bliss Physiotherapy logo"
                loading="lazy"
                className="mx-auto w-full max-w-[240px] object-contain"
              />
            </div>
          </div>

          {/* min-w-0 lets this grid column shrink: "Physiotherapy" is one
              unbreakable word, and without it the column takes the word's full
              width and the section clips it on phones. */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Handshake size={15} />
              <span className="font-heading text-sm uppercase">Trusted Partner</span>
            </div>
            <h2 className="mt-5 break-words font-heading text-[2rem] uppercase leading-none text-white sm:text-5xl lg:text-6xl">
              Wellness Bliss Physiotherapy
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-body sm:text-lg">
              <p>
                At Elevate Health &amp; Fitness, we believe that fitness, recovery, and overall wellness go
                hand in hand. That&apos;s why we&apos;re proud to partner with Wellness Bliss Physiotherapy, a
                trusted provider dedicated to helping individuals move better, recover faster, and live
                healthier lives.
              </p>
              <p>
                Their experienced team offers a wide range of services, including Physiotherapy, Chiropractic
                Care, Registered Massage Therapy (RMT), Acupuncture, and Fascial Stretch Therapy (FST).
                Whether you&apos;re recovering from an injury, managing pain, improving mobility, or enhancing
                athletic performance, Wellness Bliss Physiotherapy provides personalized care to help you
                achieve your goals.
              </p>
              <p>
                Together, we&apos;re committed to supporting your health journey, from rehabilitation and
                recovery to strength, performance, and long-term wellness.
              </p>
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {PARTNER_SERVICES.map((service) => (
                <li
                  key={service}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-body"
                >
                  {service}
                </li>
              ))}
            </ul>

            {/* Outlined rather than solid: a partner link should not outrank
                Lindsay's own trial and signup calls to action on this page. */}
            <a
              href="https://wellnessblissphysio.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-accent/70 bg-black/35 px-6 font-heading text-xl uppercase text-white transition hover:border-accent hover:bg-accent/10 sm:w-auto"
            >
              Visit Wellness Bliss
              <ExternalLink size={20} />
            </a>
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
