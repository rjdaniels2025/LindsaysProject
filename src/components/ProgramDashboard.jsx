import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, Dumbbell, HeartPulse, LineChart, Lock, Sparkles, Trophy } from 'lucide-react'
import { FormattedMessage } from '../utils/formatMessage.jsx'

const views = [
  { id: 'today', label: 'Today', icon: Dumbbell },
  { id: 'workouts', label: 'Workouts', icon: CheckCircle2 },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'recover', label: 'Recover', icon: HeartPulse },
  { id: 'track', label: 'Track', icon: LineChart },
]

const completionItems = [
  'I finished the warmup.',
  'I completed every exercise I could safely do.',
  'I wrote down the weight, reps, or effort for my main exercises.',
  'I checked how my body feels after the workout.',
]

function formatGoals(primaryGoal) {
  return Array.isArray(primaryGoal) ? primaryGoal.join(', ') : primaryGoal
}

function extractSection(content, keywords, fallbackLength = 900) {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => {
    const normalized = line.toLowerCase()
    return keywords.some((keyword) => normalized.includes(keyword))
  })

  if (start === -1) return content.slice(0, fallbackLength)

  const rest = lines.slice(start)
  const nextHeading = rest.findIndex((line, index) => index > 0 && /^#{1,3}\s/.test(line.trim()))
  return rest.slice(0, nextHeading > 0 ? nextHeading : 28).join('\n').trim()
}

function compactLines(markdown, limit = 7) {
  return markdown
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/[#[\]{}*_`~|^=<>•·]/g, '')
        .replace(/[—–-]/g, ', ')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, limit)
}

function FocusCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-line bg-[#111] p-3 sm:p-4">
      <div className="mb-2 grid h-8 w-8 place-items-center rounded bg-accent text-black sm:mb-3 sm:h-9 sm:w-9">
        <Icon size={17} />
      </div>
      <p className="font-heading text-xs uppercase text-body sm:text-sm">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white sm:text-lg">{value}</p>
    </div>
  )
}

function Checklist({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-line bg-[#111] p-3">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent font-heading text-sm text-black">
            {index + 1}
          </span>
          <p className="min-w-0 text-sm leading-6 text-body sm:text-base">{item}</p>
        </div>
      ))}
    </div>
  )
}

function parseWorkouts(content, fallbackItems) {
  const workoutSection = extractSection(content, ['workouts', 'session', 'day'], 3000)
  const lines = compactLines(workoutSection, 40)
  const headingIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /workout|session|day\s+\d|upper|lower|full body|push|pull|legs/i.test(line))

  if (!headingIndexes.length) {
    return fallbackItems.slice(0, 6).map((item, index) => ({
      title: index === 0 ? 'Workout one' : `Workout ${index + 1}`,
      summary: item,
      details: fallbackItems.slice(index, index + 4),
    }))
  }

  return headingIndexes.slice(0, 8).map(({ line, index }, itemIndex) => {
    const next = headingIndexes[itemIndex + 1]?.index || lines.length
    const details = lines.slice(index + 1, next).filter((item) => item !== line).slice(0, 8)

    return {
      title: line,
      summary: details[0] || 'A focused workout from your plan.',
      details: details.length ? details : ['Follow the exercises listed in your full plan.', 'Move with control.', 'Stop if anything feels unsafe.'],
    }
  })
}

