import { useMemo, useState } from 'react'
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
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
} from 'lucide-react'
import { FormattedMessage } from '../utils/formatMessage.jsx'
import { getExerciseMedia } from '../data/exerciseMedia.js'

const views = [
  { id: 'today', label: 'Today', icon: Sparkles },
  { id: 'workouts', label: 'Workouts', icon: CheckCircle2 },
  { id: 'meal', label: 'Meal Plan', icon: Utensils },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'recover', label: 'Recover', icon: HeartPulse },
  { id: 'track', label: 'Track', icon: LineChart },
  { id: 'science', label: 'Science', icon: BookOpenText },
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
  return markdown
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)
    .slice(0, limit)
}

function allCleanLines(content) {
  return content.split('\n').map(cleanLine).filter(Boolean)
}

function headingText(line) {
  return line.replace(/[:.]+$/g, '').trim().toLowerCase()
}

function isPlanHeading(line) {
  return /^(today first|weekly map|workouts|meal plan|eight week progression|recovery|track progress|why this works)$/i.test(headingText(line))
}

function sectionLines(content, heading, stopHeadings = []) {
  const lines = allCleanLines(content)
  const start = lines.findIndex((line) => headingText(line) === heading.toLowerCase())

  if (start === -1) return []

  const stops = stopHeadings.map((item) => item.toLowerCase())
  const end = lines.findIndex((line, index) => index > start && (stops.includes(headingText(line)) || isPlanHeading(line)))

  return lines.slice(start + 1, end > -1 ? end : undefined)
}

function readDetail(line, label) {
  const pattern = new RegExp(`${label}\\s*:?\\s*([^,\\.]+)`, 'i')
  return line.match(pattern)?.[1]?.trim()
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
  return readDetail(line, 'cue') || readDetail(line, 'coach cue') || 'Move with control and stop if anything feels unsafe.'
}

function readWeight(line) {
  return readDetail(line, 'weight') || readDetail(line, 'load') || 'Bodyweight or comfortable load'
}

function usesExternalWeight(weight) {
  return !/bodyweight|none|no weight/i.test(weight || '')
}

function exerciseName(line, index) {
  const beforeColon = line.split(':')[0]?.trim()
  if (beforeColon && beforeColon.length > 2 && beforeColon.length < 80 && !/workout|session|day/i.test(beforeColon)) {
    return beforeColon
  }

  const beforeComma = line.split(',')[0]?.trim()
  if (beforeComma && beforeComma.length > 2 && beforeComma.length < 80 && !hasExerciseDetail(beforeComma)) {
    return beforeComma
  }

  return `Exercise ${index + 1}`
}

function parseExercises(details) {
  const usableDetails = details.filter((detail) => !/warmup|cooldown|note|focus/i.test(detail)).slice(0, 10)
  const source = usableDetails.length
    ? usableDetails
    : details.slice(0, 6).length
      ? details.slice(0, 6)
      : ['Exercise: Sets: 3, Reps: Follow plan, Rest: 60 seconds, Tempo: Controlled, Cue: Move with control.']

  return source.map((detail, index) => ({
    id: `${index}-${detail.slice(0, 24)}`,
    name: exerciseName(detail, index),
    sets: readSets(detail),
    reps: readReps(detail),
    weight: readWeight(detail),
    rest: readRest(detail),
    tempo: readTempo(detail),
    cue: readCue(detail),
    detail,
  }))
}

function setCount(exercise) {
  const count = Number.parseInt(exercise.sets, 10)
  return Number.isFinite(count) && count > 0 ? Math.min(count, 8) : 3
}

