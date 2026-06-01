import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

const goals = [
  'Build Muscle',
  'Lose Fat',
  'Increase Strength',
  'Improve Endurance',
  'Athletic Performance',
  'General Fitness',
]

const experienceLevels = ['Complete Beginner', '6-12 Months', '1-3 Years', '3-5 Years', '5+ Years']
const equipmentOptions = ['Full Gym', 'Home Gym', 'Minimal', 'Bodyweight Only']

const initialTouched = {
  name: false,
  age: false,
  gender: false,
  weightLbs: false,
  height: false,
  primaryGoal: false,
  experience: false,
  daysPerWeek: false,
  equipment: false,
}

const defaultProfile = {
  name: '',
  age: '',
  gender: '',
  weightLbs: '',
  desiredWeightLbs: '',
  height: '',
  primaryGoal: [],
  experience: '',
  daysPerWeek: '4',
  equipment: '',
  limitations: '',
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-heading text-lg uppercase text-white">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-sm text-red-300">{error}</span> : null}
    </label>
  )
}

function GeneratingOverlay() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/90 px-6 backdrop-blur">
      <div className="w-full max-w-md rounded-lg border border-line bg-card p-6 text-center shadow-2xl shadow-black/60">
        <p className="font-heading text-3xl uppercase text-white">Generating Program</p>
        <div className="mx-auto mt-5 flex justify-center gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-3 w-3 animate-pulse rounded-full bg-accent"
              style={{ animationDelay: `${dot * 150}ms` }}
            />
          ))}
        </div>
        <p className="mt-5 text-body">Lindsay is building your 6-month transformation from the assessment.</p>
      </div>
    </div>
  )
}

