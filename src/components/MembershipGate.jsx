import { CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'

const membershipPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$79',
    cadence: '/month',
    description: 'For self-guided members who want a clear plan and simple support.',
    features: [
      'Personalized onboarding questionnaire',
      'Custom AI-generated fitness plan',
      'Weekly workout schedule',
      'Exercise instructions',
      'Basic nutrition guidance',
      'Progress dashboard',
      'AI coaching questions',
      'One plan refresh per month',
    ],
  },
  {
    id: 'transformation',
    name: 'Transformation',
    price: '$199',
    cadence: '/month',
    badge: 'Recommended',
    description: 'For members who want the full plan, weekly adjustments, and accountability.',
    features: [
      'Everything in Starter',
      'Full 8-week personalized training plan',
      'Strength, cardio, and recovery structure',
      'Nutrition targets based on goals',
      'Habit and lifestyle recommendations',
      'Weekly check-in questionnaire',
      'Plan adjustments based on progress',
      'Photo/video exercise form feedback',
      'Priority AI coaching chat',
      'Monthly program refresh',
    ],
  },
  {
    id: 'elite',
    name: 'Elite Coaching',
    price: '$349',
    cadence: '/month',
    description: 'For members who want premium accountability and a higher-touch coaching path.',
    features: [
      'Everything in Transformation',
      'More frequent plan adjustments',
      'Advanced nutrition and recovery guidance',
      'Higher-touch accountability support',
      'Direct coach review of weekly progress',
      'Personalized action steps after check-ins',
      'Priority support',
      'Optional weekly call, voice note, or coach message',
    ],
  },
]

export default function MembershipGate({
  user,
  profile,
  selectedPlan,
  onSelectPlan,
  onCreateAccount,
  onCheckout,
  onBack,
  error,
}) {
  const activePlan = selectedPlan || 'transformation'
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] || user?.name || 'your'

  return (
    <main className="min-h-screen bg-bg px-4 py-6 text-body sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
            <h1 className="mt-2 font-heading text-5xl uppercase leading-none text-white sm:text-7xl">
              Unlock {firstName} plan
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-body">
              Your questionnaire is saved. Choose a membership to create your account, activate access, and generate the full personalized dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 rounded-lg border border-line bg-[#111] px-4 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            Edit Questionnaire
          </button>
        </header>

        <section className="grid gap-4 py-8 lg:grid-cols-3">
          {membershipPlans.map((plan) => {
            const isActive = activePlan === plan.id
            const isRecommended = plan.id === 'transformation'

            return (
              <article
                key={plan.id}
                className={`relative flex min-h-full flex-col rounded-lg border p-5 transition ${
                  isActive ? 'border-accent bg-accent/10' : 'border-line bg-card'
                } ${isRecommended ? 'shadow-2xl shadow-black/40' : ''}`}
              >
                {plan.badge ? (
                  <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent px-3 py-1 text-black">
                    <Sparkles size={15} />
                    <span className="font-heading text-sm uppercase">{plan.badge}</span>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-4xl uppercase leading-none text-white">{plan.name}</h2>
                    <p className="mt-2 min-h-14 text-sm leading-6 text-body">{plan.description}</p>
                  </div>
                  {isActive ? <CheckCircle2 className="shrink-0 text-accent" size={26} /> : null}
                </div>
                <p className="mt-5 font-heading text-6xl uppercase leading-none text-white">
                  {plan.price}
                  <span className="ml-1 align-middle font-body text-base normal-case text-body">{plan.cadence}</span>
                </p>
                <ul className="mt-5 grid flex-1 content-start gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-body">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={18} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`mt-6 min-h-12 rounded-lg px-5 font-heading text-lg uppercase transition ${
                    isActive
                      ? 'bg-accent text-black hover:brightness-95'
                      : 'border border-line bg-[#111] text-white hover:border-accent'
                  }`}
                >
                  {isActive ? 'Selected' : 'Choose Plan'}
                </button>
              </article>
            )
          })}
        </section>

        <section className="grid gap-4 pb-8 lg:grid-cols-[1fr_24rem]">
          <div className="rounded-lg border border-line bg-card p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 shrink-0 text-accent" size={24} />
              <div>
                <h2 className="font-heading text-3xl uppercase text-white">Membership Terms</h2>
                <p className="mt-2 leading-7 text-body">
                  Each Elevate membership is for one individual only. Login sharing, reselling access, or allowing another person to use the same personalized plan may result in account restriction or cancellation.
                </p>
                <p className="mt-3 leading-7 text-body">
                  Plans are personalized to one member's goals, body metrics, training history, equipment, limitations, check-ins, and progress. Sharing access can make the plan less accurate and less safe.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-accent/30 bg-accent/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-black">
                <LockKeyhole size={22} />
              </div>
              <div>
                <p className="font-heading text-2xl uppercase text-white">Next Step</p>
                <p className="text-sm text-body">{user ? 'Activate checkout' : 'Create your member account'}</p>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
            <button
              type="button"
              onClick={user ? onCheckout : onCreateAccount}
              className="mt-5 min-h-13 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:brightness-95"
            >
              {user ? 'Continue To Checkout' : 'Create Account To Continue'}
            </button>
            <p className="mt-3 text-xs leading-5 text-body">
              Stripe checkout and subscription activation will connect here when the backend is added.
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}
