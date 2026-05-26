import { useEffect, useRef } from 'react'
import { Activity, ArrowRight, CalendarCheck, Dumbbell, Flame, ShieldCheck, Utensils } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '../../lib/utils.js'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const INJECTED_STYLES = `
  .elevate-reveal { visibility: hidden; }

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

  .elevate-text-matte {
    color: #fff;
    text-shadow: 0 18px 40px rgba(0,0,0,0.65), 0 0 30px rgba(232,255,71,0.12);
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
    position: relative;
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
    stroke-dashoffset: 402;
    stroke-linecap: round;
  }
`

export default function CinematicLandingHero({
  user,
  hasProgram,
  onStart,
  onDashboard,
  className,
}) {
  const containerRef = useRef(null)
  const mainCardRef = useRef(null)
  const mockupRef = useRef(null)
  const requestRef = useRef(0)
  const primaryAction = hasProgram ? onDashboard : onStart

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (window.scrollY > window.innerHeight * 2) return

      cancelAnimationFrame(requestRef.current)
      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return

        const rect = mainCardRef.current.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        mainCardRef.current.style.setProperty('--mouse-x', `${mouseX}px`)
        mainCardRef.current.style.setProperty('--mouse-y', `${mouseY}px`)

        const xVal = (event.clientX / window.innerWidth - 0.5) * 2
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2

        gsap.to(mockupRef.current, {
          rotationY: xVal * 10,
          rotationX: -yVal * 10,
          ease: 'power3.out',
          duration: 1.1,
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(requestRef.current)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return undefined

    const isMobile = window.innerWidth < 768
    const ctx = gsap.context(() => {
      gsap.set('.elevate-track', { autoAlpha: 0, y: 60, scale: 0.86, filter: 'blur(18px)', rotationX: -18 })
      gsap.set('.elevate-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' })
      gsap.set('.elevate-main-card', { y: window.innerHeight + 180, autoAlpha: 1 })
      gsap.set(['.elevate-card-left', '.elevate-card-right', '.elevate-mockup-wrapper', '.elevate-floating-badge', '.elevate-phone-widget'], { autoAlpha: 0 })
      gsap.set('.elevate-cta-wrapper', { autoAlpha: 0, scale: 0.82, filter: 'blur(28px)' })

      const introTl = gsap.timeline({ delay: 0.25 })
      introTl
        .to('.elevate-track', { duration: 1.5, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', rotationX: 0, ease: 'expo.out' })
        .to('.elevate-days', { duration: 1.25, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=0.85')

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=5800',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      })

      scrollTl
        .to(['.elevate-hero-text-wrapper', '.elevate-grid'], { scale: 1.12, filter: 'blur(18px)', opacity: 0.2, ease: 'power2.inOut', duration: 2 }, 0)
        .to('.elevate-main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
        .to('.elevate-main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.4 })
        .fromTo('.elevate-mockup-wrapper',
          { y: 280, z: -460, rotationX: 48, rotationY: -26, autoAlpha: 0, scale: 0.62 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 2.4 }, '-=0.75')
        .fromTo('.elevate-phone-widget', { y: 38, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.13, ease: 'back.out(1.2)', duration: 1.4 }, '-=1.45')
        .to('.elevate-progress-ring', { strokeDashoffset: 82, duration: 2, ease: 'power3.inOut' }, '-=1.1')
        .to('.elevate-counter-val', { innerHTML: 84, snap: { innerHTML: 1 }, duration: 2, ease: 'expo.out' }, '-=2')
        .fromTo('.elevate-floating-badge', { y: 90, autoAlpha: 0, scale: 0.72, rotationZ: -8 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.45)', duration: 1.4, stagger: 0.18 }, '-=2')
        .fromTo('.elevate-card-left', { x: -45, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.4 }, '-=1.35')
        .fromTo('.elevate-card-right', { x: 45, autoAlpha: 0, scale: 0.86 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.4 }, '<')
        .to({}, { duration: 2.1 })
        .set('.elevate-hero-text-wrapper', { autoAlpha: 0 })
        .set('.elevate-cta-wrapper', { autoAlpha: 1 })
        .to({}, { duration: 1.1 })
        .to(['.elevate-mockup-wrapper', '.elevate-floating-badge', '.elevate-card-left', '.elevate-card-right'], {
          scale: 0.9, y: -38, z: -180, autoAlpha: 0, ease: 'power3.in', duration: 1.15, stagger: 0.04,
        })
        .to('.elevate-main-card', {
          width: isMobile ? '92vw' : '86vw',
          height: isMobile ? '88vh' : '84vh',
          borderRadius: isMobile ? '28px' : '36px',
          ease: 'expo.inOut',
          duration: 1.65,
        }, 'pullback')
        .to('.elevate-cta-wrapper', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.65 }, 'pullback')
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={containerRef}
      className={cn('relative flex h-screen w-screen items-center justify-center overflow-hidden bg-bg text-white antialiased', className)}
      style={{ perspective: '1500px' }}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="elevate-film-grain" aria-hidden="true" />
      <div className="elevate-grid pointer-events-none absolute inset-0 z-0 opacity-70" aria-hidden="true" />

      <div className="elevate-hero-text-wrapper absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <p className="elevate-track elevate-reveal mb-3 font-heading text-5xl uppercase leading-none tracking-normal text-white sm:text-7xl lg:text-[6rem]">
          Built around your real life,
        </p>
        <p className="elevate-days elevate-reveal elevate-text-accent font-heading text-5xl uppercase leading-none tracking-normal sm:text-7xl lg:text-[6rem]">
          adjusted by your progress.
        </p>
      </div>

      <div className="elevate-cta-wrapper elevate-reveal pointer-events-auto absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <h1 className="elevate-text-accent mb-5 font-heading text-5xl uppercase leading-none sm:text-7xl lg:text-8xl">
          Elevate your next 8 weeks
        </h1>
        <p className="mx-auto mb-9 max-w-2xl text-base leading-7 text-body sm:text-lg">
          Start with a focused questionnaire, choose your membership, then unlock a private dashboard for workouts, nutrition, check-ins, and progress.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
            onClick={onStart}
            className="elevate-btn-secondary inline-flex min-h-14 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 font-heading text-xl uppercase"
          >
            View Memberships
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <div
          ref={mainCardRef}
          className="elevate-main-card elevate-card elevate-reveal pointer-events-auto relative flex h-[88vh] w-[92vw] items-center justify-center overflow-hidden rounded-[28px] md:h-[84vh] md:w-[86vw] md:rounded-[36px]"
        >
          <div className="elevate-card-sheen" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-evenly px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-12 lg:py-0">
            <div className="elevate-card-right elevate-reveal order-1 z-20 flex w-full justify-center lg:order-3 lg:justify-end">
              <div className="text-center lg:text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-accent">Private member system</p>
                <h2 className="elevate-text-matte mt-1 font-heading text-6xl uppercase leading-none tracking-normal md:text-[6rem] lg:text-[8rem]">
                  Elevate
                </h2>
              </div>
            </div>

            <div className="elevate-mockup-wrapper order-2 z-10 flex h-[380px] w-full items-center justify-center lg:h-[600px]" style={{ perspective: '1000px' }}>
              <div className="relative flex h-full w-full scale-[0.65] items-center justify-center md:scale-[0.85] lg:scale-100">
                <div ref={mockupRef} className="elevate-phone relative flex h-[580px] w-[280px] flex-col rounded-[3rem] will-change-transform">
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[120px] z-0 h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[160px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -left-[3px] top-[220px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="elevate-hardware-btn absolute -right-[3px] top-[170px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-[#050605] text-white shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                    <div className="elevate-screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                    <div className="absolute left-1/2 top-[5px] z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_8px_rgba(232,255,71,0.8)]" />
                    </div>

                    <div className="relative flex h-full w-full flex-col px-5 pb-8 pt-12">
                      <div className="elevate-phone-widget mb-8 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Today</span>
                          <span className="text-xl font-bold text-white drop-shadow-md">Workout 03</span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-neutral-200 shadow-lg shadow-black/50">
                          {user?.name?.slice(0, 1)?.toUpperCase() || 'E'}
                        </div>
                      </div>

                      <div className="elevate-phone-widget relative mx-auto mb-8 flex h-44 w-44 items-center justify-center drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                          <circle className="elevate-progress-ring" cx="88" cy="88" r="64" fill="none" stroke="#e8ff47" strokeWidth="12" />
                        </svg>
                        <div className="z-10 flex flex-col items-center text-center">
                          <span className="elevate-counter-val text-4xl font-extrabold text-white">0</span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-accent/60">Consistency</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="elevate-phone-widget elevate-widget flex items-center rounded-2xl p-3">
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent shadow-inner">
                            <Dumbbell size={17} />
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 h-2 w-24 rounded-full bg-neutral-200 shadow-inner" />
                            <div className="h-1.5 w-16 rounded-full bg-neutral-600 shadow-inner" />
                          </div>
                        </div>
                        <div className="elevate-phone-widget elevate-widget flex items-center rounded-2xl p-3">
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-inner">
                            <Utensils size={17} />
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 h-2 w-20 rounded-full bg-neutral-200 shadow-inner" />
                            <div className="h-1.5 w-28 rounded-full bg-neutral-600 shadow-inner" />
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>

                <div className="elevate-floating-badge absolute left-[-15px] top-6 z-30 flex items-center gap-3 rounded-xl p-3 lg:left-[-84px] lg:top-12 lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent lg:h-10 lg:w-10">
                    <Flame size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white lg:text-sm">Streak protected</p>
                    <p className="text-[10px] font-medium text-accent/55 lg:text-xs">Check-in completed</p>
                  </div>
                </div>

                <div className="elevate-floating-badge absolute bottom-12 right-[-15px] z-30 flex items-center gap-3 rounded-xl p-3 lg:bottom-20 lg:right-[-84px] lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white lg:h-10 lg:w-10">
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white lg:text-sm">Week adjusted</p>
                    <p className="text-[10px] font-medium text-accent/55 lg:text-xs">Plan stays realistic</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="elevate-card-left elevate-reveal order-3 z-20 flex w-full flex-col justify-center px-4 text-center lg:order-1 lg:px-0 lg:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-black lg:mx-0">
                <Activity size={24} />
              </div>
              <h3 className="mb-2 font-heading text-3xl uppercase leading-none tracking-normal text-white md:text-4xl lg:text-5xl">
                Questionnaire to dashboard.
              </h3>
              <p className="mx-auto hidden max-w-sm text-base font-normal leading-7 text-body md:block lg:mx-0 lg:max-w-none">
                Elevate turns each member's goals, equipment, schedule, and check-ins into a private plan that feels structured without feeling intimidating.
              </p>
              <div className="mt-5 hidden items-center gap-2 text-sm text-accent md:flex">
                <ShieldCheck size={18} />
                <span>One membership. One personalized journey.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
