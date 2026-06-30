import { useMemo, useState } from 'react'
import {
  ArrowLeft, Dumbbell, UtensilsCrossed, HeartPulse, TrendingUp,
  CalendarCheck, Clock, Sparkles, AlertTriangle,
} from 'lucide-react'

const SECTION_DEFS = [
  { key: 'today', label: 'Today First', heading: 'Today First', icon: Sparkles },
  { key: 'workouts', label: 'Workouts', heading: 'Workouts', icon: Dumbbell },
  { key: 'meals', label: 'Meal Plan', heading: 'Meal Plan', icon: UtensilsCrossed },
  { key: 'progression', label: '4 Week Progression', heading: 'Four Week Progression', icon: TrendingUp },
  { key: 'recovery', label: 'Recovery', heading: 'Recovery', icon: HeartPulse },
  { key: 'track', label: 'Track Progress', heading: 'Track Progress', icon: CalendarCheck },
  { key: 'why', label: 'Why This Works', heading: 'Why This Works', icon: Sparkles },
]

// Splits the raw program text into sections using the fixed heading set the
// generator always produces. Read-only admin view, so this stays simple
// rather than reusing the client app's interactive parser.
function splitSections(content) {
  const text = String(content || '')
  const headings = SECTION_DEFS.map((s) => s.heading)
  const result = {}

  headings.forEach((heading, i) => {
    const start = text.indexOf(heading)
    if (start === -1) {
      result[heading] = ''
      return
    }
    const searchFrom = start + heading.length
    let end = text.length
    for (let j = 0; j < headings.length; j++) {
      if (j === i) continue
      const nextStart = text.indexOf(headings[j], searchFrom)
      if (nextStart !== -1 && nextStart < end) end = nextStart
    }
    result[heading] = text.slice(searchFrom, end).trim()
  })

  return result
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function countWorkoutSessions(content) {
  const matches = String(content || '').match(/Workout (One|Two|Three|Four|Five|Six)\b/g)
  return matches ? new Set(matches).size : 0
}

function ProgressStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-body">{label}</p>
          <p className="font-heading text-2xl leading-none text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function HistoryTable({ history }) {
  if (!history.length) {
    return <p className="text-sm text-body">No logged sets yet. The client hasn't recorded any weights.</p>
  }
  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date))
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-white/5 text-left text-xs uppercase tracking-wider text-body">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Workout</th>
            <th className="px-3 py-2">Exercise</th>
            <th className="px-3 py-2">Weight Logged</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 40).map((entry, i) => (
            <tr key={`${entry.id}-${entry.date}-${i}`} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-2 text-body">{formatDateTime(entry.date)}</td>
              <td className="px-3 py-2 text-white">{entry.workout || '—'}</td>
              <td className="px-3 py-2 text-white">{entry.name || '—'}</td>
              <td className="px-3 py-2 text-accent">{entry.weight || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > 40 && (
        <p className="border-t border-line px-3 py-2 text-xs text-body">
          Showing 40 most recent of {sorted.length} logged entries.
        </p>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs font-medium uppercase text-body/60 tracking-wider">{label}</span>
      <p className="mt-0.5 text-sm text-white capitalize">{value}</p>
    </div>
  )
}

export default function AdminClientDetail({ client, onBack }) {
  const [activeSection, setActiveSection] = useState('today')

  const appState = client.app_state || {}
  const profile = appState.profile || appState.profileDraft || {}
  const workoutLog = appState.workoutLog || {}
  const messages = Array.isArray(appState.messages) ? appState.messages : []
  const programMessage = messages.find((m) => m?.meta?.type === 'program') || messages[0]
  const programText = programMessage?.content

  const sections = useMemo(() => splitSections(programText), [programText])
  const totalWorkouts = useMemo(() => countWorkoutSessions(programText), [programText])
  const completedWorkouts = Array.isArray(workoutLog.completedWorkouts) ? workoutLog.completedWorkouts : []
  const history = Array.isArray(workoutLog.history) ? workoutLog.history : []
  const week = workoutLog.week || 1

  const safetyFlags = Array.isArray(programMessage?.meta?.safetyFlags) ? programMessage.meta.safetyFlags : []

  const lastLoggedDate = history.length
    ? history.reduce((latest, e) => (new Date(e.date) > new Date(latest) ? e.date : latest), history[0].date)
    : null

  const activeDef = SECTION_DEFS.find((s) => s.key === activeSection)
  const activeText = activeDef ? sections[activeDef.heading] : ''

  if (!programText) {
    return (
      <main className="min-h-screen bg-bg text-body">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-heading text-base uppercase text-white transition hover:border-accent"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
              {client.display_name || 'Client'}
            </h1>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
            This client has not generated a program yet.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg text-body">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-heading text-base uppercase text-white transition hover:border-accent shrink-0"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <div className="min-w-0">
              <p className="font-heading text-sm uppercase text-accent">Block {appState.blockNumber || 1}</p>
              <h1 className="truncate font-heading text-2xl uppercase leading-none text-white sm:text-3xl">
                {client.display_name || profile.name || 'Client'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {safetyFlags.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Safety flags: {safetyFlags.join(', ')}</span>
          </div>
        )}

        <section>
          <h2 className="mb-3 font-heading text-xl uppercase text-white">Progress</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProgressStat icon={CalendarCheck} label="Current Week" value={`${week} / 4`} />
            <ProgressStat
              icon={Dumbbell}
              label="Sessions Done"
              value={`${completedWorkouts.length} / ${totalWorkouts || profile.daysPerWeek || '—'}`}
              sub="this week"
            />
            <ProgressStat icon={Clock} label="Last Logged" value={formatDateTime(lastLoggedDate)} />
            <ProgressStat icon={TrendingUp} label="Logged Sets" value={history.length} sub="all-time" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-xl uppercase text-white">Client Profile</h2>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-card p-4 sm:grid-cols-3 sm:p-5">
            <Detail label="Age" value={profile.age} />
            <Detail label="Gender" value={profile.gender} />
            <Detail label="Height" value={profile.height} />
            <Detail label="Current Weight" value={profile.weightLbs ? `${profile.weightLbs} lbs` : null} />
            <Detail label="Desired Weight" value={profile.desiredWeightLbs ? `${profile.desiredWeightLbs} lbs` : null} />
            <Detail label="Experience" value={profile.experience} />
            <Detail label="Days / Week" value={profile.daysPerWeek} />
            <Detail label="Equipment" value={profile.equipment} />
            <Detail
              label="Goals"
              value={Array.isArray(profile.primaryGoal) ? profile.primaryGoal.join(', ') : profile.primaryGoal}
            />
            {profile.limitations && <Detail label="Limitations" value={profile.limitations} />}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-xl uppercase text-white">Workout History</h2>
          <HistoryTable history={history} />
        </section>

        <section>
          <h2 className="mb-3 font-heading text-xl uppercase text-white">Full Program</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {SECTION_DEFS.map((s) => {
              const Icon = s.icon
              const isActive = activeSection === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium uppercase transition ${
                    isActive
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-line bg-card text-body hover:border-accent/50'
                  }`}
                >
                  <Icon size={12} /> {s.label}
                </button>
              )
            })}
          </div>
          <div className="rounded-lg border border-line bg-card p-4 sm:p-6">
            {activeText ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-body">{activeText}</div>
            ) : (
              <p className="text-sm text-body">No content found for this section.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
