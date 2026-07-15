import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  User,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  HeartPulse,
  LineChart,
  Lock,
  Play,
  Repeat,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Utensils,
  X,
} from 'lucide-react'
import { FormattedMessage } from '../utils/formatMessage.jsx'
import ProfileEditor from './ProfileEditor.jsx'

const views = [
  { id: 'today', label: 'Today', mobileLabel: 'Today', icon: Sparkles },
  { id: 'workouts', label: 'Workouts', mobileLabel: 'Train', icon: CheckCircle2 },
  { id: 'meal', label: 'Meal Plan', mobileLabel: 'Meals', icon: Utensils },
  { id: 'recover', label: 'Recovery', mobileLabel: 'Recover', icon: HeartPulse },
  { id: 'track', label: 'Progress', mobileLabel: 'Track', icon: LineChart },
  { id: 'science', label: 'Why It Works', mobileLabel: 'Why', icon: BookOpenText },
  { id: 'profile', label: 'My Profile', mobileLabel: 'Profile', icon: User },
]

const VIEW_CONTEXT = {
  today:    { label: 'Daily focus',   title: "What's next for you" },
  workouts: { label: 'Follow along',  title: 'Your training session' },
  meal:     { label: 'Nutrition',     title: 'What to eat today' },
  recover:  { label: 'Rest & repair', title: 'How to stay ready' },
  track:    { label: 'Results',       title: "How far you've come" },
  science:  { label: 'The reasoning', title: 'Why this plan works' },
  profile:  { label: 'Assessment answers', title: 'Your profile' },
}

const completionItems = [
  'I finished the warmup.',
  'I completed every exercise I could safely do.',
  'I wrote down the weight, reps, or effort for my main exercises.',
  'I checked how my body feels after the workout.',
]


// ─── Parsers and helpers ──────────────────────────────────────────────────────

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

function cleanLine(line) {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/[#[\]{}*_`~|^=<>•·]/g, '')
    .replace(/[—–-]/g, ', ')
    .trim()
}

function compactLines(markdown, limit = 7) {
  return markdown.split('\n').map(cleanLine).filter(Boolean).slice(0, limit)
}

function allCleanLines(content) {
  return content.split('\n').map(cleanLine).filter(Boolean)
}

function headingText(line) {
  return line.replace(/[:.]+$/g, '').trim().toLowerCase()
}

function isPlanHeading(line) {
  return /^(today first|workouts|meal plan|four week progression|recovery|track progress|why this works)$/i.test(headingText(line))
}

function sectionLines(content, heading, stopHeadings = []) {
  const lines = allCleanLines(content)
  const start = lines.findIndex((line) => headingText(line) === heading.toLowerCase())
  if (start === -1) return []
  const stops = stopHeadings.map((item) => item.toLowerCase())
  const end = lines.findIndex((line, index) => index > start && (stops.includes(headingText(line)) || isPlanHeading(line)))
  return lines.slice(start + 1, end > -1 ? end : undefined)
}

function sectionContent(content, heading) {
  const lines = allCleanLines(content)
  const start = lines.findIndex((line) => headingText(line) === heading.toLowerCase())
  if (start === -1) return ''
  const end = lines.findIndex((line, index) => index > start && isPlanHeading(line))
  return lines.slice(start, end > -1 ? end : undefined).join('\n')
}

const DETAIL_LABELS = ['warmup', 'sets', 'reps', 'weight', 'load', 'rest', 'tempo', 'cue', 'coach cue']

function readDetail(line, label) {
  const escapedLabels = DETAIL_LABELS.map((field) => field.replace(/\s+/g, '\\s+')).join('|')
  const pattern = new RegExp(
    `\\b${label.replace(/\s+/g, '\\s+')}\\s*:?\\s*(.*?)(?=\\s*,\\s*(?:${escapedLabels})\\s*:|\\s+(?:${escapedLabels})\\s*:|$)`,
    'i',
  )
  return line.match(pattern)?.[1]?.trim().replace(/[,.]\s*$/, '')
}

function hasExerciseDetail(line) {
  return /\bsets?\b|\breps?\b|\brest\b|\btempo\b|\bcue\b|\brpe\b|\brir\b/i.test(line)
}

function readSets(line) {
  return readDetail(line, 'sets') || line.match(/(\d+)\s+sets?/i)?.[1] || '3'
}

function readReps(line) {
  return readDetail(line, 'reps') || line.match(/(\d+\s*(to|,)\s*\d+|\d+)\s+reps?/i)?.[1]?.replace(/\s*,\s*/g, ' to ') || 'Follow plan'
}

function readRest(line) {
  return readDetail(line, 'rest') || line.match(/rest\s+([^,\\.]+)/i)?.[1]?.trim() || '60 to 90 seconds'
}

function readTempo(line) {
  return readDetail(line, 'tempo') || line.match(/tempo\s+([0-9,\s]+)/i)?.[1]?.replace(/\s+/g, '') || 'Controlled'
}

function readCue(line) {
  const explicit = readDetail(line, 'cue') || readDetail(line, 'coach cue')
  if (explicit) return explicit
  const stripped = line.replace(/^\d+\.\s*/, '')
  const afterColon = stripped.split(':').slice(1).join(':').trim().replace(/[.,]\s*$/, '')
  if (afterColon && afterColon.length > 10 && !hasExerciseDetail(afterColon)) return afterColon
  return 'Move with control and stop if anything feels unsafe.'
}

function readWeight(line) {
  return readDetail(line, 'weight') || readDetail(line, 'load') || 'Bodyweight or comfortable load'
}

function usesExternalWeight(weight) {
  return !/bodyweight|none|no weight/i.test(weight || '')
}

// Reads the Warmup: field and returns an array of { weight, reps } objects.
// e.g. "Warmup: 95x5, 135x3" → [{ weight:'95', reps:'5' }, { weight:'135', reps:'3' }]
function readWarmupSets(line) {
  const raw = readDetail(line, 'warmup')
  if (!raw || /none|n\/a/i.test(raw)) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg|x)?\s*[x×]\s*(\d+)/i)
      return m ? { weight: m[1], reps: m[2] } : null
    })
    .filter(Boolean)
}

// Extracts the superset label (e.g. "A1", "A2", "B1") if the line starts with "Superset Xn".
function supersetLabel(name) {
  const m = name.match(/^Superset\s+([A-Z]\d)\s+/i)
  return m ? m[1].toUpperCase() : null
}

function cleanExerciseName(name) {
  return name.replace(/^Superset\s+[A-Z]\d\s+/i, '').trim()
}

function exerciseName(line, index) {
  const stripped = line.replace(/^\d+\.\s*/, '')
  const beforeColon = stripped.split(':')[0]?.trim()
  if (beforeColon && beforeColon.length > 2 && beforeColon.length < 80 && !/workout|session|day/i.test(beforeColon)) {
    return beforeColon
  }
  const beforeComma = stripped.split(',')[0]?.trim()
  if (beforeComma && beforeComma.length > 2 && beforeComma.length < 80 && !hasExerciseDetail(beforeComma)) {
    return beforeComma
  }
  return `Exercise ${index + 1}`
}

