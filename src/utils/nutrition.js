// Code-based daily nutrition targets, scaled to the client's stats and goal using the
// Mifflin-St Jeor equation. Returns null when the inputs are too incomplete to compute
// reliably, so the prompt can fall back to letting the model estimate.

function num(value) {
  const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

// Parse height into centimeters from "5'7", "5'7\"", "5 ft 7", "170 cm", "67 in", or a bare number.
export function heightCm(raw) {
  const s = String(raw ?? '').toLowerCase().trim()
  if (!s) return null

  const cm = s.match(/(\d+(?:\.\d+)?)\s*cm/)
  if (cm) return Math.round(parseFloat(cm[1]))

  const feetInches = s.match(/(\d+)\s*(?:'|’|ft|feet|foot)\s*(\d+(?:\.\d+)?)?/)
  if (feetInches) {
    const ft = parseInt(feetInches[1], 10)
    const inches = feetInches[2] ? parseFloat(feetInches[2]) : 0
    return Math.round((ft * 12 + inches) * 2.54)
  }

  const inchesOnly = s.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")/)
  if (inchesOnly) return Math.round(parseFloat(inchesOnly[1]) * 2.54)

  const bare = num(s)
  if (bare) return bare < 96 ? Math.round(bare * 2.54) : Math.round(bare) // assume inches if small, else cm
  return null
}

function activityFactor(daysPerWeek) {
  const d = num(daysPerWeek) ?? 3
  if (d <= 1) return 1.2
  if (d <= 3) return 1.375
  if (d <= 5) return 1.55
  return 1.725
}

// 'cut' (deficit), 'bulk' (surplus), or 'maintain' (recomp), inferred from the weight goal
// first, then the stated goals.
function goalDirection(profile) {
  const cur = num(profile.weightLbs)
  const des = num(profile.desiredWeightLbs)
  if (cur && des) {
    if (des < cur - 2) return 'cut'
    if (des > cur + 2) return 'bulk'
    if (Math.abs(des - cur) <= 2) return 'maintain'
  }
  const goals = (Array.isArray(profile.primaryGoal) ? profile.primaryGoal.join(' ') : String(profile.primaryGoal || '')).toLowerCase()
  if (/lose|fat loss|weight loss|lean|slim|tone|cut/.test(goals)) return 'cut'
  if (/muscle|gain|build|mass|bulk|size|strength/.test(goals)) return 'bulk'
  return 'maintain'
}

export function nutritionTargets(profile) {
  if (!profile) return null
  const weightLbs = num(profile.weightLbs)
  const age = num(profile.age)
  const cm = heightCm(profile.height)
  if (!weightLbs || !age || !cm) return null

  const kg = weightLbs / 2.2046
  const isFemale = String(profile.gender || '').toLowerCase().startsWith('f')
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (isFemale ? -161 : 5)
  const tdee = bmr * activityFactor(profile.daysPerWeek)

  const direction = goalDirection(profile)
  let calories = direction === 'cut' ? tdee * 0.8 : direction === 'bulk' ? tdee * 1.12 : tdee
  calories = Math.max(calories, bmr) // never prescribe below BMR

  const proteinG = Math.round(weightLbs * (direction === 'cut' ? 1.0 : 0.9))
  const fatG = Math.round(weightLbs * 0.35)
  const carbsG = Math.max(40, Math.round((calories - proteinG * 4 - fatG * 9) / 4))
  const waterLiters = Math.min(4, Math.max(2.5, Math.round((weightLbs * 0.6 / 33.814) * 10) / 10))

  return {
    calories: Math.round(calories / 10) * 10,
    proteinG,
    fatG,
    carbsG,
    waterLiters,
    direction,
  }
}