function parseMealPlan(content) {
  const mealLines = sectionLines(content, 'Meal Plan', ['Eight Week Progression', 'Recovery', 'Track Progress', 'Why This Works'])
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

  const parsed = lines.map((line, index) => {
    const [rawTitle, ...rest] = line.split(':')
    const title = rest.length && rawTitle.length < 34 ? rawTitle.trim() : `Meal step ${index + 1}`
    const details = rest.length ? rest.join(':').trim() : line

    return {
      title,
      details,
    }
  })

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

function ExerciseMedia({ exercise, priority = false, compact = false }) {
  const [hasImageError, setHasImageError] = useState(false)
  const [isFallbackImage, setIsFallbackImage] = useState(false)
  const media = getExerciseMedia(exercise?.name)
  const imageAlt = `${exercise?.name || media.label} exercise guide`
  const imageSrc = isFallbackImage && media.fallbackImage ? media.fallbackImage : media.image

  return (
    <div className={`relative overflow-hidden rounded-lg border border-line bg-[#171717] ${compact ? 'aspect-[4/3] w-full sm:w-32' : 'aspect-[16/10] w-full'}`}>
      {!hasImageError ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => {
            if (media.fallbackImage && !isFallbackImage) {
              setIsFallbackImage(true)
              return
            }
            setHasImageError(true)
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1c1c1c] to-[#080808] text-accent">
          <Dumbbell size={compact ? 28 : 42} aria-hidden="true" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2">
        <p className={`font-heading uppercase text-white ${compact ? 'text-sm' : 'text-lg'}`}>
          {isFallbackImage ? 'Exercise form reference' : media.label}
        </p>
      </div>
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

function SimpleOverview({ sections, mealPlan, workouts, onViewChange }) {
  const nextWorkout = workouts[0]
  const workoutCount = nextWorkout?.details?.filter(hasExerciseDetail).length || sections.workouts.length || 0
  const firstTodayStep = sections.today[0] || 'Open Workouts and start the first available session.'
  const firstMeal = mealPlan.breakfast[0] || mealPlan.all[0]

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="font-heading text-sm uppercase text-accent">Start here</p>
        <h3 className="mt-1 font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Do one thing at a time.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-body sm:text-base">
          Your plan is organized into clear tabs. Use this screen for the next step, then open a specific tab when you want the details.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard icon={Dumbbell} label="Next workout" title={nextWorkout?.title || 'Workout one'}>
          <p className="text-sm leading-6 text-body">{workoutCount || 'Your'} exercises are ready in guided mode.</p>
          <button
            type="button"
            onClick={() => onViewChange('workouts')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-heading text-lg uppercase text-black transition hover:bg-white"
          >
            Open Workouts
          </button>
        </OverviewCard>

        <OverviewCard icon={Utensils} label="Food focus" title={firstMeal?.title || 'Meal plan'}>
          <p className="text-sm leading-6 text-body">{firstMeal?.details || 'Use the meal plan tab to check off today’s nutrition steps.'}</p>
          <button
            type="button"
            onClick={() => onViewChange('meal')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-card px-4 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            Open Meals
          </button>
        </OverviewCard>

        <OverviewCard icon={ClipboardCheck} label="Today" title="Main step">
          <p className="text-sm leading-6 text-body">{firstTodayStep}</p>
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
          <p className="font-heading text-sm uppercase text-accent">Simple checklist</p>
          <h4 className="font-heading text-2xl uppercase text-white">Today’s clear actions</h4>
        </div>
        <Checklist items={sections.today.slice(0, 4)} />
      </section>
    </div>
  )
}

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
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <p className="font-heading text-sm uppercase text-accent">In-depth breakdown</p>
        <h4 className="mt-1 font-heading text-3xl uppercase leading-none text-white">The full science plan.</h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
          Open this tab when you want every set, rep, reason, progression, and coaching note behind the simple dashboard.
        </p>
      </div>
      <section className="rounded-lg border border-line bg-[#111] p-4">
        <FormattedMessage content={content} />
      </section>
    </div>
  )
}

function MealSection({ title, items, checkedItems, onToggleItem, offset = 0, compact = false }) {
  if (!items.length) return null

  return (
    <section className="rounded-lg border border-line bg-[#111] p-4">
      <h5 className="font-heading text-2xl uppercase leading-none text-white">{title}</h5>
      <div className={`mt-3 grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        {items.map((item, index) => {
          const itemIndex = offset + index
          const checked = Boolean(checkedItems[itemIndex])

          return (
            <label
              key={`${item.title}-${itemIndex}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                checked ? 'border-accent bg-accent/10' : 'border-line bg-card hover:border-accent/70'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleItem(itemIndex)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#e8ff47]"
              />
              <span className="min-w-0">
                <span className="block break-words font-heading text-lg uppercase leading-none text-white">{item.title}</span>
                <span className="mt-2 block text-sm leading-6 text-body">{item.details}</span>
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

function MealPlan({ items }) {
  const [checkedItems, setCheckedItems] = useState({})
  const orderedItems = [
    ...items.grocery,
    ...items.targets,
    ...items.breakfast,
    ...items.lunch,
    ...items.dinner,
    ...items.workout,
    ...items.prep,
    ...items.other,
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
    { title: 'Prep steps', list: items.prep, compact: true },
    { title: 'Meal steps', list: items.other },
  ].reduce((result, group) => {
    const offset = result.offset
    result.items.push({ ...group, offset })
    result.offset += group.list.length
    return result
  }, { items: [], offset: 0 }).items

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-sm uppercase text-accent">Meal plan</p>
            <h4 className="font-heading text-3xl uppercase leading-none text-white">Eat to support the goal.</h4>
            <p className="mt-2 text-sm leading-6 text-body">
              Follow one meal at a time. Check off each step as you complete it today.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-card p-3 text-center">
            <p className="font-heading text-sm uppercase text-body">Completed</p>
            <p className="text-2xl font-bold text-white">{completed}/{orderedItems.length}</p>
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <MealSection
          key={group.title}
          title={group.title}
          items={group.list}
          checkedItems={checkedItems}
          onToggleItem={toggleItem}
          offset={group.offset}
          compact={group.compact}
        />
      ))}
    </div>
  )
}

function parseWorkouts(content, fallbackItems) {
  const explicitWorkoutLines = sectionLines(content, 'Workouts', ['Meal Plan', 'Eight Week Progression', 'Recovery', 'Track Progress', 'Why This Works'])
  const lines = explicitWorkoutLines.length ? explicitWorkoutLines : compactLines(extractSection(content, ['workouts', 'session', 'day'], 3000), 80)
  const fallbackWorkoutItems = fallbackItems.length
    ? fallbackItems
    : ['Goblet squat, Sets: 3, Reps: 10, Rest: 60 seconds, Tempo: 3,1,2,0, Cue: Keep your chest tall.',
        'Push up, Sets: 3, Reps: 8, Rest: 60 seconds, Tempo: 2,1,2,0, Cue: Keep your body straight.',
        'Plank, Sets: 3, Reps: 30 seconds, Rest: 45 seconds, Tempo: Controlled, Cue: Breathe slowly.']
  const exerciseLines = lines.filter(hasExerciseDetail)
  const boundaryIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      if (hasExerciseDetail(line)) return false
      return /^(workout|session|day)\s*(one|two|three|four|five|six|\d+|[a-f])\b|^(upper|lower|full body|push|pull|legs)\b/i.test(line)
    })

  if (!boundaryIndexes.length) {
    const details = exerciseLines.length ? exerciseLines : fallbackWorkoutItems
    return [
      {
        title: 'Workout one',
        summary: details[0] || 'Your first guided workout.',
        details,
      },
    ]
  }

  return boundaryIndexes.slice(0, 8).map(({ line, index }, itemIndex) => {
    const next = boundaryIndexes[itemIndex + 1]?.index || lines.length
    const details = lines.slice(index + 1, next).filter(hasExerciseDetail).slice(0, 10)

    return {
      title: line,
      summary: details[0] || 'A focused workout from your plan.',
      details: details.length ? details : fallbackWorkoutItems,
    }
  }).filter((workout) => workout.details.length)
}

function WorkoutTracker({ workouts }) {
  const [currentWorkout, setCurrentWorkout] = useState(0)
  const [completedWorkouts, setCompletedWorkouts] = useState([])
  const [checks, setChecks] = useState({})
  const [isStarted, setIsStarted] = useState(false)
  const [activeExercise, setActiveExercise] = useState(0)
  const [completedSets, setCompletedSets] = useState({})
  const activeWorkout = workouts[currentWorkout] || workouts[0]
  const exercises = useMemo(() => parseExercises(activeWorkout.details), [activeWorkout.details])
  const currentExercise = exercises[activeExercise] || exercises[0]
  const exerciseSets = currentExercise ? setCount(currentExercise) : 0
  const finishedSets = completedSets[currentExercise?.id] || []
  const exerciseIsDone = currentExercise ? finishedSets.length >= exerciseSets : false
  const finishedExerciseCount = exercises.filter((exercise) => (completedSets[exercise.id] || []).length >= setCount(exercise)).length
  const allExercisesDone = exercises.length > 0 && finishedExerciseCount === exercises.length
  const checkedCount = completionItems.filter((_, index) => checks[index]).length
  const canComplete = allExercisesDone && checkedCount === completionItems.length

  function toggleCheck(index) {
    setChecks((current) => ({ ...current, [index]: !current[index] }))
  }

  function resetSession() {
    setIsStarted(false)
    setActiveExercise(0)
    setCompletedSets({})
    setChecks({})
  }

  function toggleSet(setIndex) {
    if (!currentExercise) return
    setCompletedSets((current) => {
      const currentSets = current[currentExercise.id] || []
      const nextSets = currentSets.includes(setIndex)
        ? currentSets.filter((item) => item !== setIndex)
        : [...currentSets, setIndex].sort((a, b) => a - b)

      return { ...current, [currentExercise.id]: nextSets }
    })
  }

  function nextExercise() {
    if (!exerciseIsDone) return
    setActiveExercise((current) => Math.min(current + 1, exercises.length - 1))
  }

  function completeWorkout() {
    if (!canComplete) return
    setCompletedWorkouts((current) => [...new Set([...current, currentWorkout])])
    resetSession()
    setCurrentWorkout((current) => Math.min(current + 1, workouts.length - 1))
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-sm uppercase text-accent">Current workout</p>
            <h4 className="mt-1 break-words font-heading text-2xl uppercase leading-none text-white sm:text-3xl">{activeWorkout.title}</h4>
            <p className="mt-2 text-sm leading-6 text-body">
              Start when you are ready. Elevate will walk you through the workout one exercise and one set at a time.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-72">
            <FocusCard icon={Dumbbell} label="Moves" value={String(exercises.length)} />
            <FocusCard icon={ClipboardCheck} label="Done" value={`${finishedExerciseCount}/${exercises.length}`} />
            <FocusCard icon={Timer} label="Rest" value={currentExercise?.rest || 'Custom'} />
          </div>
        </div>
      </div>

      {!isStarted ? (
        <div className="rounded-lg border border-line bg-[#111] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-2xl uppercase text-white">Workout preview</p>
              <p className="mt-1 text-sm leading-6 text-body">These are the details for the workout you have unlocked right now.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsStarted(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-heading text-xl uppercase text-black transition hover:bg-white"
            >
              <Play size={20} />
              Start Workout
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {exercises.map((exercise, index) => (
              <div key={exercise.id} className="rounded-lg border border-line bg-card p-3">
                <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <ExerciseMedia exercise={exercise} compact />
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-accent font-heading text-base text-black">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words font-heading text-xl uppercase leading-none text-white">{exercise.name}</p>
                        <div className="mt-3 grid gap-2 text-sm text-body sm:grid-cols-5">
                          <span>Sets: {exercise.sets}</span>
                          <span>Reps: {exercise.reps}</span>
                          <span>Weight: {exercise.weight}</span>
                          <span>Rest: {exercise.rest}</span>
                          <span>Tempo: {exercise.tempo}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-body">{exercise.cue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-[#111] p-4">
          <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-sm uppercase text-accent">Coach mode</p>
              <h5 className="font-heading text-3xl uppercase leading-none text-white">{currentExercise.name}</h5>
              <p className="mt-2 text-sm text-body">Exercise {activeExercise + 1} of {exercises.length}</p>
            </div>
            <button
              type="button"
              onClick={resetSession}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 font-heading text-lg uppercase text-white transition hover:border-accent"
            >
              <RotateCcw size={18} />
              Restart
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(16rem,0.9fr)_1.1fr]">
            <ExerciseMedia key={currentExercise?.id} exercise={currentExercise} priority />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-card p-3">
                <Repeat className="mb-2 text-accent" size={18} />
                <p className="font-heading text-sm uppercase text-body">Sets</p>
                <p className="text-lg font-bold text-white">{currentExercise.sets}</p>
              </div>
              <div className="rounded-lg border border-line bg-card p-3">
                <Gauge className="mb-2 text-accent" size={18} />
                <p className="font-heading text-sm uppercase text-body">Reps</p>
                <p className="text-lg font-bold text-white">{currentExercise.reps}</p>
              </div>
              <div className={`rounded-lg border p-3 ${usesExternalWeight(currentExercise.weight) ? 'border-accent/40 bg-accent/10' : 'border-line bg-card'}`}>
                <Dumbbell className="mb-2 text-accent" size={18} />
                <p className="font-heading text-sm uppercase text-body">Weight</p>
                <p className="text-lg font-bold text-white">{currentExercise.weight}</p>
              </div>
              <div className="rounded-lg border border-line bg-card p-3">
                <Timer className="mb-2 text-accent" size={18} />
                <p className="font-heading text-sm uppercase text-body">Rest</p>
                <p className="text-lg font-bold text-white">{currentExercise.rest}</p>
              </div>
              <div className="rounded-lg border border-line bg-card p-3">
                <Gauge className="mb-2 text-accent" size={18} />
                <p className="font-heading text-sm uppercase text-body">Tempo</p>
                <p className="text-lg font-bold text-white">{currentExercise.tempo}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
            <p className="font-heading text-xl uppercase text-white">Coach cue</p>
            <p className="mt-1 text-sm leading-6 text-body">{currentExercise.cue}</p>
          </div>

          <div className="mt-4">
            <p className="font-heading text-2xl uppercase text-white">Check off each set</p>
            <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4">
              {Array.from({ length: exerciseSets }, (_, index) => {
                const done = finishedSets.includes(index)
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleSet(index)}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 font-heading text-lg uppercase transition ${
                      done ? 'border-accent bg-accent text-black' : 'border-line bg-card text-white hover:border-accent'
                    }`}
                  >
                    {done ? <CheckCircle2 size={18} /> : null}
                    Set {index + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={!exerciseIsDone || activeExercise >= exercises.length - 1}
            onClick={nextExercise}
            className="mt-4 w-full rounded-lg border border-line bg-card px-4 py-3 font-heading text-xl uppercase text-white transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {activeExercise >= exercises.length - 1 ? 'Last Exercise' : 'Next Exercise'}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-line bg-[#111] p-4">
        <p className="font-heading text-2xl uppercase text-white">Finish checklist</p>
        <p className="mt-1 text-sm text-body">Complete every exercise and confirm these items before the next workout unlocks.</p>
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

  const sections = useMemo(
    () => ({
      today: compactLines(extractSection(message.content, ['session', 'day 1', 'workout a', 'upper', 'lower']), 6),
      week: compactLines(extractSection(message.content, ['weekly', 'split', 'week 1']), 7),
      workouts: compactLines(extractSection(message.content, ['workouts', 'session', 'day 1']), 8),
      meal: compactLines(sectionLines(message.content, 'Meal Plan').join('\n') || extractSection(message.content, ['meal', 'nutrition', 'protein']), 8),
      recover: compactLines(extractSection(message.content, ['recovery', 'sleep', 'nutrition', 'deload']), 6),
      track: compactLines(extractSection(message.content, ['kpi', 'performance indicator', 'measure', 'track']), 6),
    }),
    [message.content],
  )

  const activeSectionItems = sections[activeView] || []
  const activeItems = activeSectionItems.length
    ? activeSectionItems
    : ['Open the Science tab for the full plan, or use the simplify button for a clearer version.']
  const workouts = useMemo(() => parseWorkouts(message.content, sections.today), [message.content, sections.today])
  const mealPlan = useMemo(() => parseMealPlan(message.content), [message.content])

  const activeLabel = views.find((view) => view.id === activeView)?.label || 'today'
  const topAction = {
    label: `Simplify ${activeLabel}`,
    prompt: `Turn my ${activeLabel.toLowerCase()} plan into simple steps with exact actions.`,
  }
  const helperActions = [
    { label: 'First thing to do', prompt: 'Tell me the first thing I should do today in simple steps.' },
    { label: 'Make it easier', prompt: 'Make this plan easier to follow for a normal person.' },
    { label: 'Next workout', prompt: 'Explain my next workout in simple steps.' },
    { label: 'Meal prep', prompt: 'Turn my meal plan into a simple prep list for the next two days.' },
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
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:min-w-80">
            <FocusCard icon={Trophy} label="Goal" value={formatGoals(profile?.primaryGoal) || 'Fitness'} />
            <FocusCard icon={CalendarDays} label="Schedule" value={`${profile?.daysPerWeek || '-'} days`} />
            <FocusCard icon={Dumbbell} label="Gear" value={profile?.equipment || 'Custom'} />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Program sections" className="grid grid-cols-2 gap-2 border-b border-line p-3 min-[460px]:grid-cols-3 sm:flex sm:overflow-x-auto lg:flex-col lg:border-b-0 lg:border-r">
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
                aria-current={selected ? 'page' : undefined}
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
              <p className="font-heading text-sm uppercase text-accent">{activeView === 'science' ? 'Reference' : 'Organized dashboard'}</p>
              <h3 className="font-heading text-2xl uppercase text-white sm:text-3xl">
                {activeView === 'today' ? 'Today overview' : `${activeLabel} tab`}
              </h3>
            </div>
            {activeView !== 'science' ? (
              <ActionButton action={topAction} pendingAction={pendingAction} isLoading={isLoading} onQuickAction={onQuickAction} />
            ) : null}
          </div>

          {activeView === 'today' ? (
            <SimpleOverview sections={sections} mealPlan={mealPlan} workouts={workouts} onViewChange={setActiveView} />
          ) : null}
          {activeView === 'workouts' ? <WorkoutTracker workouts={workouts} /> : null}
          {activeView === 'meal' ? <MealPlan items={mealPlan} /> : null}
          {activeView === 'week' ? <SimpleSection label="Weekly map" title="What this week looks like." items={activeItems} /> : null}
          {activeView === 'recover' ? <SimpleSection label="Recovery" title="How to stay ready." items={activeItems} /> : null}
          {activeView === 'track' ? <SimpleSection label="Progress" title="What to measure." items={activeItems} /> : null}
          {activeView === 'science' ? <ScienceBreakdown content={message.content} /> : null}

          {activeView !== 'science' ? (
            <div className="mt-5 rounded-lg border border-line bg-[#111] p-4">
              <div className="mb-3">
                <p className="font-heading text-sm uppercase text-accent">Need help?</p>
                <h4 className="font-heading text-2xl uppercase text-white">Ask for a simpler answer</h4>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            </div>
          ) : null}
        </section>
      </div>
    </article>
  )
}