function parseExercises(details) {
  const detailsArr = Array.isArray(details)
    ? details
    : typeof details === 'string'
      ? details.split('\n').map((s) => s.trim()).filter(Boolean)
      : []
  const usableDetails = detailsArr.filter((detail) => !/^(warmup|cooldown|note|focus)\b/i.test(detail.trim())).slice(0, 16)
  const source = usableDetails.length
    ? usableDetails
    : detailsArr.slice(0, 6).length
      ? detailsArr.slice(0, 6)
      : ['Exercise: Sets: 3, Reps: Follow plan, Rest: 60 seconds, Tempo: Controlled, Cue: Move with control.']

  return source.map((detail, index) => {
    const rawName = exerciseName(detail, index)
    const label = supersetLabel(rawName)
    const name = cleanExerciseName(rawName)
    return {
      id: `${index}-${detail.slice(0, 24)}`,
      name,
      supersetLabel: label,
      warmupSets: readWarmupSets(detail),
      sets: readSets(detail),
      reps: readReps(detail),
      weight: readWeight(detail),
      rest: readRest(detail),
      tempo: readTempo(detail),
      cue: readCue(detail),
      detail,
    }
  })
}

// Groups exercises into superset pairs or single slots.
// [{ type: 'single'|'superset', exercises: [...] }]
function groupExercises(exercises) {
  const groups = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    const lbl = ex.supersetLabel
    if (lbl && lbl.endsWith('1')) {
      const groupLetter = lbl.slice(0, 1)
      const partner = exercises[i + 1]
      if (partner?.supersetLabel === `${groupLetter}2`) {
        groups.push({ type: 'superset', label: groupLetter, exercises: [ex, partner] })
        i += 2
        continue
      }
    }
    groups.push({ type: 'single', exercises: [ex] })
    i++
  }
  return groups
}

function setCount(exercise) {
  const count = Number.parseInt(exercise.sets, 10)
  return Number.isFinite(count) && count > 0 ? Math.min(count, 8) : 3
}

function parseRestSeconds(restString) {
  const s = String(restString || '').toLowerCase()
  const number = '(\\d+(?:\\.\\d+)?)'
  const minUnit = '(?:mins?|minutes?)'
  const secUnit = '(?:secs?|seconds?)'
  const toSeconds = (value, unit) => {
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return 60
    if (new RegExp(minUnit, 'i').test(unit)) return parsed * 60
    return parsed
  }

  const mixed = s.match(new RegExp(`${number}\\s*${minUnit}\\s*(?:and\\s*)?${number}\\s*${secUnit}`))
  if (mixed) return Math.round(Number.parseFloat(mixed[1]) * 60 + Number.parseFloat(mixed[2]))

  const range = s.match(new RegExp(`${number}\\s*(?:to|-|\\u2013|,)\\s*${number}\\s*(${minUnit}|${secUnit})?`))
  if (range) {
    const unit = range[3] || (Number.parseFloat(range[1]) <= 5 && Number.parseFloat(range[2]) <= 5 ? 'min' : 'sec')
    return Math.min(300, Math.round((toSeconds(range[1], unit) + toSeconds(range[2], unit)) / 2))
  }

  const withUnit = s.match(new RegExp(`${number}\\s*(${minUnit}|${secUnit})`))
  if (withUnit) return Math.min(300, Math.round(toSeconds(withUnit[1], withUnit[2])))

  const single = s.match(new RegExp(number))
  if (!single) return 60
  const value = Number.parseFloat(single[1])
  return Math.min(300, Math.round(value <= 5 ? value * 60 : value))
}

// Extract a meal's macro breakdown from its details string. Looks for a "Macros:" marker
// (what the plan prompt asks for) and parses calories + grams of protein, carbs, and fat.
// Returns the parsed values plus the details with the macro segment removed, or null.
function extractMacros(text) {
  if (!text) return null
  const idx = text.search(/macros\s*:/i)
  if (idx === -1) return null

  const segment = text.slice(idx)
  const rest = text.slice(0, idx).replace(/[,\s]+$/, '')
  const grab = (re) => {
    const m = segment.match(re)
    return m ? Number(m[1]) : null
  }
  const values = {
    calories: grab(/(\d+)\s*(?:k?cal|calories)/i),
    protein: grab(/(\d+)\s*g\s*(?:protein|pro)\b/i),
    carbs: grab(/(\d+)\s*g\s*(?:carbs?|carbohydrates?)/i),
    fat: grab(/(\d+)\s*g\s*fat\b/i),
  }
  if (values.calories == null && values.protein == null && values.carbs == null && values.fat == null) {
    return null
  }
  return { values, rest }
}

