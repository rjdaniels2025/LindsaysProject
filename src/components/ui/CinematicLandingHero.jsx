import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Repeat2,
  ShieldCheck,
  Utensils,
} from 'lucide-react'
import { gsap } from 'gsap'
import { cn } from '../../lib/utils.js'

const INJECTED_STYLES = `
  .elevate-film-grain {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50; opacity: 0.045; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .elevate-grid {
    background-size: 58px 58px;
    background-image:
      linear-gradient(to right, rgba(232,255,71,0.07) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
  }

  .elevate-text-accent {
    background: linear-gradient(180deg, #f7ff9a 0%, #e8ff47 45%, #7f8f16 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 16px 28px rgba(232,255,71,0.16));
  }

  .elevate-card {
    background:
      radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(232,255,71,0.13), transparent 34%),
      linear-gradient(145deg, #171a0b 0%, #0b0c08 42%, #050505 100%);
    box-shadow:
      0 42px 120px -28px rgba(0,0,0,0.95),
      0 18px 42px -18px rgba(232,255,71,0.28),
      inset 0 1px 2px rgba(255,255,255,0.18),
      inset 0 -2px 6px rgba(0,0,0,0.9);
    border: 1px solid rgba(232,255,71,0.12);
  }

  .elevate-card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(720px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.08) 0%, transparent 42%);
    mix-blend-mode: screen;
  }

  .elevate-phone {
    background-color: #101010;
    box-shadow:
      inset 0 0 0 2px #4a4a4a,
      inset 0 0 0 7px #000,
      0 42px 82px -18px rgba(0,0,0,0.9),
      0 16px 28px -8px rgba(0,0,0,0.72);
    transform-style: preserve-3d;
  }

  .elevate-hardware-btn {
    background: linear-gradient(90deg, #404040 0%, #171717 100%);
    box-shadow: -2px 0 5px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.15), inset 1px 0 2px rgba(0,0,0,0.8);
  }

  .elevate-screen-glare {
    background: linear-gradient(112deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 44%);
  }

  .elevate-widget {
    background: linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 100%);
    box-shadow: 0 12px 22px rgba(0,0,0,0.36), inset 0 1px 1px rgba(255,255,255,0.06), inset 0 -1px 1px rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.045);
  }

  .elevate-floating-badge {
    background: linear-gradient(135deg, rgba(18,18,18,0.72) 0%, rgba(255,255,255,0.025) 100%);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 0 0 1px rgba(232,255,71,0.12), 0 25px 50px -12px rgba(0,0,0,0.86), inset 0 1px 1px rgba(255,255,255,0.18);
  }

  .elevate-btn-primary, .elevate-btn-secondary {
    transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .elevate-btn-primary {
    background: linear-gradient(180deg, #f5ff7d 0%, #e8ff47 100%);
    color: #080808;
    box-shadow: 0 0 0 1px rgba(232,255,71,0.26), 0 16px 34px -10px rgba(232,255,71,0.38), inset 0 1px 1px rgba(255,255,255,0.7);
  }
  .elevate-btn-primary:hover { transform: translateY(-3px); }
  .elevate-btn-primary:active { transform: translateY(1px); }
  .elevate-btn-secondary {
    background: linear-gradient(180deg, #232323 0%, #111 100%);
    color: #fff;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.09), 0 12px 26px -10px rgba(0,0,0,0.92), inset 0 1px 1px rgba(255,255,255,0.12);
  }
  .elevate-btn-secondary:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(232,255,71,0.26), 0 18px 34px -12px rgba(0,0,0,1); }
  .elevate-btn-secondary:active { transform: translateY(1px); }

  .elevate-progress-ring {
    transform: rotate(-90deg);
    transform-origin: center;
    stroke-dasharray: 402;
    stroke-linecap: round;
  }
`