function PillGroup({ options, value, onChange, columns = 'sm:grid-cols-2', multiple = false }) {
  const selectedValues = multiple && Array.isArray(value) ? value : []

  function choose(option) {
    if (!multiple) {
      onChange(option)
      return
    }

    const next = selectedValues.includes(option)
      ? selectedValues.filter((item) => item !== option)
      : [...selectedValues, option]

    onChange(next)
  }

  return (
    <div className={`grid gap-3 ${columns}`}>
      {options.map((option) => {
        const selected = multiple ? selectedValues.includes(option) : value === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            className={`min-h-12 rounded-lg border px-4 py-3 text-left font-heading text-lg uppercase transition ${
              selected
                ? 'border-accent bg-accent text-black'
                : 'border-line bg-[#111] text-white hover:border-accent/70'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function inputClass(hasError) {
  return `w-full rounded-lg border bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent ${
    hasError ? 'border-red-400' : 'border-line'
  }`
}

export default function Onboarding({ initialProfile, onProfileChange, onComplete, onHome, isLoading, error }) {
  const [step, setStep] = useState(1)
  const [touched, setTouched] = useState(initialTouched)
  const [profile, setProfile] = useState({ ...defaultProfile, ...(initialProfile || {}) })

  useEffect(() => {
    onProfileChange?.(profile)
  }, [onProfileChange, profile])

  function setValue(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const errors = {
    name: profile.name.trim() ? '' : 'Name is required.',
    age: profile.age ? '' : 'Age is required.',
    gender: profile.gender ? '' : 'Gender is required.',
    weightLbs: profile.weightLbs ? '' : 'Weight is required.',
    height: profile.height.trim() ? '' : 'Height is required.',
    primaryGoal: profile.primaryGoal.length ? '' : 'Choose at least one goal.',
    experience: profile.experience ? '' : 'Choose your training experience.',
    daysPerWeek: profile.daysPerWeek ? '' : 'Choose training days.',
    equipment: profile.equipment ? '' : 'Choose equipment access.',
  }

  const fieldsByStep = {
    1: ['name', 'age', 'gender', 'weightLbs', 'height'],
    2: ['primaryGoal', 'experience'],
    3: ['daysPerWeek', 'equipment'],
  }

  function stepIsValid(currentStep = step) {
    return fieldsByStep[currentStep].every((field) => !errors[field])
  }

  function markStepTouched(currentStep = step) {
    setTouched((current) => {
      const next = { ...current }
      fieldsByStep[currentStep].forEach((field) => {
        next[field] = true
      })
      return next
    })
  }

  function nextStep() {
    if (!stepIsValid()) {
      markStepTouched()
      return
    }
    setStep((current) => Math.min(current + 1, 3))
  }

  function submit(event) {
    event.preventDefault()
    if (!stepIsValid(3)) {
      markStepTouched(3)
      return
    }
    onComplete(profile)
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-5 text-body sm:px-6 sm:py-6 lg:px-8">
      {isLoading ? <GeneratingOverlay /> : null}
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="mb-6 grid gap-4 sm:mb-8 sm:flex sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="font-heading text-lg uppercase text-accent">Elevate Health and Fitness</p>
            <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl sm:text-7xl">
              Build Your Program
            </h1>
          </div>
          <div className="grid gap-3 sm:flex sm:shrink-0 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={onHome}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-[#111] px-4 font-heading text-lg uppercase text-white transition hover:border-accent sm:w-auto"
            >
              <ArrowLeft size={18} />
              Home
            </button>
            <div className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-3 sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
              <p className="font-heading text-2xl text-white sm:text-3xl">0{step}/03</p>
              <p className="text-sm uppercase text-body">Assessment</p>
            </div>
          </div>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#151515]">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <form onSubmit={submit} className="rounded-lg border border-line bg-card p-4 sm:p-8">
          {step === 1 ? (
            <section className="grid gap-5 md:grid-cols-2">
              <Field label="Name" error={touched.name && errors.name}>
                <input
                  className={inputClass(touched.name && errors.name)}
                  value={profile.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  placeholder="Lindsay"
                />
              </Field>
              <Field label="Age" error={touched.age && errors.age}>
                <input
                  className={inputClass(touched.age && errors.age)}
                  type="number"
                  min="13"
                  max="100"
                  value={profile.age}
                  onChange={(event) => setValue('age', event.target.value)}
                  placeholder="32"
                />
              </Field>
              <Field label="Gender" error={touched.gender && errors.gender}>
                <select
                  className={inputClass(touched.gender && errors.gender)}
                  value={profile.gender}
                  onChange={(event) => setValue('gender', event.target.value)}
                >
                  <option value="">Select</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Weight (lbs)" error={touched.weightLbs && errors.weightLbs}>
                <input
                  className={inputClass(touched.weightLbs && errors.weightLbs)}
                  type="number"
                  min="50"
                  max="700"
                  value={profile.weightLbs}
                  onChange={(event) => setValue('weightLbs', event.target.value)}
                  placeholder="165"
                />
              </Field>
              <Field label="Desired Weight (lbs)">
                <input
                  className={inputClass(false)}
                  type="number"
                  min="50"
                  max="700"
                  value={profile.desiredWeightLbs}
                  onChange={(event) => setValue('desiredWeightLbs', event.target.value)}
                  placeholder="Optional — e.g. 145"
                />
              </Field>
              <Field label="Height" error={touched.height && errors.height}>
                <input
                  className={inputClass(touched.height && errors.height)}
                  value={profile.height}
                  onChange={(event) => setValue('height', event.target.value)}
                  placeholder="5'8&quot;"
                />
              </Field>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="grid gap-8">
              <Field label="Primary Goal" error={touched.primaryGoal && errors.primaryGoal}>
                <p className="mb-3 text-sm text-body">Select all that apply.</p>
                <PillGroup
                  multiple
                  options={goals}
                  value={profile.primaryGoal}
                  onChange={(value) => setValue('primaryGoal', value)}
                />
              </Field>
              <Field label="Training Experience" error={touched.experience && errors.experience}>
                <PillGroup
                  options={experienceLevels}
                  value={profile.experience}
                  onChange={(value) => setValue('experience', value)}
                  columns="sm:grid-cols-3"
                />
              </Field>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="grid gap-6">
              <Field label="Days Per Week" error={touched.daysPerWeek && errors.daysPerWeek}>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setValue('daysPerWeek', String(day))}
                      className={`aspect-square min-h-11 rounded-lg border font-heading text-2xl transition sm:text-3xl ${
                        profile.daysPerWeek === String(day)
                          ? 'border-accent bg-accent text-black'
                          : 'border-line bg-[#111] text-white hover:border-accent/70'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Equipment Access" error={touched.equipment && errors.equipment}>
                <PillGroup
                  options={equipmentOptions}
                  value={profile.equipment}
                  onChange={(value) => setValue('equipment', value)}
                />
              </Field>
              <Field label="Injuries / Limitations">
                <textarea
                  className={`${inputClass(false)} min-h-28 resize-none`}
                  value={profile.limitations}
                  onChange={(event) => setValue('limitations', event.target.value)}
                  placeholder="Shoulder history, knee pain, limited equipment, etc."
                />
              </Field>
            </section>
          ) : null}

          {error ? <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-5 font-heading text-lg uppercase text-white transition hover:border-accent/70 ${
                step === 1 ? 'invisible' : ''
              }`}
            >
              <ArrowLeft size={18} />
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-heading text-lg uppercase text-black transition hover:brightness-95"
              >
                Next
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-heading text-lg uppercase text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Generating' : 'Generate Program'}
                <Check size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