function parseMealPlan(content) {
  const mealLines = sectionLines(content, 'Meal Plan', ['Four Week Progression', 'Recovery', 'Track Progress', 'Why This Works'])
  const source = mealLines.length
    ? mealLines
    : sectionLines(content, 'Recovery', ['Track Progress', 'Why This Works']).filter((line) =>
        /meal|breakfast|lunch|dinner|snack|protein|carb|nutrition|water|hydration|prep|grocery/i.test(line),
      )

  const fallback = [
    'Grocery List: Eggs, Greek yogurt, chicken breast, lean ground turkey, salmon, oats, rice, potatoes, berries, vegetables, olive oil, nuts.',
    'Protein Target: Aim for a protein serving at each meal.',
    'Water Target: Drink water steadily through the day.',
    'Breakfast Option 1: Eggs, oats, berries, water.',
    'Breakfast Option 2: Greek yogurt, fruit, nuts.',
    'Breakfast Option 3: Protein smoothie, banana, oats.',
    'Breakfast Option 4: Turkey egg wrap, fruit.',
    'Lunch Option 1: Chicken, rice, vegetables, olive oil.',
    'Lunch Option 2: Turkey bowl, potatoes, salad.',
    'Lunch Option 3: Tuna or salmon wrap, fruit.',
    'Lunch Option 4: Lean protein salad, whole grain toast.',
    'Dinner Option 1: Salmon, potatoes, vegetables.',
    'Dinner Option 2: Chicken stir fry, rice.',
    'Dinner Option 3: Lean turkey pasta, salad.',
    'Dinner Option 4: Steak or tofu, vegetables, rice.',
    'Pre Workout: Carbs and water 60 to 90 minutes before training.',
    'Post Workout: Protein, carbs, and water after training.',
    'Prep Steps: Cook protein, prepare carbs, wash vegetables, portion snacks.',
  ]
  const lines = source.length ? source : fallback

  // Known meal-plan labels. The model sometimes puts the label on its own line
  // and the ingredients on following lines, so we detect labels and merge any
  // continuation lines into the most recent labeled item.
  const MEAL_LABEL = /^(grocery list|protein target|calorie target|water target|carb target|fat target|breakfast option \d+|lunch option \d+|dinner option \d+|snack|pre workout|post workout|training day intake|rest day intake|prep steps)\b/i

  function appendDetail(item, piece) {
    const clean = piece.replace(/^[,\s]+/, '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    item.details = item.details ? `${item.details}, ${clean}` : clean
    item.details = item.details.replace(/,\s*,+/g, ',').replace(/,\s*$/, '')
  }

  const parsed = []
  for (const rawLine of lines) {
    // Strip leading commas/spaces. The model often prefixes labels and items
    // with ", " (from bullet points converted to commas), which would otherwise
    // hide the label from detection.
    const line = rawLine.replace(/^[,\s]+/, '').trim()
    if (!line) continue
    const colonIdx = line.indexOf(':')
    const labelCandidate = (colonIdx > -1 ? line.slice(0, colonIdx) : line).trim()

    if (MEAL_LABEL.test(labelCandidate)) {
      const item = { title: labelCandidate, details: '' }
      if (colonIdx > -1) appendDetail(item, line.slice(colonIdx + 1))
      parsed.push(item)
    } else if (parsed.length) {
      appendDetail(parsed[parsed.length - 1], line)
    }
  }

  // Pull the trailing "Macros: NNN calories, NNg protein, NNg carbs, NNg fat" off each
  // meal option so it renders as clean chips instead of as ingredient bullets.
  for (const item of parsed) {
    const macros = extractMacros(item.details)
    if (macros) {
      item.macros = macros.values
      item.details = macros.rest
    }
  }

  function byTitle(pattern) {
    return parsed.filter((item) => pattern.test(item.title))
  }

  const matchedTitles = /grocery|target|intake|breakfast|lunch|dinner|snack|pre workout|post workout|prep/i

  return {
    grocery: byTitle(/grocery/i),
    targets: byTitle(/target|intake/i),
    breakfast: byTitle(/breakfast/i).slice(0, 4),
    lunch: byTitle(/lunch/i).slice(0, 4),
    dinner: byTitle(/dinner/i).slice(0, 4),
    workout: byTitle(/snack|pre workout|post workout/i),
    prep: byTitle(/prep/i),
    other: parsed.filter((item) => !matchedTitles.test(item.title)),
    all: parsed,
  }
}

function parseWorkouts(content, fallbackItems) {
  const explicitWorkoutLines = sectionLines(content, 'Workouts', ['Meal Plan', 'Four Week Progression', 'Recovery', 'Track Progress', 'Why This Works'])
  const lines = explicitWorkoutLines.length ? explicitWorkoutLines : compactLines(extractSection(content, ['workouts', 'session', 'day'], 3000), 80)
  const fallbackWorkoutItems = fallbackItems.length
    ? fallbackItems
    : [
        'Goblet squat, Sets: 3, Reps: 10, Rest: 60 seconds, Tempo: 3,1,2,0, Cue: Keep your chest tall.',
        'Push up, Sets: 3, Reps: 8, Rest: 60 seconds, Tempo: 2,1,2,0, Cue: Keep your body straight.',
        'Plank, Sets: 3, Reps: 30 seconds, Rest: 45 seconds, Tempo: Controlled, Cue: Breathe slowly.',
      ]
  const exerciseLines = lines.filter(hasExerciseDetail)
  const boundaryIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      if (hasExerciseDetail(line)) return false
      return /^(workout|session|day)\s*(one|two|three|four|five|six|\d+|[a-f])\b|^(upper|lower|full body|push|pull|legs)\b/i.test(line)
    })

  if (!boundaryIndexes.length) {
    const details = exerciseLines.length ? exerciseLines : fallbackWorkoutItems
    return [{ title: 'Workout one', summary: details[0] || 'Your first guided workout.', details }]
  }

  return boundaryIndexes
    .slice(0, 8)
    .map(({ line, index }, itemIndex) => {
      const next = boundaryIndexes[itemIndex + 1]?.index || lines.length
      const sectionLines = lines.slice(index + 1, next)
      const structured = sectionLines.filter(hasExerciseDetail).slice(0, 10)
      const unstructured = sectionLines
        .filter((l) => !hasExerciseDetail(l) && l.trim().length > 10)
        .slice(0, 10)
      const details = structured.length ? structured : unstructured.length ? unstructured : fallbackWorkoutItems
      return { title: line, summary: details[0] || 'A focused workout from your plan.', details }
    })
    .filter((workout) => workout.details.length)
}

// ─── UI components ─────────────────────────────────────────────────────────────

function FocusCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-line bg-[#111] p-3 sm:p-4">
      <div className="mb-2 grid h-8 w-8 place-items-center rounded bg-accent text-black sm:mb-3 sm:h-9 sm:w-9">
        <Icon size={17} />
      </div>
      <p className="font-heading text-[11px] uppercase text-body sm:text-sm">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-tight text-white sm:text-lg">{value}</p>
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

function OverviewCard({ icon: Icon, label, title, children }) {
  return (
    <section className="rounded-lg border border-line bg-[#111] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-accent text-black">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-sm uppercase text-accent">{label}</p>
          <h4 className="break-words font-heading text-2xl uppercase leading-none text-white">{title}</h4>
        </div>
      </div>
      {children}
    </section>
  )
}

function RestTimer({ restString, onDone }) {
  const firedRef = useRef(false)
  const total = parseRestSeconds(restString)
  const [remaining, setRemaining] = useState(total)

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onDone])

  const pct = total > 0 ? remaining / total : 0

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-sm uppercase text-accent">Rest</p>
          <p className="font-heading text-4xl uppercase leading-none text-white">{remaining}s</p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line bg-card px-5 py-2 font-heading text-base uppercase text-white transition hover:border-accent"
        >
          Skip
        </button>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all duration-1000" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

// ─── Today view ───────────────────────────────────────────────────────────────

