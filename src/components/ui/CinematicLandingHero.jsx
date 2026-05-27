import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Flame,
  LayoutDashboard,
  LogOut,
  Repeat2,
  ShieldCheck,
  Utensils,
} from 'lucide-react'
import { gsap } from 'gsap'
import { cn } from '../../lib/utils.js'

const INJECTED_STYLES = `
  .elevate-intro-title,
  .elevate-intro-headline,
  .elevate-copy,
  .elevate-controls-shell,
  .elevate-main-card {
    visibility: hidden;
  }

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

  .elevate-stage-button {
    position: relative;
    isolation: isolate;
  }

  .elevate-stage-button::after {
    content: '';
    position: absolute;
    inset: -1px;
    z-index: -1;
    border-radius: inherit;
    opacity: 0;
    background: radial-gradient(circle at 50% 0%, rgba(232,255,71,0.28), transparent 68%);
    transition: opacity 0.28s ease;
  }

  .elevate-stage-button[aria-pressed='true']::after {
    opacity: 1;
  }

  .elevate-stage-wipe {
    background:
      linear-gradient(110deg, rgba(232,255,71,0) 0%, rgba(232,255,71,0.32) 46%, rgba(255,255,255,0.72) 50%, rgba(232,255,71,0.32) 54%, rgba(232,255,71,0) 100%),
      linear-gradient(145deg, #e8ff47 0%, #111 58%, #050505 100%);
    box-shadow: 0 0 80px rgba(232,255,71,0.32);
  }

  @media (max-width: 767px) {
    .elevate-intro-title,
    .elevate-intro-headline {
      visibility: visible;
    }

    .elevate-intro-lockup {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 1rem;
      min-height: 100svh;
      width: 100vw;
    }

    .elevate-text-accent {
      filter: none;
    }

    .elevate-card {
      background: linear-gradient(145deg, #12140b 0%, #090a07 48%, #050505 100%);
      box-shadow:
        0 22px 48px -28px rgba(0,0,0,0.95),
        inset 0 1px 1px rgba(255,255,255,0.12);
    }

    .elevate-card-sheen {
      display: none;
    }

    .elevate-btn-primary {
      box-shadow: 0 0 0 1px rgba(232,255,71,0.24), inset 0 1px 1px rgba(255,255,255,0.7);
    }

    .elevate-btn-primary:hover,
    .elevate-btn-secondary:hover {
      transform: none;
    }

    .elevate-stage-button::after {
      display: none;
    }
  }
`