function WorkoutTracker({ workouts }) {
  const [currentWorkout, setCurrentWorkout] = useState(0)
  const [completedWorkouts, setCompletedWorkouts] = useState([])
  const [checks, setChecks] = useState({})
  const activeWorkout = workouts[currentWorkout] || workouts[0]
  const checkedCount = completionItems.filter((_, index) => checks[index]).length
  const canComplete = checkedCount === completionItems.length

  function toggleCheck(index) {
    setChecks((current) => ({ ...current, [index]: !current[index] }))
  }

  function completeWorkout() {
    if (!canComplete) return
    setCompletedWorkouts((current) => [...new Set([...current, currentWorkout])])
    setChecks({})
    setCurrentWorkout((current) => Math.min(current + 1, workouts.length - 1))
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="font-heading text-sm uppercase text-accent">Current workout</p>
        <h4 className="mt-1 break-words font-heading text-2xl uppercase leading-none text-white sm:text-3xl">{activeWorkout.title}</h4>
        <div className="mt-4 grid gap-3">
          {activeWorkout.details.map((detail, index) => (
            <div key={`${detail}-${index}`} className="rounded-lg border border-line bg-[#111] p-3 text-sm leading-6 text-body sm:text-base">
              {detail}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-[#111] p-4">
        <p className="font-heading text-2xl uppercase text-white">Finish checklist</p>
        <p className="mt-1 text-sm text-body">Complete these before the next workout unlocks.</p>
        <div className="mt-4 grid gap-2">
          {completionItems.map((item, index) => (
            <label key={item} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-card p-3">
              <input
                type="checkbox"
                checked={Boolean(checks[index])}
                onChange={() => toggleCheck(index)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#e8ff47]"
              />
              <span className="text-sm leading-6 text-body sm:text-base">{item}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={!canComplete}
          onClick={completeWorkout}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-heading text-xl uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentWorkout >= workouts.length - 1 && canComplete ? 'Complete Final Workout' : 'Unlock Next Workout'}
        </button>
      </div>

      <div className="grid gap-3">
        <p className="font-heading text-2xl uppercase text-white">Upcoming workouts</p>
        {workouts.map((workout, index) => {
          const isCurrent = index === currentWorkout
          const isDone = completedWorkouts.includes(index)
          const isLocked = index > currentWorkout

          return (
            <div
              key={`${workout.title}-${index}`}
              className={`rounded-lg border p-3 ${isCurrent ? 'border-accent bg-accent/10' : 'border-line bg-[#111]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="break-words font-heading text-lg uppercase leading-none text-white sm:text-xl">{workout.title}</p>
                  <p className="mt-1 text-sm text-body">
                    {isLocked ? workout.summary : isDone ? 'Completed.' : 'Available now.'}
                  </p>
                </div>
                {isLocked ? <Lock className="shrink-0 text-body" size={18} /> : null}
                {isDone ? <CheckCircle2 className="shrink-0 text-accent" size={20} /> : null}
              </div>
              {isLocked ? <p className="mt-2 text-xs text-body">Details unlock after you complete your current workout.</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionButton({ action, pendingAction, isLoading, onQuickAction }) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => onQuickAction(action)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-line bg-[#111] p-3 text-left text-sm text-white transition hover:border-accent disabled:opacity-50"
    >
      <span>{action.label}</span>
      {pendingAction === action.label ? (
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${dot * 150}ms` }} />
          ))}
        </span>
      ) : null}
    </button>
  )
}

export default function ProgramDashboard({ message, profile, onQuickAction, pendingAction, isLoading }) {
  const [activeView, setActiveView] = useState('today')
  const [showFullPlan, setShowFullPlan] = useState(false)

  const sections = useMemo(
    () => ({
      today: compactLines(extractSection(message.content, ['session', 'day 1', 'workout a', 'upper', 'lower']), 6),
      week: compactLines(extractSection(message.content, ['weekly', 'split', 'week 1']), 7),
      workouts: compactLines(extractSection(message.content, ['workouts', 'session', 'day 1']), 8),
      recover: compactLines(extractSection(message.content, ['recovery', 'sleep', 'nutrition', 'deload']), 6),
      track: compactLines(extractSection(message.content, ['kpi', 'performance indicator', 'measure', 'track']), 6),
    }),
    [message.content],
  )

  const activeItems = sections[activeView].length
    ? sections[activeView]
    : ['Open your full plan below, then use the buttons to make it simpler.']
  const workouts = useMemo(() => parseWorkouts(message.content, sections.today), [message.content, sections.today])

  const activeLabel = views.find((view) => view.id === activeView)?.label || 'today'
  const topAction = {
    label: `Simplify ${activeLabel}`,
    prompt: `Turn my ${activeLabel.toLowerCase()} plan into simple steps with exact actions.`,
  }
  const helperActions = [
    { label: 'First thing to do', prompt: 'Tell me the first thing I should do today in simple steps.' },
    { label: 'Make it easier', prompt: 'Make this plan easier to follow for a normal person.' },
    { label: 'Next workout', prompt: 'Explain my next workout in simple steps.' },
  ]

  return (
    <article className="mr-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-card shadow-2xl shadow-black/30">
      <div className="border-b border-line bg-[#0b0b0b] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Sparkles size={15} />
              <span className="font-heading text-sm uppercase">Your Game Plan</span>
            </div>
            <h2 className="font-heading text-3xl uppercase leading-none text-white sm:text-5xl">
              Start simple. Build momentum.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-body sm:text-base">
              Elevate built your plan. Use one section at a time, follow the next step, and keep the details nearby when you want them.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:min-w-80">
            <FocusCard icon={Trophy} label="Goal" value={formatGoals(profile?.primaryGoal) || 'Fitness'} />
            <FocusCard icon={CalendarDays} label="Schedule" value={`${profile?.daysPerWeek || '-'} days`} />
            <FocusCard icon={Dumbbell} label="Gear" value={profile?.equipment || 'Custom'} />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[15rem_1fr]">
        <nav className="grid grid-cols-2 gap-2 border-b border-line p-3 min-[460px]:grid-cols-3 sm:flex sm:overflow-x-auto lg:flex-col lg:border-b-0 lg:border-r">
          {views.map((view) => {
            const Icon = view.icon
            const selected = activeView === view.id
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`flex min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 text-left transition sm:gap-3 sm:px-4 ${
                  selected ? 'border-accent bg-accent text-black' : 'border-line bg-[#111] text-white hover:border-accent/70'
                }`}
              >
                <Icon size={18} />
                <span className="font-heading text-base uppercase sm:text-lg">{view.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-sm uppercase text-accent">Simple steps</p>
              <h3 className="font-heading text-2xl uppercase text-white sm:text-3xl">
                {activeLabel} focus
              </h3>
            </div>
            <ActionButton action={topAction} pendingAction={pendingAction} isLoading={isLoading} onQuickAction={onQuickAction} />
          </div>

          {activeView === 'workouts' ? <WorkoutTracker workouts={workouts} /> : <Checklist items={activeItems} />}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {helperActions.map((action) => (
              <ActionButton
                key={action.label}
                action={action}
                pendingAction={pendingAction}
                isLoading={isLoading}
                onQuickAction={onQuickAction}
              />
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-[#111]">
            <button
              type="button"
              onClick={() => setShowFullPlan((current) => !current)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <span>
                <span className="block font-heading text-xl uppercase text-white sm:text-2xl">Full science plan</span>
                <span className="text-sm text-body">Open this when you want every set, rep, reason, and progress detail.</span>
              </span>
              <ChevronDown className={`shrink-0 text-accent transition ${showFullPlan ? 'rotate-180' : ''}`} />
            </button>
            {showFullPlan ? (
              <div className="border-t border-line p-4">
                <FormattedMessage content={message.content} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  )
}