function TodayView({ sections, mealPlan, nextWorkout, week, onViewChange }) {
  const weekNum = week
  const todayWorkout = nextWorkout
  const firstMeal = mealPlan.breakfast[0] || mealPlan.all[0]

  return (
    <div className="grid gap-4 sm:gap-5">
      {weekNum ? (
        <div className="rounded-lg border border-line bg-[#111] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-sm uppercase text-accent">Block progress</p>
              <p className="font-heading text-2xl uppercase text-white">Week {weekNum} of 4</p>
            </div>
            <p className="font-heading text-3xl uppercase text-white">{Math.round((weekNum / 4) * 100)}%</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(weekNum / 4) * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
          <p className="font-heading text-sm uppercase text-accent">Start here</p>
          <h3 className="mt-1 font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Do one thing at a time.</h3>
          <p className="mt-2 text-sm leading-6 text-body">
            Your plan is ready. Use this screen to see today's focus, then open a tab for the full details.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-[#111] p-4">
        <p className="font-heading text-sm uppercase text-accent">{todayWorkout ? 'Your next workout' : 'Today'}</p>
        {todayWorkout ? (
          <>
            <h3 className="mt-1 break-words font-heading text-3xl uppercase leading-none text-white">{todayWorkout.title}</h3>
            <p className="mt-2 text-sm leading-6 text-body">
              {parseExercises(todayWorkout.details).length} exercises ready in guided mode.
            </p>
            <button
              type="button"
              onClick={() => onViewChange('workouts')}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 font-heading text-lg uppercase text-black transition hover:bg-white"
            >
              <Play size={18} />
              Start Workout
            </button>
          </>
        ) : (
          <>
            <h3 className="mt-1 font-heading text-3xl uppercase leading-none text-white">Rest Day</h3>
            <p className="mt-2 text-sm leading-6 text-body">
              Rest is part of the program. Focus on sleep, hydration, and light movement today.
            </p>
            <button
              type="button"
              onClick={() => onViewChange('recover')}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-card px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
            >
              Recovery tips
            </button>
          </>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard icon={Dumbbell} label="Next workout" title={nextWorkout?.title || 'Workout one'}>
          <p className="text-sm leading-6 text-body">
            {parseExercises(nextWorkout?.details || []).length} exercises ready in guided mode.
          </p>
          <button
            type="button"
            onClick={() => onViewChange('workouts')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-heading text-lg uppercase text-black transition hover:bg-white"
          >
            Open Workouts
          </button>
        </OverviewCard>

        <OverviewCard icon={Utensils} label="Food focus" title={firstMeal?.title || 'Meal plan'}>
          <p className="text-sm leading-6 text-body">{firstMeal?.details || "Use the meal plan tab to see today's nutrition steps."}</p>
          <button
            type="button"
            onClick={() => onViewChange('meal')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-card px-4 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            Open Meals
          </button>
        </OverviewCard>

        <OverviewCard icon={ClipboardCheck} label="Track" title="Log progress">
          <p className="text-sm leading-6 text-body">
            {sections.today[0] || 'Record your weights, reps, and how you felt after each session.'}
          </p>
          <button
            type="button"
            onClick={() => onViewChange('track')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-card px-4 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            Track Progress
          </button>
        </OverviewCard>
      </div>

      <section className="rounded-lg border border-line bg-[#111] p-4">
        <div className="mb-4">
          <p className="font-heading text-sm uppercase text-accent">Daily checklist</p>
          <h4 className="font-heading text-2xl uppercase text-white">Today's clear actions</h4>
        </div>
        <Checklist items={sections.today.slice(0, 4).length ? sections.today.slice(0, 4) : completionItems.slice(0, 4)} />
      </section>
    </div>
  )
}


// ─── Simple section (recover, track, week text) ───────────────────────────────

function SimpleSection({ label, title, items }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="font-heading text-sm uppercase text-accent">{label}</p>
        <h4 className="mt-1 font-heading text-3xl uppercase leading-none text-white">{title}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
          This tab keeps one part of the program separate so the dashboard stays easy to follow.
        </p>
      </div>
      <Checklist items={items} />
    </div>
  )
}

function ScienceBreakdown({ content }) {
  const scienceContent =
    sectionContent(content, 'Why This Works') ||
    'Why This Works\nThis section will appear here when the generated plan includes the science explanation.'

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="font-heading text-sm uppercase text-accent">Science</p>
        <h4 className="mt-1 font-heading text-3xl uppercase leading-none text-white">Why this works.</h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
          This keeps the deeper explanation focused on the reasoning behind the plan.
        </p>
      </div>
      <section className="rounded-lg border border-line bg-[#111] p-4">
        <FormattedMessage content={scienceContent} />
      </section>
    </div>
  )
}

// ─── Meal plan ────────────────────────────────────────────────────────────────



function MacroChips({ macros }) {
  if (!macros) return null
  const chips = [
    macros.calories != null && { label: 'Cal', value: macros.calories },
    macros.protein != null && { label: 'Protein', value: `${macros.protein}g` },
    macros.carbs != null && { label: 'Carbs', value: `${macros.carbs}g` },
    macros.fat != null && { label: 'Fat', value: `${macros.fat}g` },
  ].filter(Boolean)
  if (!chips.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-baseline gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs leading-none text-white"
        >
          <span className="font-heading uppercase text-[10px] text-accent">{chip.label}</span>
          <span className="font-bold">{chip.value}</span>
        </span>
      ))}
    </div>
  )
}

function MealSection({ items, checkedItems, onToggleItem, offset = 0, compact = false }) {
  if (!items.length) return null

  return (
    <section className="min-h-64 rounded-lg border border-line bg-[#111] p-4">
      <div className={`mt-3 grid gap-3 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'}`}>
        {items.map((item, index) => {
          const itemIndex = offset + index
          const checked = Boolean(checkedItems[itemIndex])
          const ingredients = item.details
            ? item.details.split(',').map((s) => s.trim()).filter(Boolean)
            : []

          return (
            <label
              key={`${item.title}-${itemIndex}`}
              className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                checked ? 'border-accent bg-accent/10' : 'border-line bg-card hover:border-accent/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleItem(itemIndex)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#e8ff47]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-heading text-lg uppercase leading-none text-white">{item.title}</span>
                  <MacroChips macros={item.macros} />
                  {ingredients.length > 0 && (
                    <ul className="mt-2 grid gap-1">
                      {ingredients.map((ingredient, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-6 text-body">
                          <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden="true" />
                          <span>{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </section>
  )
}

function MealPlan({ items }) {
  const [activeGroup, setActiveGroup] = useState('Grocery list')
  const [checkedItems, setCheckedItems] = useState({})
  const orderedItems = [
    ...items.grocery, ...items.targets, ...items.breakfast,
    ...items.lunch, ...items.dinner, ...items.workout,
  ]

  function toggleItem(index) {
    setCheckedItems((current) => ({ ...current, [index]: !current[index] }))
  }

  const completed = orderedItems.filter((_, index) => checkedItems[index]).length
  const groups = [
    { title: 'Grocery list', list: items.grocery, compact: true },
    { title: 'Targets and goals', list: items.targets },
    { title: 'Breakfast options', list: items.breakfast },
    { title: 'Lunch options', list: items.lunch },
    { title: 'Dinner options', list: items.dinner },
    { title: 'Workout meals and timing', list: items.workout },
  ].reduce((result, group) => {
    const offset = result.offset
    result.items.push({ ...group, offset })
    result.offset += group.list.length
    return result
  }, { items: [], offset: 0 }).items

  const visibleGroups = groups.filter((group) => group.list.length)
  const selectedGroup = visibleGroups.find((group) => group.title === activeGroup) || visibleGroups[0]

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-sm uppercase text-accent">Meal plan</p>
            <h4 className="font-heading text-3xl uppercase leading-none text-white">Eat to support the goal.</h4>
            <p className="mt-2 text-sm leading-6 text-body">Choose a category, then open only the details you need right now.</p>
          </div>
          <div className="rounded-lg border border-line bg-card p-3 text-center">
            <p className="font-heading text-sm uppercase text-body">Completed</p>
            <p className="text-2xl font-bold text-white">{completed}/{orderedItems.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {visibleGroups.map((group) => (
          <button
            key={group.title}
            type="button"
            onClick={() => setActiveGroup(group.title)}
            className={`min-h-12 rounded-lg border px-3 text-left font-heading text-base uppercase transition sm:text-lg ${
              selectedGroup?.title === group.title
                ? 'border-accent bg-accent text-black'
                : 'border-line bg-[#111] text-white hover:border-accent/70'
            }`}
          >
            {group.title}
          </button>
        ))}
      </div>

      {selectedGroup ? (
        <MealSection
          items={selectedGroup.list}
          checkedItems={checkedItems}
          onToggleItem={toggleItem}
          offset={selectedGroup.offset}
          compact={selectedGroup.compact}
        />
      ) : null}
    </div>
  )
}

// ─── Workout phase indicator ─────────────────────────────────────────────────

const WORKOUT_PHASES = [
  { id: 'preview', label: 'Overview' },
  { id: 'warmup',  label: 'Warm-up' },
  { id: 'active',  label: 'Exercise' },
  { id: 'resting', label: 'Rest' },
]

function WorkoutPhaseBar({ phase }) {
  const currentIdx = WORKOUT_PHASES.findIndex((p) => p.id === phase)
  return (
    <div className="mb-4 flex items-start gap-1.5 sm:gap-2">
      {WORKOUT_PHASES.map((p, i) => (
        <div key={p.id} className="flex flex-1 flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${i <= currentIdx ? 'bg-accent' : 'bg-line'}`} />
          <span className={`font-heading text-[10px] uppercase transition-colors ${i === currentIdx ? 'text-accent' : i < currentIdx ? 'text-accent/50' : 'text-body/40'}`}>
            {p.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Workout tracker ──────────────────────────────────────────────────────────

const BLOCK_WEEKS = 4

// The active workout is the first one not yet completed, so a saved cursor survives reloads
// instead of snapping back to the first session.
function firstIncompleteWorkout(done, total) {
  if (!total) return 0
  let i = 0
  while (i < total && done.includes(i)) i++
  return Math.min(i, total - 1)
}

function clampWeek(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? Math.min(BLOCK_WEEKS, Math.max(1, n)) : 1
}

// Every session in the current week has been completed.
function allSessionsDone(completedWorkouts, total) {
  return total > 0 && Array.from({ length: total }, (_, i) => i).every((i) => completedWorkouts.includes(i))
}

// ─── Clean workout player ────────────────────────────────────────────────────
//
// Single phase enum drives the entire UI. No booleans or null-encodes-state.
//
//   preview → start → warmup (first exercise has warmups) or active
//   warmup  → done  → warmup (more sets) or active
//   active  → logSet→ superset A1: stay active, show A2 (no rest)
//                      A2 or single, more rounds: rest → active
//                      A2 or single, last round, more groups: rest → warmup|active (next group)
//                      A2 or single, last round, last group: rest → active (workout done)
//   resting → done/skip → active or warmup (via pendingPhaseRef)
//
// Position inside a session: (groupIdx, round, step)
//   groupIdx — which exercise group (single or superset pair)
//   round    — set round, 0-based (0 = first set, totalRounds-1 = last set)
//   step     — 0 = single/A1,  1 = A2 (supersets only)
//
// enterGroup() always initialises warm-ups for EVERY group, not just the first.

function WorkoutTracker({ workouts, log = {}, onLogChange }) {
  // ── Persisted state ──────────────────────────────────────────────────────
  const initialCompleted = Array.isArray(log.completedWorkouts) ? log.completedWorkouts : []
  const [workoutIdx, setWorkoutIdx] = useState(() => firstIncompleteWorkout(initialCompleted, workouts.length))
  const [completedWorkouts, setCompletedWorkouts] = useState(initialCompleted)
  // rounds[id] = count of completed set-rounds per exercise (number, normalised from legacy arrays)
  const [rounds, setRounds] = useState(() => {
    const raw = log.completedSets || {}
    const out = {}
    for (const [k, v] of Object.entries(raw))
      out[k] = Array.isArray(v) ? v.length : (typeof v === 'number' ? v : 0)
    return out
  })
  const [exerciseWeights, setExerciseWeights] = useState(() => log.exerciseWeights || {})
  const [history, setHistory] = useState(() => (Array.isArray(log.history) ? log.history : []))
  const [week, setWeek] = useState(() => clampWeek(log.week))

  // ── Session navigation ───────────────────────────────────────────────────
  const [phase, setPhase] = useState('preview') // 'preview' | 'warmup' | 'active' | 'resting'
  const [groupIdx, setGroupIdx] = useState(0)
  const [round, setRound] = useState(0)   // which set-round we are on (0-based)
  const [step, setStep] = useState(0)     // 0 = single/A1, 1 = A2
  const [warmupIdx, setWarmupIdx] = useState(0)
  const [restKey, setRestKey] = useState(0)
  const [restString, setRestString] = useState('')
  // What phase to restore after rest completes or is skipped.
  const pendingPhaseRef = useRef('active')
  const activeExerciseRef = useRef(null)

  // ── Modal / accordion ────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState(-1)

  // ── Sync to parent ────────────────────────────────────────────────────────
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    // Persist as the same array-of-indices shape so the rest of the app stays compatible.
    const completedSets = Object.fromEntries(
      Object.entries(rounds).map(([k, n]) => [k, Array.from({ length: n }, (_, i) => i)])
    )
    onLogChange?.({ completedWorkouts, completedSets, exerciseWeights, history, week })
  }, [completedWorkouts, rounds, exerciseWeights, history, week, onLogChange])

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeWorkout = workouts[workoutIdx] || workouts[0]
  const exercises = useMemo(() => parseExercises(activeWorkout?.details || []), [activeWorkout?.details])
  const groups = useMemo(() => groupExercises(exercises), [exercises])
  const currentGroup = groups[groupIdx] || null
  const isSuperset = currentGroup?.type === 'superset'
  const currentExercise = currentGroup?.exercises[step] || null
  const totalRounds = currentGroup ? setCount(currentGroup.exercises[0]) : 3

  // Group progress: count from the primary (A1/single) exercise.
  const doneRoundsForGroup = currentGroup ? (rounds[currentGroup.exercises[0].id] || 0) : 0

  // Workout done when every group's primary exercise has all rounds logged.
  const workoutDone = groups.length > 0 &&
    groups.every((g) => (rounds[g.exercises[0].id] || 0) >= setCount(g.exercises[0]))

  // Done-count for the header (individual exercises, not groups).
  const doneExCount = exercises.filter((e) => (rounds[e.id] || 0) >= setCount(e)).length

  const weekComplete = allSessionsDone(completedWorkouts, workouts.length)

  const lastLogged = useMemo(() => {
    if (!currentExercise) return null
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].id === currentExercise.id) return history[i]
    }
    return null
  }, [history, currentExercise])

  const warmupSets = currentGroup?.exercises[0]?.warmupSets || []
  const currentWarmupSet = warmupSets[warmupIdx] || null

  // ── Navigation helpers ────────────────────────────────────────────────────

  const scrollToActiveExercise = useCallback(() => {
    window.requestAnimationFrame(() => {
      activeExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  // Enter a group: always starts warm-ups if the first exercise has them.
  // When afterRest=true we only set the pending phase (the rest timer will apply it).
  function enterGroup(gIdx, afterRest) {
    const g = groups[gIdx] || groups[0]
    if (!g) {
      if (!afterRest) setPhase('active')
      else pendingPhaseRef.current = 'active'
      return
    }
    const hasWarmup = (g.exercises[0].warmupSets?.length || 0) > 0
    setGroupIdx(gIdx)
    setRound(0)
    setStep(0)
    setWarmupIdx(0)
    if (afterRest) {
      pendingPhaseRef.current = hasWarmup ? 'warmup' : 'active'
    } else {
      setPhase(hasWarmup ? 'warmup' : 'active')
    }
  }

  function startWorkout() {
    if (clearRounds) setRounds({})
    enterGroup(0, false)
  }

  function resetSession(clearRounds = false) {
    setPhase('preview')
    setGroupIdx(0)
    setRound(0)
    setStep(0)
    setWarmupIdx(0)
    if (clearRounds) setRounds({})
    pendingPhaseRef.current = 'active'
  }

  // ── Warm-up ───────────────────────────────────────────────────────────────

  function doneWarmup() {
    if (warmupIdx < warmupSets.length - 1) {
      setWarmupIdx((w) => w + 1)
    } else {
      setPhase('active')
    }
  }

  // ── Set logging ───────────────────────────────────────────────────────────

  function startRest(str, afterRestPhase) {
    pendingPhaseRef.current = afterRestPhase
    setRestString(str)
    setRestKey((k) => k + 1)
    setPhase('resting')
  }

  function logSet() {
    if (!currentExercise || phase !== 'active') return

    if (isSuperset && step === 0) {
      // A1 done → show A2 immediately, no rest
      setStep(1)
      scrollToActiveExercise()
      return
    }

    // A2 or single: mark round done, then decide what comes next
    const primaryId = currentGroup.exercises[0].id
    const updates = { [primaryId]: (rounds[primaryId] || 0) + 1 }
    if (isSuperset) {
      const a2Id = currentGroup.exercises[1].id
      updates[a2Id] = (rounds[a2Id] || 0) + 1
    }
    setRounds((prev) => ({ ...prev, ...updates }))

    const nextRound = round + 1
    const restStr = currentExercise.rest

    if (nextRound < totalRounds) {
      // More rounds in this group → rest, then resume same group
      setRound(nextRound)
      setStep(0)
      startRest(restStr, 'active')
      scrollToActiveExercise()
    } else {
      // All rounds done — advance to next group (if any) after rest
      const nextG = groupIdx + 1
      if (nextG < groups.length) {
        const g = groups[nextG]
        const nextPhase = (g.exercises[0].warmupSets?.length || 0) > 0 ? 'warmup' : 'active'
        setGroupIdx(nextG)
        setRound(0)
        setStep(0)
        setWarmupIdx(0)
        pendingPhaseRef.current = nextPhase
        startRest(restStr, nextPhase)
        scrollToActiveExercise()
      } else {
        // Last group finished
        startRest(restStr, 'active')
        scrollToActiveExercise()
      }
    }
  }

  const afterRest = useCallback(() => {
    setPhase(pendingPhaseRef.current || 'active')
    pendingPhaseRef.current = 'active'
    scrollToActiveExercise()
  }, [scrollToActiveExercise])

  // ── Workout completion ─────────────────────────────────────────────────────

  function completeWorkout() {
    if (!workoutDone) return
    const stamp = new Date().toISOString()
    const entries = exercises
      .map((ex) => ({ ex, weight: (exerciseWeights[ex.id] || '').toString().trim() }))
      .filter(({ weight }) => weight)
      .map(({ ex, weight }) => ({ id: ex.id, name: ex.name, weight, workout: activeWorkout.title, date: stamp }))
    if (entries.length) setHistory((prev) => [...prev, ...entries])
    setCompletedWorkouts((prev) => [...new Set([...prev, workoutIdx])])
    setWorkoutIdx((prev) => Math.min(prev + 1, workouts.length - 1))
    resetSession(true)
  }



  function updateWeight(id, value) {
    setExerciseWeights((prev) => ({ ...prev, [id]: value }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-4 sm:gap-5">

      {/* ── Full-screen workout modal ─────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#080808]">

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line bg-card px-4 py-3 sm:px-5">
            <button type="button" onClick={() => setModalOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-[#111] text-white transition hover:border-accent">
              <X size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base uppercase leading-none text-white">{activeWorkout.title}</p>
              <p className="mt-0.5 text-xs text-body">
                {phase === 'preview'
                  ? `${exercises.length} exercises · tap to preview`
                  : `${doneExCount} of ${exercises.length} complete`}
              </p>
            </div>
            {phase !== 'preview' && exercises.length > 0 && (
              <div className="flex shrink-0 gap-1">
                {exercises.slice(0, 10).map((ex, i) => {
                  const done = (rounds[ex.id] || 0) >= setCount(ex)
                  return <span key={i} className={`h-2 w-2 rounded-full transition ${done ? 'bg-accent' : 'bg-line'}`} />
                })}
              </div>
            )}
          </div>

          {/* Warm-up banner */}
          {phase === 'warmup' && currentWarmupSet && (
            <div className="shrink-0 border-b border-amber-400/30 bg-amber-400/5 px-4 py-4">
              <p className="font-heading text-xs uppercase text-amber-300">Warm-up {warmupIdx + 1} of {warmupSets.length}</p>
              <p className="mt-1 font-heading text-2xl uppercase text-white">{currentGroup.exercises[0].name}</p>
              <p className="mt-2 font-heading text-3xl text-white">
                {currentWarmupSet.weight} lbs <span className="text-xl font-normal text-body">× {currentWarmupSet.reps} reps</span>
              </p>
              <p className="mt-1 text-sm text-body">Light and controlled — prime the movement.</p>
              <button type="button" onClick={doneWarmup}
                className="mt-3 w-full rounded-lg bg-amber-400/20 py-3 font-heading text-lg uppercase text-amber-200 transition hover:bg-amber-400/30">
                {warmupIdx < warmupSets.length - 1 ? 'Next Warm-up Set' : 'Start Working Sets'}
              </button>
            </div>
          )}

          {/* Rest banner */}
          {phase === 'resting' && (
            <div className="shrink-0 border-b border-line bg-[#0f0f0f] px-4 py-4">
              <p className="font-heading text-xs uppercase text-accent">
                Rest · Set {round + 1 <= totalRounds ? round + 1 : totalRounds} of {totalRounds} logged
              </p>
              <div className="mt-2">
                <RestTimer key={restKey} restString={restString} onDone={afterRest} />
              </div>
              <button type="button" onClick={afterRest}
                className="mt-3 w-full rounded-lg border border-line bg-card py-3 font-heading text-base uppercase text-white transition hover:border-accent">
                Skip Rest
              </button>
            </div>
          )}

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto">
            {groups.map((group, gi) => {
              const primaryEx = group.exercises[0]
              const doneRounds = rounds[primaryEx.id] || 0
              const exDone = doneRounds >= setCount(primaryEx)
              const isCurrentGroup = gi === groupIdx
              const isActiveGroup = isCurrentGroup && phase !== 'preview'
              const isManuallyExpanded = expandedGroup === gi
              const isExpanded = isManuallyExpanded || (isActiveGroup && phase === 'active')

              return (
                <div
                  key={gi}
                  ref={isCurrentGroup && phase !== 'preview' ? activeExerciseRef : null}
                  className={`border-b border-line ${isActiveGroup && !exDone ? 'bg-accent/5' : ''}`}
                >
                  {/* Row button */}
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isManuallyExpanded ? -1 : gi)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-heading text-sm transition ${
                      exDone ? 'bg-accent text-black' : isActiveGroup ? 'border-2 border-accent text-accent' : 'bg-line text-body'
                    }`}>
                      {exDone ? <CheckCircle2 size={15} /> : gi + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words font-heading text-xl uppercase leading-none transition ${
                        exDone ? 'text-body/50 line-through' : isActiveGroup ? 'text-accent' : 'text-white'
                      }`}>
                        {group.type === 'superset'
                          ? `${primaryEx.name} + ${group.exercises[1].name}`
                          : primaryEx.name}
                      </p>
                      <p className="mt-0.5 text-sm text-body">
                        {primaryEx.sets} sets · {primaryEx.reps}
                        {group.type === 'superset' ? ' · Superset' : ''}
                        {isActiveGroup && !exDone ? ` · Set ${round + 1}/${totalRounds}` : ''}
                      </p>
                    </div>
                    <ChevronDown size={18} className={`shrink-0 text-body transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-line/40 px-4 pb-5 pt-4">
                      {group.exercises.map((ex, ei) => {
                        const isActiveStep = isCurrentGroup && phase === 'active' && step === ei
                        const exLastLogged = (() => {
                          for (let i = history.length - 1; i >= 0; i--) {
                            if (history[i].id === ex.id) return history[i]
                          }
                          return null
                        })()
                        return (
                          <div key={ex.id} className={ei > 0 ? 'mt-5 border-t border-line pt-5' : ''}>
                            {group.type === 'superset' && (
                              <p className="mb-2 font-heading text-xs uppercase text-accent">
                                {group.label}{ei + 1} — {ei === 0 ? 'go first, then immediately' : 'go second, then rest'}
                              </p>
                            )}
                            <p className="font-heading text-xl uppercase text-white">{ex.name}</p>

                            {/* Stats */}
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {[['Sets', ex.sets], ['Reps', ex.reps], ['Weight', ex.weight], ['Rest', ex.rest]].map(([label, val]) => (
                                <div key={label} className="rounded-lg border border-line bg-card p-2.5">
                                  <p className="font-heading text-xs uppercase text-body">{label}</p>
                                  <p className="mt-0.5 font-bold text-white">{val}</p>
                                </div>
                              ))}
                            </div>

                            {/* Cue */}
                            {ex.cue && (
                              <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                                <p className="text-sm leading-6 text-body">{ex.cue}</p>
                              </div>
                            )}

                            {/* Active-step controls */}
                            {isActiveStep && (
                              <>
                                {totalRounds > 1 && (
                                  <div className="mt-4 flex items-center gap-1.5">
                                    {Array.from({ length: totalRounds }, (_, i) => (
                                      <span key={i} className={`h-2 flex-1 rounded-full transition-all ${
                                        i < doneRoundsForGroup ? 'bg-accent' : i === round ? 'bg-accent/50' : 'bg-line'
                                      }`} />
                                    ))}
                                    <span className="ml-1 shrink-0 text-xs text-body">Set {round + 1}/{totalRounds}</span>
                                  </div>
                                )}
                                <div className="mt-4">
                                  <label className="block">
                                    <span className="mb-2 block font-heading text-sm uppercase text-white">Log weight</span>
                                    <input type="text"
                                      value={exerciseWeights[ex.id] || ''}
                                      onChange={(e) => updateWeight(ex.id, e.target.value)}
                                      placeholder="e.g. 95 lbs, 45 kg, bodyweight"
                                      className="w-full rounded-lg border border-line bg-[#0d0d0d] px-4 py-3 text-white outline-none transition placeholder:text-[#555] focus:border-accent"
                                    />
                                  </label>
                                  {exLastLogged && (
                                    <p className="mt-1.5 text-sm text-body">Last time: <span className="font-bold text-accent">{exLastLogged.weight}</span></p>
                                  )}
                                </div>
                                <button type="button" onClick={logSet}
                                  className="mt-4 w-full rounded-lg bg-accent py-4 font-heading text-xl uppercase text-black transition hover:brightness-95">
                                  {isSuperset && step === 0
                                    ? `Log Set · Next: ${group.exercises[1].name}`
                                    : `Log Set ${round + 1} of ${totalRounds}`}
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="h-8" />
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-line bg-card px-4 py-3 sm:px-5">
            {phase === 'preview' ? (
              <button type="button" onClick={startWorkout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-4 font-heading text-xl uppercase text-black transition hover:brightness-95">
                <Play size={20} /> Start Workout
              </button>
            ) : workoutDone ? (
              <button type="button" onClick={() => { completeWorkout(); setModalOpen(false) }}
                className="w-full rounded-lg bg-accent py-4 font-heading text-xl uppercase text-black transition hover:brightness-95">
                {workoutIdx >= workouts.length - 1 ? 'Complete Final Session' : 'Complete · Unlock Next Session'}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-body">{doneExCount} of {exercises.length} exercises done</p>
                <button type="button" onClick={() => resetSession(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-[#111] px-4 py-2.5 font-heading text-base uppercase text-white transition hover:border-accent">
                  <RotateCcw size={16} /> Restart
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Session list ─────────────────────────────────────────────────── */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="font-heading text-xl uppercase text-white">Week {week} of {BLOCK_WEEKS}</p>
          <p className="text-sm text-body">{workouts.length} sessions</p>
        </div>
        {workouts.map((workout, index) => {
          const isCurrent = index === workoutIdx
          const isDone = completedWorkouts.includes(index)
          const isLocked = !isDone && index > workoutIdx
          const inProgress = isCurrent && phase !== 'preview'
          return (
            <div key={`${workout.title}-${index}`}
              className={`rounded-lg border p-4 transition ${
                isCurrent && !isDone ? 'border-accent/50 bg-accent/5' : 'border-line bg-[#111]'
              }`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-heading text-sm ${
                  isDone ? 'bg-accent text-black' : isCurrent ? 'border-2 border-accent text-accent' : 'bg-line text-body'
                }`}>
                  {isDone ? <CheckCircle2 size={16} /> : isLocked ? <Lock size={15} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`break-words font-heading text-xl uppercase leading-none ${isDone ? 'text-body/60' : 'text-white'}`}>
                    {workout.title}
                  </p>
                  <p className="mt-0.5 text-sm text-body">
                    {isDone ? 'Completed' : isCurrent ? (inProgress ? 'In progress' : 'Up next') : 'Locked'}
                  </p>
                  {inProgress && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${Math.round((doneExCount / Math.max(exercises.length, 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-body">{doneExCount}/{exercises.length}</span>
                    </div>
                  )}
                </div>
                {!isLocked && (
                  <button type="button"
                    onClick={() => {
                      if (index !== workoutIdx) { setWorkoutIdx(index); resetSession(true) }
                      setModalOpen(true)
                    }}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-heading text-base uppercase transition ${
                      isCurrent && !isDone
                        ? 'bg-accent text-black hover:brightness-95'
                        : 'border border-line bg-card text-white hover:border-accent'
                    }`}>
                    {inProgress ? <><Play size={15} /> Continue</> : isDone ? 'Review' : <><Play size={15} /> Start</>}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

// Pull a representative number from a weight string ("65 to 85 lbs" -> 85) for trend deltas.
function weightNumber(w) {
  const nums = String(w).match(/\d+(\.\d+)?/g)
  if (!nums) return null
  return Math.max(...nums.map(Number))
}

function ProgressHistory({ history }) {
  const exercises = useMemo(() => {
    const map = new Map()
    for (const entry of history) {
      const key = entry.id || entry.name
      if (!map.has(key)) map.set(key, { name: entry.name, entries: [] })
      map.get(key).entries.push(entry)
    }
    return [...map.values()]
      .map((ex) => {
        const entries = [...ex.entries].sort((a, b) => new Date(a.date) - new Date(b.date))
        const first = weightNumber(entries[0].weight)
        const latest = weightNumber(entries[entries.length - 1].weight)
        const delta = first != null && latest != null ? latest - first : null
        return { name: ex.name, entries, latest: entries[entries.length - 1], delta, sessions: entries.length }
      })
      .sort((a, b) => new Date(b.latest.date) - new Date(a.latest.date))
  }, [history])

  if (!exercises.length) return null

  return (
    <section className="rounded-lg border border-line bg-[#111] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded bg-accent text-black">
          <LineChart size={18} />
        </div>
        <div>
          <p className="font-heading text-xl uppercase text-white">Your logged progress</p>
          <p className="text-sm text-body">Weights you recorded across completed workouts.</p>
        </div>
      </div>
      <div className="grid gap-3">
        {exercises.map((ex) => (
          <div key={ex.name} className="rounded-lg border border-line bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-heading text-base uppercase text-white">{ex.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-body">
                  {ex.sessions} session{ex.sessions === 1 ? '' : 's'}
                </span>
                {ex.delta != null && ex.delta !== 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 font-heading text-sm uppercase ${
                      ex.delta > 0 ? 'text-accent' : 'text-orange-300'
                    }`}
                  >
                    {ex.delta > 0 ? '▲' : '▼'} {Math.abs(ex.delta)}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-body">
              Latest: <span className="font-bold text-white">{ex.latest.weight}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.entries.slice(-6).map((entry, index) => (
                <span key={index} className="rounded border border-line bg-[#0d0d0d] px-2 py-0.5 text-xs text-body">
                  {entry.weight}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ProgramDashboard({ message, profile, programCreatedAt, workoutLog, onWorkoutLogChange, blockNumber, membershipActive, onStartNextBlock, onUpdateProfile, isLoading }) {
  const [activeView, setActiveView] = useState('today')
  const contentRef = useRef(null)
  const viewMounted = useRef(false)

  useEffect(() => {
    if (!viewMounted.current) { viewMounted.current = true; return }
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeView])
  const weekNum = clampWeek(workoutLog?.week)

  const sections = useMemo(
    () => ({
      today: compactLines(extractSection(message.content, ['session', 'day 1', 'workout a', 'upper', 'lower']), 6),
      workouts: compactLines(extractSection(message.content, ['workouts', 'session', 'day 1']), 8),
      meal: compactLines(sectionLines(message.content, 'Meal Plan').join('\n') || extractSection(message.content, ['meal', 'nutrition', 'protein']), 8),
      recover: compactLines(extractSection(message.content, ['recovery', 'sleep', 'nutrition', 'deload']), 6),
      track: compactLines(extractSection(message.content, ['kpi', 'performance indicator', 'measure', 'track']), 6),
    }),
    [message.content],
  )

  const workouts = useMemo(() => parseWorkouts(message.content, sections.today), [message.content, sections.today])
  const mealPlan = useMemo(() => parseMealPlan(message.content), [message.content])

  const completedWorkouts = Array.isArray(workoutLog?.completedWorkouts) ? workoutLog.completedWorkouts : []
  const nextWorkout = workouts[firstIncompleteWorkout(completedWorkouts, workouts.length)] || null
  // The 4-week block is finished once week 4's sessions are all done.
  const blockComplete = weekNum >= BLOCK_WEEKS && allSessionsDone(completedWorkouts, workouts.length)

  const activeSectionItems = sections[activeView] || []
  const activeItems = activeSectionItems.length
    ? activeSectionItems
    : ['Open the "Why It Works" tab for the full plan.']

  const safetyFlags = Array.isArray(message.meta?.safetyFlags) ? message.meta.safetyFlags : []

  return (
    <article className="mr-auto w-full max-w-5xl [overflow:clip] rounded-lg border border-line bg-card shadow-2xl shadow-black/30">
      {blockComplete && membershipActive ? (
        <div className="border-b border-accent/50 bg-accent/10 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-base uppercase text-accent">
                Block {blockNumber || 1} complete
              </p>
              <p className="mt-1 text-sm leading-6 text-body">
                You finished all 4 weeks. Ready for your next block? Lindsay will use your logged
                progress to build the next 4 weeks, a step harder.
              </p>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={onStartNextBlock}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-heading text-lg uppercase text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Start my next 4 weeks
            </button>
          </div>
        </div>
      ) : null}
      {safetyFlags.length ? (
        <div className="border-b border-amber-400/40 bg-amber-500/10 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-heading text-base uppercase text-amber-200">Check these with care</p>
              <p className="mt-1 text-sm leading-6 text-body">
                Based on the limitations you shared, double-check these moves with a qualified professional
                before loading them, and substitute if anything hurts:
              </p>
              <ul className="mt-2 grid gap-1.5">
                {safetyFlags.map((flag, index) => (
                  <li key={index} className="text-sm leading-6 text-white">
                    <span className="font-bold">{flag.exercise}</span>{' '}
                    <span className="text-body">({flag.limitation}) — {flag.suggestion}.</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <div className={`border-b border-line bg-[#0b0b0b] p-3 sm:p-5 ${activeView !== 'today' ? 'hidden lg:block' : ''}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
              <Sparkles size={15} />
              <span className="font-heading text-sm uppercase">Your Game Plan</span>
            </div>
            <h2 className="font-heading text-[2rem] uppercase leading-none text-white sm:text-5xl">
              Start simple. Build momentum.
            </h2>
            {weekNum ? (
              <div className="mt-3 flex items-center gap-3">
                <p className="font-heading text-sm uppercase text-accent">Block {blockNumber || 1} · Week {weekNum} of 4</p>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(weekNum / 4) * 100}%` }} />
                </div>
                <p className="font-heading text-sm uppercase text-body">{Math.round((weekNum / 4) * 100)}%</p>
              </div>
            ) : (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-body sm:text-base">
                Lindsay built your plan. Use one section at a time, follow the next step, and keep the details nearby when you want them.
              </p>
            )}
          </div>
          <div className="grid gap-2 min-[420px]:grid-cols-3 lg:min-w-80">
            <FocusCard icon={Trophy} label="Goal" value={formatGoals(profile?.primaryGoal) || 'Fitness'} />
            <FocusCard icon={CalendarDays} label="Training" value={`${profile?.daysPerWeek || '-'} days`} />
            <FocusCard icon={Dumbbell} label="Gear" value={Array.isArray(profile?.equipment) ? profile.equipment[0] : (profile?.equipment || 'Custom')} />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[15rem_1fr]">
        <nav
          aria-label="Program sections"
          className="fixed bottom-0 inset-x-0 z-40 flex gap-0 border-t border-line bg-card/95 p-1 backdrop-blur-sm sm:p-2 lg:static lg:inset-auto lg:z-auto lg:flex-col lg:gap-2 lg:overflow-visible lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-transparent lg:p-3 lg:backdrop-blur-none"
        >
          {views.map((view) => {
            const Icon = view.icon
            const selected = activeView === view.id
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 px-0.5 transition lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:border lg:px-4 lg:py-0 ${
                  selected
                    ? 'text-accent lg:border-accent lg:bg-accent lg:text-black'
                    : 'text-body hover:text-white lg:border-line lg:bg-[#111] lg:text-white lg:hover:border-accent/70'
                }`}
                aria-current={selected ? 'page' : undefined}
              >
                <Icon size={18} className="shrink-0" />
                <span className="font-heading text-[10px] uppercase lg:hidden">{view.mobileLabel}</span>
                <span className="hidden font-heading text-base uppercase lg:block lg:text-lg">{view.label}</span>
              </button>
            )
          })}
        </nav>

        <section ref={contentRef} className="scroll-mt-24 p-3 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-sm uppercase text-accent">{VIEW_CONTEXT[activeView]?.label || 'Program'}</p>
              <h3 className="font-heading text-2xl uppercase text-white sm:text-3xl">
                {VIEW_CONTEXT[activeView]?.title || 'Your plan'}
              </h3>
            </div>
          </div>

          {activeView === 'today' ? (
            <TodayView
              sections={sections}
              mealPlan={mealPlan}
              nextWorkout={nextWorkout}
              week={weekNum}
              onViewChange={setActiveView}
            />
          ) : null}
          {activeView === 'workouts' ? (
            <WorkoutTracker
              key={programCreatedAt || 'program'}
              workouts={workouts}
              log={workoutLog}
              onLogChange={onWorkoutLogChange}
            />
          ) : null}
          {activeView === 'meal' ? <MealPlan items={mealPlan} /> : null}
          {activeView === 'recover' ? <SimpleSection label="Recovery" title="How to stay ready." items={activeItems} /> : null}
          {activeView === 'track' ? (
            <div className="grid gap-4">
              <ProgressHistory history={Array.isArray(workoutLog?.history) ? workoutLog.history : []} />
              <SimpleSection label="Progress" title="What to measure." items={activeItems} />
            </div>
          ) : null}
          {activeView === 'science' ? <ScienceBreakdown content={message.content} /> : null}
          {activeView === 'profile' ? (
            <ProfileEditor profile={profile} onUpdate={onUpdateProfile} isLoading={isLoading} />
          ) : null}

          {/* Spacer so fixed mobile nav doesn't obscure last content */}
          <div className="h-20 lg:hidden" aria-hidden="true" />
        </section>
      </div>
    </article>
  )
}