const stages = [
  {
    id: 'assessment',
    label: 'Assessment',
    Icon: ClipboardList,
    eyebrow: 'Start with the assessment',
    headline: 'Tell Elevate what real life looks like.',
    description: 'Goals, schedule, equipment, limitations, and experience become the foundation for a plan that actually fits.',
    phoneTitle: 'Assessment',
    metric: '12',
    metricLabel: 'Inputs',
    progress: 250,
    widgets: [
      { Icon: ClipboardList, label: 'Goals selected', detail: 'Strength, fat loss, consistency' },
      { Icon: Dumbbell, label: 'Equipment mapped', detail: 'Gym, home, or minimal setup' },
    ],
    badges: [
      { Icon: CheckCircle2, title: 'Profile ready', detail: 'Answers saved' },
      { Icon: ShieldCheck, title: 'Built for one person', detail: 'Personal details matter' },
    ],
  },
  {
    id: 'membership',
    label: 'Membership',
    Icon: CreditCard,
    eyebrow: 'Choose your support level',
    headline: 'Pick the membership that matches the outcome.',
    description: 'Starter keeps it simple, Transformation adds weekly adjustment, and Elite creates a higher-touch coaching path.',
    phoneTitle: 'Transformation',
    metric: '$199',
    metricLabel: 'Recommended',
    progress: 170,
    widgets: [
      { Icon: CreditCard, label: '6 month option', detail: 'Discounted upfront access' },
      { Icon: ShieldCheck, label: 'Private membership', detail: 'One account, one journey' },
    ],
    badges: [
      { Icon: Flame, title: 'Most popular', detail: 'Weekly support' },
      { Icon: CheckCircle2, title: 'Savings available', detail: 'Pay 6 months upfront' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    eyebrow: 'Unlock the dashboard',
    headline: 'Workouts, meals, and progress in one place.',
    description: 'The dashboard gives members a clear next step each time they log in, not a pile of disconnected advice.',
    phoneTitle: 'Today',
    metric: '84',
    metricLabel: 'Consistency',
    progress: 82,
    widgets: [
      { Icon: Dumbbell, label: 'Workout 03', detail: 'Sets, reps, rest, and cues' },
      { Icon: Utensils, label: 'Meal guidance', detail: 'Targets and simple options' },
    ],
    badges: [
      { Icon: CalendarCheck, title: 'Today planned', detail: 'Workout and meals' },
      { Icon: LayoutDashboard, title: 'Progress visible', detail: 'Dashboard saved' },
    ],
  },
  {
    id: 'accountability',
    label: 'Accountability',
    Icon: Repeat2,
    eyebrow: 'Stay in the loop',
    headline: 'Weekly check-ins keep the plan realistic.',
    description: 'Progress, soreness, energy, schedule changes, and missed workouts can guide the next adjustment.',
    phoneTitle: 'Check-in',
    metric: '7',
    metricLabel: 'Day streak',
    progress: 118,
    widgets: [
      { Icon: Activity, label: 'Recovery check', detail: 'Energy, soreness, sleep' },
      { Icon: Repeat2, label: 'Plan adjusted', detail: 'Next week stays doable' },
    ],
    badges: [
      { Icon: Flame, title: 'Streak protected', detail: 'Check-in completed' },
      { Icon: CalendarCheck, title: 'Week adjusted', detail: 'Plan stays realistic' },
    ],
  },
]

export default function CinematicLandingHero({
  user,
  hasProgram,
  onStart,
  onDashboard,
  className,
}) {
  const [activeStageId, setActiveStageId] = useState('assessment')
  const containerRef = useRef(null)
  const mainCardRef = useRef(null)
  const mockupRef = useRef(null)
  const contentRef = useRef(null)
  const ringRef = useRef(null)
  const requestRef = useRef(0)
  const primaryAction = hasProgram ? onDashboard : onStart
  const activeStage = stages.find((stage) => stage.id === activeStageId) || stages[0]
  const activeIndex = stages.findIndex((stage) => stage.id === activeStage.id)
  const progressPercent = ((activeIndex + 1) / stages.length) * 100
  const ActiveStageIcon = activeStage.Icon

  function goToStage(index) {
    const boundedIndex = Math.max(0, Math.min(stages.length - 1, index))
    setActiveStageId(stages[boundedIndex].id)
  }

  function nextStage() {
    if (activeIndex === stages.length - 1) {
      primaryAction()
      return
    }
    goToStage(activeIndex + 1)
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ['.elevate-copy', '.elevate-control-panel', '.elevate-main-card'],
        { autoAlpha: 0, y: 28, filter: 'blur(14px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.08, ease: 'expo.out' },
      )
      gsap.fromTo(
        '.elevate-phone',
        { autoAlpha: 0, y: 60, rotateX: 16, scale: 0.92 },
        { autoAlpha: 1, y: 0, rotateX: 0, scale: 1, duration: 1.1, delay: 0.15, ease: 'expo.out' },
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!contentRef.current || !ringRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current.querySelectorAll('.stage-animate'),
        { autoAlpha: 0, y: 18, scale: 0.97, filter: 'blur(10px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.48, stagger: 0.045, ease: 'power3.out' },
      )
      gsap.to(ringRef.current, {
        strokeDashoffset: activeStage.progress,
        duration: 0.85,
        ease: 'power3.inOut',
      })
    }, contentRef)

    return () => ctx.revert()
  }, [activeStage])

  useEffect(() => {
    const handleMouseMove = (event) => {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return

        const rect = mainCardRef.current.getBoundingClientRect()
        mainCardRef.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
        mainCardRef.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)

        const xVal = (event.clientX / window.innerWidth - 0.5) * 2
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2

        gsap.to(mockupRef.current, {
          rotationY: xVal * 7,
          rotationX: -yVal * 7,
          ease: 'power3.out',
          duration: 1,
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(requestRef.current)
    }
  }, [])

  return (
    <section
      ref={containerRef}
      className={cn('relative min-h-dvh overflow-hidden bg-bg px-4 pb-12 pt-28 text-white antialiased sm:px-6 lg:px-8 lg:pb-16 lg:pt-32', className)}
      style={{ perspective: '1500px' }}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="elevate-film-grain" aria-hidden="true" />
      <div className="elevate-grid pointer-events-none absolute inset-0 z-0 opacity-70" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,255,71,0.14),transparent_30rem),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.07),transparent_26rem)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="elevate-copy min-w-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
            <Activity size={15} />
            <span className="font-heading text-sm uppercase">Personalized member dashboard</span>
          </div>
          <h1 className="max-w-4xl font-heading text-5xl uppercase leading-none text-white sm:text-7xl lg:text-8xl">
            Your fitness plan, built around real life.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-body sm:text-lg">
            Complete a quick assessment, choose your membership, and unlock a private dashboard with workouts, nutrition guidance, check-ins, and progress tracking.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={primaryAction}
              className="elevate-btn-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 font-heading text-xl uppercase"
            >
              {hasProgram ? 'Open Dashboard' : 'Start Questionnaire'}
              <ArrowRight size={20} />
            </button>
            <button
              type="button"
              onClick={nextStage}
              className="elevate-btn-secondary inline-flex min-h-14 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 font-heading text-xl uppercase"
            >
              {activeIndex === stages.length - 1 ? 'Go To Questionnaire' : 'Continue Walkthrough'}
            </button>
          </div>

          <div className="elevate-control-panel mt-8 rounded-[1.25rem] border border-white/10 bg-black/25 p-3 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-heading text-xl uppercase text-white">Short Walkthrough</p>
                <p className="text-xs leading-5 text-body">Step {activeIndex + 1} of {stages.length}. Jump around or continue in order.</p>
              </div>
              <div className="hidden min-w-24 text-right font-heading text-2xl text-accent sm:block">
                {activeIndex + 1}/{stages.length}
              </div>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
            {stages.map((stage) => {
              const Icon = stage.Icon
              const isActive = activeStage.id === stage.id

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={`min-h-20 rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-accent bg-accent text-black shadow-[0_16px_36px_-20px_rgba(232,255,71,0.75)]'
                      : 'border-white/10 bg-black/35 text-white backdrop-blur-md hover:border-accent/60'
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-black text-accent' : 'bg-white/10 text-accent'}`}>
                      <Icon size={19} />
                    </span>
                    <span>
                      <span className="block font-heading text-xl uppercase">{stage.label}</span>
                      <span className={`mt-0.5 block text-xs leading-5 ${isActive ? 'text-black/70' : 'text-body'}`}>
                        {stage.eyebrow}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => goToStage(activeIndex - 1)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 font-heading text-lg uppercase text-white transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={17} />
                Back
              </button>
              <button
                type="button"
                onClick={nextStage}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-heading text-lg uppercase text-black transition hover:brightness-95"
              >
                {activeIndex === stages.length - 1 ? 'Start' : 'Next'}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={mainCardRef}
          className="elevate-main-card elevate-card relative min-h-[640px] overflow-hidden rounded-[28px] p-4 sm:p-6 lg:min-h-[700px] lg:rounded-[36px] lg:p-8"
        >
          <div className="elevate-card-sheen" aria-hidden="true" />
          <div ref={contentRef} className="relative z-10 grid h-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="stage-animate mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-accent">
                  <ActiveStageIcon size={15} />
                  <span className="font-heading text-sm uppercase">Step {activeIndex + 1}: {activeStage.label}</span>
                </div>
                <p className="stage-animate text-xs uppercase tracking-[0.24em] text-accent">{activeStage.eyebrow}</p>
                <h2 className="stage-animate mt-3 font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
                  {activeStage.headline}
                </h2>
                <p className="stage-animate mt-4 text-sm leading-7 text-body sm:text-base">
                  {activeStage.description}
                </p>
              </div>

              <div className="grid gap-3">
                {activeStage.badges.map((badge) => {
                  const Icon = badge.Icon
                  return (
                    <div key={badge.title} className="stage-animate elevate-floating-badge flex items-center gap-3 rounded-2xl p-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{badge.title}</p>
                        <p className="mt-0.5 text-sm text-body">{badge.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={nextStage}
                className="stage-animate inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-accent/35 bg-accent/10 px-5 font-heading text-lg uppercase text-accent transition hover:bg-accent hover:text-black"
              >
                {activeIndex === stages.length - 1 ? 'Start Questionnaire' : `Next: ${stages[activeIndex + 1].label}`}
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative flex h-[560px] w-full items-center justify-center">
                <div ref={mockupRef} className="elevate-phone relative flex h-[560px] w-[270px] flex-col rounded-[3rem] will-change-transform">
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[118px] z-0 h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[158px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[218px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -right-[3px] top-[168px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-[#050605] text-white shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                    <div className="elevate-screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                    <div className="absolute left-1/2 top-[5px] z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_8px_rgba(232,255,71,0.8)]" />
                    </div>

                    <div className="relative flex h-full w-full flex-col px-5 pb-8 pt-12">
                      <div className="stage-animate mb-8 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Elevate</span>
                          <span className="text-xl font-bold text-white drop-shadow-md">{activeStage.phoneTitle}</span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-neutral-200 shadow-lg shadow-black/50">
                          {user?.name?.slice(0, 1)?.toUpperCase() || 'E'}
                        </div>
                      </div>

                      <div className="stage-animate relative mx-auto mb-8 flex h-44 w-44 items-center justify-center drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                          <circle ref={ringRef} className="elevate-progress-ring" cx="88" cy="88" r="64" fill="none" stroke="#e8ff47" strokeWidth="12" />
                        </svg>
                        <div className="z-10 flex flex-col items-center text-center">
                          <span className="text-4xl font-extrabold text-white">{activeStage.metric}</span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-accent/60">{activeStage.metricLabel}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {activeStage.widgets.map((widget) => {
                          const Icon = widget.Icon
                          return (
                            <div key={widget.label} className="stage-animate elevate-widget flex items-center rounded-2xl p-3">
                              <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent shadow-inner">
                                <Icon size={17} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white">{widget.label}</p>
                                <p className="mt-0.5 truncate text-xs text-body">{widget.detail}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="absolute bottom-2 left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