const stages = [
  {
    id: 'assessment',
    label: 'Assessment',
    navLabel: 'Start Assessment',
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
    label: 'Personal Plan',
    navLabel: 'Personal Plan',
    Icon: ShieldCheck,
    eyebrow: 'See what gets built',
    headline: 'A plan shaped around your body, schedule, and goals.',
    description: 'Elevate turns your answers into practical workouts, recovery guidance, nutrition direction, and weekly steps you can actually follow.',
    phoneTitle: 'Your Plan',
    metric: '8',
    metricLabel: 'Week path',
    progress: 190,
    widgets: [
      { Icon: CalendarCheck, label: 'Weekly structure', detail: 'Training days, recovery, and next steps' },
      { Icon: Dumbbell, label: 'Workout guidance', detail: 'Sets, reps, rest, and exercise cues' },
    ],
    badges: [
      { Icon: CheckCircle2, title: 'Clear direction', detail: 'Know what to do next' },
      { Icon: Flame, title: 'Built to progress', detail: 'Simple steps compound' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    navLabel: 'Dashboard',
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
    navLabel: 'Accountability',
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

function StageControls({ activeStage, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/42 p-2 backdrop-blur-md sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
      {stages.map((stage) => {
        const Icon = stage.Icon
        const isActive = activeStage.id === stage.id

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect(stage.id, { revealContent: true })}
            className={`elevate-stage-button min-h-16 rounded-lg border p-3 text-left transition sm:min-h-20 ${
              isActive
                ? 'border-accent bg-accent text-black shadow-none sm:shadow-[0_16px_36px_-20px_rgba(232,255,71,0.75)]'
                : 'border-white/10 bg-black/35 text-white backdrop-blur-md hover:border-accent/60'
            }`}
            aria-pressed={isActive}
          >
            <span className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-black text-accent' : 'bg-white/10 text-accent'}`}>
                <Icon size={19} />
              </span>
              <span>
                <span className="block font-heading text-base uppercase min-[380px]:text-lg sm:text-xl">{stage.label}</span>
                <span className={`mt-0.5 block text-xs leading-4 sm:leading-5 ${isActive ? 'text-black/75' : 'text-body'}`}>
                  {stage.eyebrow}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StageHeader({ activeStage, onSelect, onStart, onSignOut }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-bg/92 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-3 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:gap-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src="/ehw-logo.jpeg"
              alt="Elevate Health and Wellness"
              className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover sm:h-11 sm:w-11"
            />
            <div className="min-w-0">
              <p className="font-heading text-xl uppercase leading-none text-white sm:text-2xl">Elevate</p>
              <p className="truncate text-[10px] uppercase tracking-[0.2em] text-body sm:text-xs">
                Health and Wellness
              </p>
            </div>
          </div>

          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-white backdrop-blur-md transition hover:border-accent/60"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          ) : null}
        </div>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Elevate sections">
          {stages.map((stage) => {
            const Icon = stage.Icon
            const isActive = activeStage.id === stage.id
            const isAssessment = stage.id === 'assessment'

            return (
              <button
                key={`header-${stage.id}`}
                type="button"
                onClick={() => {
                  if (isAssessment) {
                    onStart()
                    return
                  }

                  onSelect(stage.id, { revealContent: true })
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition sm:px-4 ${
                  isActive
                    ? 'border-accent bg-accent text-black shadow-none'
                    : 'border-white/10 bg-black/35 text-white backdrop-blur-md hover:border-accent/60'
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${isActive ? 'bg-black text-accent' : 'bg-white/10 text-accent'}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 truncate font-heading text-xs uppercase leading-none min-[380px]:text-sm sm:text-base">
                  {stage.navLabel}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

export default function CinematicLandingHero({
  user,
  hasProgram,
  onStart,
  onDashboard,
  onSignOut,
  className,
}) {
  const [activeStageId, setActiveStageId] = useState('assessment')
  const [isStageFocused, setIsStageFocused] = useState(false)
  const containerRef = useRef(null)
  const mainCardRef = useRef(null)
  const mockupRef = useRef(null)
  const contentRef = useRef(null)
  const ringRef = useRef(null)
  const transitionRef = useRef(null)
  const requestRef = useRef(0)
  const hasRenderedStageRef = useRef(false)
  const primaryAction = hasProgram ? onDashboard : onStart
  const activeStage = stages.find((stage) => stage.id === activeStageId) || stages[0]

  function selectStage(nextStageId, options = {}) {
    if (typeof window === 'undefined') {
      setActiveStageId(nextStageId)
      setIsStageFocused(true)
      return
    }

    const isCompact = window.matchMedia('(max-width: 767px)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const revealStage = () => {
      setActiveStageId(nextStageId)
      setIsStageFocused(true)

      if (options.revealContent && isCompact) {
        window.requestAnimationFrame(() => {
          mainCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
        })
      }
    }

    if (prefersReducedMotion || !transitionRef.current) {
      revealStage()
      return
    }

    gsap.killTweensOf(transitionRef.current)
    gsap.timeline({
      defaults: { ease: 'power4.inOut' },
      onComplete: () => {
        gsap.set(transitionRef.current, { autoAlpha: 0, clipPath: 'inset(0 0 0 100%)' })
      },
    })
      .set(transitionRef.current, { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' })
      .to(transitionRef.current, { clipPath: 'inset(0 0% 0 0)', duration: 0.34 })
      .add(revealStage)
      .to(transitionRef.current, { clipPath: 'inset(0 0 0 100%)', duration: 0.48, ease: 'expo.inOut' })
  }

  function runPrimaryAction() {
    if (!hasProgram && typeof window !== 'undefined') {
      window.history.pushState(null, '', '#assessment')
    }
    primaryAction()
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        gsap.set(['.elevate-copy', '.elevate-controls-shell', '.elevate-main-card'], {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
        })
        gsap.set(['.elevate-intro-title', '.elevate-intro-headline'], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
        })
        return
      }

      const introTl = gsap.timeline({ defaults: { ease: 'expo.out' } })

      introTl
        .fromTo(
          '.elevate-intro-title',
          { autoAlpha: 0, y: 44, scale: 0.92, filter: 'blur(20px)' },
          { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.9 },
        )
        .fromTo(
          '.elevate-intro-headline',
          { autoAlpha: 0, y: 28, scale: 0.96, filter: 'blur(12px)' },
          { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.9 },
          '-=0.45',
        )
        .to(['.elevate-intro-title', '.elevate-intro-headline'], {
          autoAlpha: 0,
          y: -34,
          scale: 1.04,
          filter: 'blur(14px)',
          duration: 0.55,
          ease: 'power3.inOut',
        }, '+=0.45')
        .fromTo(
          ['.elevate-copy', '.elevate-controls-shell', '.elevate-main-card'],
          { autoAlpha: 0, y: 34, filter: 'blur(18px)', scale: 0.97 },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 0.9, stagger: 0.08 },
          '-=0.1',
        )
        .fromTo(
          '.elevate-phone',
          { autoAlpha: 0, y: 60, rotateX: 16, scale: 0.92 },
          { autoAlpha: 1, y: 0, rotateX: 0, scale: 1, duration: 1.1, ease: 'expo.out' },
          '-=0.75',
        )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!contentRef.current || !ringRef.current) return

    const ctx = gsap.context(() => {
      const isCompact = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      const hasRenderedStage = hasRenderedStageRef.current
      hasRenderedStageRef.current = true

      if (isCompact) {
        gsap.set(contentRef.current.querySelectorAll('.stage-animate'), {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
        })
      } else {
        if (hasRenderedStage && mainCardRef.current) {
          gsap.fromTo(
            mainCardRef.current,
            { scale: 0.965, y: 22, filter: 'blur(10px)' },
            { scale: 1, y: 0, filter: 'blur(0px)', duration: 0.62, ease: 'expo.out' },
          )
        }

        gsap.fromTo(
          contentRef.current.querySelectorAll('.stage-animate'),
          { autoAlpha: 0, y: 24, scale: 0.96, filter: 'blur(12px)' },
          { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.58, stagger: 0.055, ease: 'expo.out' },
        )
      }

      gsap.to(ringRef.current, {
        strokeDashoffset: activeStage.progress,
        duration: isCompact ? 0 : 0.85,
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
      className={cn('relative min-h-dvh overflow-x-hidden bg-bg text-white antialiased', className)}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="elevate-intro-lockup pointer-events-none fixed inset-0 z-[60] grid place-items-center px-4 text-center">
        <div className="w-full max-w-[42rem]">
          <p className="elevate-intro-title font-heading text-[clamp(3.55rem,18vw,4.8rem)] uppercase leading-[0.86] text-white sm:text-7xl lg:text-[8rem]">
            Elevate
          </p>
          <p className="elevate-intro-headline elevate-text-accent mx-auto mt-3 max-w-full whitespace-nowrap font-heading text-[clamp(1.65rem,8.4vw,2.45rem)] uppercase leading-none sm:text-5xl lg:text-[4rem]">
            Health &amp; Fitness
          </p>
        </div>
      </div>
      {isStageFocused ? (
        <StageHeader activeStage={activeStage} onSelect={selectStage} onStart={onStart} onSignOut={onSignOut} />
      ) : null}
      <div
        className={`relative isolate min-h-dvh overflow-hidden px-4 pb-8 sm:px-6 lg:px-8 lg:pb-16 ${
          isStageFocused ? 'pt-44 sm:pt-36 lg:pt-40' : 'pt-14 sm:pt-20 lg:pt-24'
        }`}
        style={{ perspective: '1500px' }}
      >
        <div className="elevate-film-grain" aria-hidden="true" />
        <div className="elevate-grid pointer-events-none absolute inset-0 z-0 opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,255,71,0.14),transparent_30rem),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.07),transparent_26rem)]" />
        <div ref={transitionRef} className="elevate-stage-wipe pointer-events-none absolute inset-0 z-40 opacity-0" aria-hidden="true" />

        <div className={`relative z-10 mx-auto grid max-w-7xl items-center gap-5 sm:gap-8 ${isStageFocused ? 'lg:grid-cols-1' : 'lg:grid-cols-[0.9fr_1.1fr]'}`}>
          <div className={`elevate-copy min-w-0 ${isStageFocused ? 'hidden' : ''}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent sm:mb-5">
              <Activity size={15} />
              <span className="font-heading text-sm uppercase">Personalized member dashboard</span>
            </div>
            <h1 className="text-balance max-w-4xl font-heading text-4xl uppercase leading-[0.92] text-white sm:text-6xl lg:text-7xl">
              Your fitness plan, built around real life.
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-base leading-7 text-body sm:text-lg">
              Complete a quick assessment, choose your membership, and unlock a private dashboard with workouts, nutrition guidance, check-ins, and progress tracking.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={runPrimaryAction}
                className="elevate-btn-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 font-heading text-xl uppercase"
              >
                {hasProgram ? 'Open Dashboard' : 'Start Assessment'}
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={() => selectStage('membership', { revealContent: true })}
                className="elevate-btn-secondary inline-flex min-h-14 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 font-heading text-xl uppercase"
              >
                See How It Works
              </button>
            </div>

            <div className="elevate-controls-shell mt-6 sm:mt-8">
              <StageControls activeStage={activeStage} onSelect={selectStage} />
            </div>
          </div>

          {isStageFocused ? (
            <div className="z-30">
              <div className="mb-4 flex justify-stretch sm:mb-5 sm:justify-end">
                <button
                  type="button"
                  onClick={runPrimaryAction}
                  className="elevate-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 font-heading text-lg uppercase sm:w-auto"
                >
                  {hasProgram ? 'Open Dashboard' : 'Start Assessment'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : null}

          <div
            ref={mainCardRef}
            className={`elevate-main-card elevate-card relative scroll-mt-44 overflow-hidden rounded-2xl p-4 sm:scroll-mt-36 sm:rounded-[28px] sm:p-6 lg:scroll-mt-40 lg:rounded-[36px] lg:p-8 ${
              isStageFocused ? 'min-h-0 lg:min-h-[620px]' : 'min-h-0 sm:min-h-[640px] lg:min-h-[700px]'
            }`}
          >
            <div className="elevate-card-sheen" aria-hidden="true" />
            <div
              ref={contentRef}
              className={`relative z-10 grid h-full gap-5 sm:gap-6 ${
                isStageFocused ? 'lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]' : 'lg:grid-cols-[0.92fr_1.08fr]'
              }`}
            >
              <div className="flex flex-col gap-5 text-left sm:justify-between sm:gap-6">
                <div>
                  <p className="stage-animate text-xs uppercase tracking-[0.22em] text-accent sm:tracking-[0.24em]">{activeStage.eyebrow}</p>
                  <h2 className={`stage-animate text-balance mt-3 font-heading uppercase leading-[0.9] text-white ${isStageFocused ? 'text-3xl min-[380px]:text-4xl sm:text-6xl lg:text-7xl' : 'text-3xl sm:text-5xl'}`}>
                    {activeStage.headline}
                  </h2>
                  <p className={`stage-animate text-balance mt-4 leading-7 text-body ${isStageFocused ? 'max-w-3xl text-sm sm:text-xl sm:leading-9' : 'text-sm sm:text-base'}`}>
                    {activeStage.description}
                  </p>
                </div>

                <div className="grid gap-3">
                  {activeStage.badges.map((badge) => {
                    const Icon = badge.Icon
                    return (
                      <div key={badge.title} className="stage-animate elevate-floating-badge flex items-center gap-3 rounded-2xl p-3 sm:p-4">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent sm:h-11 sm:w-11">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{badge.title}</p>
                          <p className="mt-0.5 text-sm text-body">{badge.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="stage-animate grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-3">
                  {activeStage.widgets.map((widget) => {
                    const Icon = widget.Icon
                    return (
                      <div key={widget.label} className="elevate-widget min-h-[6.5rem] rounded-2xl p-4">
                        <div className="flex h-full items-center gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold leading-tight text-white sm:text-lg">
                              {widget.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-body">
                              {widget.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className={`${isStageFocused ? 'h-[420px] sm:h-[500px] lg:h-[560px]' : 'h-[420px] sm:h-[560px]'} relative flex w-full items-center justify-center`}>
                  <div ref={mockupRef} className={`${isStageFocused ? 'h-[410px] w-[198px] sm:h-[500px] sm:w-[240px] lg:h-[560px] lg:w-[270px]' : 'h-[410px] w-[198px] sm:h-[560px] sm:w-[270px]'} elevate-phone relative flex flex-col rounded-[2.45rem] sm:rounded-[3rem] will-change-transform`}>
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
      </div>
    </section>
  )
}
