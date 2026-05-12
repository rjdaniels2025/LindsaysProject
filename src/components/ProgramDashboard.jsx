import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Dumbbell, HeartPulse, LineChart, Sparkles, Trophy } from 'lucide-react'
import { FormattedMessage } from '../utils/formatMessage.jsx'

const views = [
  { id: 'today', label: 'Today', icon: Dumbbell },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'recover', label: 'Recover', icon: HeartPulse },
  { id: 'track', label: 'Track', icon: LineChart },
]

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
    .map((line) => line.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, limit)
}

function FocusCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-line bg-[#111] p-4">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded bg-accent text-black">
        <Icon size={18} />
      </div>
      <p className="font-heading text-sm uppercase text-body">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
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
          <p className="leading-6 text-body">{item}</p>
        </div>
      ))}
    </div>
  )
}

export default function ProgramDashboard({ message, profile, onQuickAction }) {
  const [activeView, setActiveView] = useState('today')
  const [showFullPlan, setShowFullPlan] = useState(false)

  const sections = useMemo(
    () => ({
      today: compactLines(extractSection(message.content, ['session', 'day 1', 'workout a', 'upper', 'lower']), 6),
      week: compactLines(extractSection(message.content, ['weekly', 'split', 'week 1']), 7),
      recover: compactLines(extractSection(message.content, ['recovery', 'sleep', 'nutrition', 'deload']), 6),
      track: compactLines(extractSection(message.content, ['kpi', 'performance indicator', 'measure', 'track']), 6),
    }),
    [message.content],
  )

  const activeItems = sections[activeView].length
    ? sections[activeView]
    : ['Review your full plan below, then ask Apex to turn it into today\'s exact workout.']

  return (
    <article className="mr-auto w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-card shadow-2xl shadow-black/30">
      <div className="border-b border-line bg-[#0b0b0b] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Sparkles size={15} />
              <span className="font-heading text-sm uppercase">Your Game Plan</span>
            </div>
            <h2 className="font-heading text-4xl uppercase leading-none text-white sm:text-5xl">
              Start simple. Stack wins.
            </h2>
            <p className="mt-2 max-w-2xl text-body">
              Apex built the full science-backed plan. Use this dashboard to follow the next step, then open the detailed plan only when you need it.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <FocusCard icon={Trophy} label="Goal" value={profile?.primaryGoal || 'Fitness'} />
            <FocusCard icon={CalendarDays} label="Schedule" value={`${profile?.daysPerWeek || '-'} days`} />
            <FocusCard icon={Dumbbell} label="Gear" value={profile?.equipment || 'Custom'} />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[15rem_1fr]">
        <nav className="flex gap-2 overflow-x-auto border-b border-line p-3 lg:flex-col lg:border-b-0 lg:border-r">
          {views.map((view) => {
            const Icon = view.icon
            const selected = activeView === view.id
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`flex min-h-12 shrink-0 items-center gap-3 rounded-lg border px-4 text-left transition ${
                  selected ? 'border-accent bg-accent text-black' : 'border-line bg-[#111] text-white hover:border-accent/70'
                }`}
              >
                <Icon size={18} />
                <span className="font-heading text-lg uppercase">{view.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-sm uppercase text-accent">Step-by-step</p>
              <h3 className="font-heading text-3xl uppercase text-white">
                {views.find((view) => view.id === activeView)?.label} focus
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onQuickAction(`Turn my ${views.find((view) => view.id === activeView)?.label.toLowerCase()} plan into a simple checklist with exact actions.`)}
              className="rounded-lg bg-accent px-4 py-2 font-heading text-lg uppercase text-black"
            >
              Simplify This
            </button>
          </div>

          <Checklist items={activeItems} />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['What do I do first?', 'Make this beginner friendly', 'Explain my next workout'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickAction(prompt)}
                className="rounded-lg border border-line bg-[#111] p-3 text-left text-sm text-white transition hover:border-accent"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-[#111]">
            <button
              type="button"
              onClick={() => setShowFullPlan((current) => !current)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <span>
                <span className="block font-heading text-2xl uppercase text-white">Full science plan</span>
                <span className="text-sm text-body">Open this when you want every set, rep, rationale, and progression detail.</span>
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
