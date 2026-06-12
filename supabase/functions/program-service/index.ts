import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SYSTEM_PROMPT =
  'You are an elite sports scientist and certified strength and conditioning specialist with deep expertise in exercise physiology, biomechanics, and evidence based training. Give precise recommendations, but explain them in simple everyday language that an average person can follow. Use short sections, clear steps, and friendly wording. Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols. Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks.'

const API_URL = Deno.env.get('PROGRAM_API_URL') || 'https://api.openai.com/v1/responses'
const MODEL = Deno.env.get('PROGRAM_MODEL') || Deno.env.get('VITE_PROGRAM_MODEL') || 'gpt-5.5'
const MAX_OUTPUT_TOKENS = Number(Deno.env.get('PROGRAM_MAX_OUTPUT_TOKENS') || 16000)

type ProgramMessage = {
  role: 'user' | 'assistant'
  content: unknown
}

function apiKey() {
  return Deno.env.get('PROGRAM_API_KEY') || Deno.env.get('OPENAI_API_KEY')
}

function authenticatedUserId(request: Request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const payloadPart = token.split('.')[1]
  if (!payloadPart) return ''

  try {
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(normalized))
    return payload?.role === 'authenticated' ? String(payload.sub || '') : ''
  } catch {
    return ''
  }
}

function num(value: unknown) {
  const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function heightCm(raw: unknown) {
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
  if (bare) return bare < 96 ? Math.round(bare * 2.54) : Math.round(bare)
  return null
}

function activityFactor(daysPerWeek: unknown) {
  const d = num(daysPerWeek) ?? 3
  if (d <= 1) return 1.2
  if (d <= 3) return 1.375
  if (d <= 5) return 1.55
  return 1.725
}

function goalDirection(profile: Record<string, unknown>) {
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

function nutritionTargets(profile: Record<string, unknown>) {
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
  calories = Math.max(calories, bmr)

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

function dataUrl(mediaType: string, base64: string) {
  return `data:${mediaType};base64,${base64}`
}

function toProgramContent(content: unknown, role: string) {
  if (Array.isArray(content)) return content
  if (role === 'assistant') return String(content || '')

  return [
    {
      type: 'input_text',
      text: String(content || ''),
    },
  ]
}

function toProgramMessages(messages: ProgramMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: toProgramContent(message.content, message.role),
  }))
}

function extractText(payload: Record<string, any> | null) {
  if (payload?.output_text) return payload.output_text

  return payload?.output
    ?.flatMap((item: any) => item.content || [])
    .filter((content: any) => content.type === 'output_text' || content.type === 'text')
    .map((content: any) => content.text)
    .join('\n\n')
}

function sanitizeCopy(text: unknown) {
  return String(text || '')
    .replace(/[—–-]/g, ', ')
    .replace(/[#[\]{}*_`~|^=<>•·]/g, '')
    .replace(/\//g, ' or ')
    .replace(/&/g, 'and')
    .replace(/%/g, ' percent')
    .replace(/\+/g, ' plus ')
    .replace(/;/g, ',')
    .replace(/:/g, ':')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function formatGoals(primaryGoal: unknown) {
  return Array.isArray(primaryGoal) ? primaryGoal.join(', ') : primaryGoal
}

function hasRealLimitations(limitations: unknown) {
  const lim = String(limitations || '').trim()
  return Boolean(lim) && !/^(none|n\/?a|no|nope)\b/i.test(lim)
}

function injuryRules(limitations: unknown) {
  if (!hasRealLimitations(limitations)) {
    return '- If the client reports no injuries, still choose joint-friendly movements and remind them to reduce load if anything hurts.'
  }
  return `- SAFETY IS THE TOP PRIORITY. The client reports these injuries or limitations: ${limitations}. You must NOT program any exercise that is contraindicated or risky for these limitations. Replace every risky movement with a safe alternative that trains the same muscles through a pain-free range.
- Use this judgment as a guide. For lower back pain, avoid conventional deadlifts, barbell back squats, good mornings, bent over barbell rows, sit-ups, and Russian twists, and prefer hip thrusts, goblet box squats, chest-supported rows, glute bridges, and bird dogs. For knee pain, avoid deep squats, lunges, and any jumping, and prefer box squats to a comfortable depth and leg press in a pain-free range. For shoulder issues, avoid overhead pressing, upright rows, and dips, and prefer neutral grip dumbbell presses, landmine presses, and cable work. Apply the same careful reasoning to any other limitation the client listed.
- Do not include any exercise that stresses the injured area. When you choose a safer substitute, add a short note in that exercise's Cue explaining it is a joint-friendly choice for the client's limitation.`
}

function selectPeriodization(experience: unknown) {
  const e = String(experience || '').toLowerCase()
  if (/beginner|0|6.?12|6 month/i.test(e) || e.includes('complete')) {
    return {
      name: 'Linear Progression',
      instruction:
        'Use Linear Progression. Add a small amount of weight to every compound lift each week (2.5 to 5 lbs for upper body, 5 to 10 lbs for lower body) as long as the client completes all reps with solid form. Keep the sets and reps constant across all 4 weeks. This is the fastest and most appropriate model for a beginner.',
    }
  }
  if (/1.?3|1 to 3|1,?3 year/i.test(e) || e.includes('1-3') || e.includes('12 month')) {
    return {
      name: 'Daily Undulating Periodization',
      instruction:
        'Use Daily Undulating Periodization (DUP). Vary the rep range between sessions within each week to train multiple qualities simultaneously. For example: Session A is heavy strength work at 4 to 6 reps, Session B is moderate hypertrophy work at 8 to 12 reps, and if there is a third session use power or technique work at 3 to 5 reps with speed intent. Each week add a small amount of weight to each rep bracket so loads progress consistently across all 4 weeks.',
    }
  }
  return {
    name: 'Wave Loading',
    instruction:
      'Use Wave Loading with an accumulation-to-intensification structure. Week 1: moderate weight, higher volume (4 sets of 10 to 12 reps) to build work capacity. Week 2: increase weight slightly, moderate volume (4 sets of 8 to 10 reps). Week 3: increase weight again, lower volume (4 to 5 sets of 5 to 7 reps), push intensity. Week 4: peak week, highest loads, lower volume (4 to 5 sets of 3 to 5 reps on main lifts). This structure drives maximum strength and hypertrophy adaptation in an experienced client.',
  }
}

function nutritionGuidance(profile: Record<string, unknown>) {
  const t = nutritionTargets(profile)
  if (!t) {
    return `- Build the nutrition around THIS client, not generic numbers. Estimate their daily maintenance calories from their bodyweight, age, gender, height, and activity level (factoring in their ${profile.daysPerWeek} training days per week). Set the Calorie Target as a clear deficit for fat loss or losing weight, a clear surplus for muscle gain or gaining weight, or roughly maintenance for body recomposition, matching their weight goal. Set protein roughly 0.7 to 1 gram per pound of bodyweight, fat roughly 0.3 to 0.4 grams per pound, and the remaining calories from carbohydrates, with more carbohydrates on training days. State each target as a clear daily number with a brief reason.`
  }
  const dir =
    t.direction === 'cut'
      ? 'a calorie deficit for fat loss'
      : t.direction === 'bulk'
        ? 'a calorie surplus for muscle gain'
        : 'maintenance calories for body recomposition'
  return `- These daily nutrition targets were calculated specifically for this client from their bodyweight, height, age, gender, and ${profile.daysPerWeek} training days per week, set to ${dir}. Use these EXACT numbers on the Calorie Target, Protein Target, Carb Target, Fat Target, and Water Target lines, and build all twelve meal options plus the snack, pre workout, and post workout so the full day adds up to them: Calorie Target ${t.calories} calories per day, Protein Target ${t.proteinG} grams per day, Carb Target ${t.carbsG} grams per day, Fat Target ${t.fatG} grams per day, Water Target ${t.waterLiters} liters per day. Briefly give the reason behind each target.`
}

function programPrompt(profile: Record<string, unknown>, { blockNumber = 1, progress = '', checkins = '' } = {}) {
  const periodization = selectPeriodization(profile.experience)
  return `Generate a personalized science-based 4-week training block for this client. This is block ${blockNumber}. The periodization scheme is ${periodization.name}.${progress ? `\n\nProgress logged in the previous block (apply sensible progressive overload based on these real numbers — increase loads where the client clearly handled it): ${progress}` : ''}${checkins ? `\n\nWeekly check-ins from the previous block (use these to understand recovery, effort, and sticking points): ${checkins}` : ''}

Client profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Current weight: ${profile.weightLbs} lbs
- Desired weight: ${profile.desiredWeightLbs ? `${profile.desiredWeightLbs} lbs` : 'Not specified'}
- Height: ${profile.height}
- Primary goals: ${formatGoals(profile.primaryGoal)}
- Training experience: ${profile.experience}
- Training days per week: ${profile.daysPerWeek}
- Equipment access: ${profile.equipment}
- Injuries or limitations: ${profile.limitations || 'None reported'}
${profile.desiredWeightLbs ? `- Weight goal: Reach ${profile.desiredWeightLbs} lbs from current ${profile.weightLbs} lbs (${Number(profile.weightLbs) > Number(profile.desiredWeightLbs) ? `lose ${Number(profile.weightLbs) - Number(profile.desiredWeightLbs)} lbs` : `gain ${Number(profile.desiredWeightLbs) - Number(profile.weightLbs)} lbs`})` : ''}

Include:
${injuryRules(profile.limitations)}
- Start with a friendly "Today first" section that gives the user's first 3 actions in plain language
- Use clear plain headings exactly named: Today First, Workouts, Meal Plan, Four Week Progression, Recovery, Track Progress, Why This Works
- Periodization: ${periodization.instruction}
- Provide one distinct workout session for each of the client's ${profile.daysPerWeek} training days per week, with every session fully detailed. Label each session on its own line with its training focus, exactly as Workout One (Push), then Workout Two (Pull), then Workout Three (Lower Body), and so on in order, then list that session's exercises on the lines beneath its label. Do not name days of the week.
- Training split (mandatory): Never program a full body day. Each session focuses on exactly one of Push (chest, shoulders, triceps), Pull (back, biceps, rear delts), or Lower Body (quads, hamstrings, glutes, calves). Spread these focuses across the week so total push, pull, and lower volume stays balanced, repeating focuses when there are more than three training days. For example, 3 days: Push, Pull, Lower Body. 4 days: Lower Body, Push, Pull, Lower Body. 5 days: Push, Pull, Lower Body, Push, Pull. 6 days: Push, Pull, Lower Body, Push, Pull, Lower Body. Include direct core and ab work on as many of the sessions as makes sense for the client, on any focus day, placed after the main compound lifts.
- Exercise sequencing rules (apply these in every session without exception): (1) Always place the most demanding compound movements first while the client is fresh, for example squat or deadlift before leg press, bench press before flies. (2) Because each session is a single Push, Pull, or Lower Body focus, balance pushing and pulling volume across the WEEK rather than within a session, and never mix opposing focuses into one session. (3) Do not fatigue a muscle that is needed as a stabilizer before it is needed as a prime mover, for example never program bicep curls directly before heavy barbell rows. (4) Place isolation, accessory, and core work after all compound movements are complete. These rules must be followed even if it means reordering exercises from a typical template.
- In the Workouts section, write every exercise using this exact pattern on a single line: Exercise name: Warmup: weight x reps, weight x reps (2 specific warm-up sets before working weight), Sets: number, Reps: number or rep range, Weight: working weight range, Rest: time, Tempo: numbers, Cue: two short practical sentences explaining how to do the exercise, including setup, body position, movement path, and one key safety or form check. Do not use the cue to explain what muscles it targets. For bodyweight or very light exercises write Warmup: none. Example: Barbell Back Squat: Warmup: 95x5, 135x3, Sets: 4, Reps: 5 to 7, Weight: 185 to 205 lbs, Rest: 3 mins, Tempo: 3,1,2,0, Cue: Set the bar across your upper back, brace your core, and stand with feet about shoulder width. Sit down between your hips, keep your chest tall, then drive through your whole foot to stand without letting your knees cave in.
- For intermediate and advanced clients, pair appropriate accessory exercises as supersets where it makes sense to save time and increase density. Mark the first exercise with "Superset A1" at the start of its name and the second with "Superset A2", and so on for B1 and B2 if there is a second superset. The A1 rest is the time to set up for A2, the A2 rest is the full rest between rounds. Example: Superset A1 Dumbbell Curl: Warmup: none, Sets: 3, Reps: 10 to 12, Weight: 30 lbs, Rest: 15 secs, Tempo: 2,1,2,0, Cue: Stand tall with your elbows close to your sides and palms facing forward. Curl the dumbbells without swinging, squeeze briefly at the top, then lower under control. Superset A2 Tricep Pushdown: Warmup: none, Sets: 3, Reps: 12, Weight: 50 lbs, Rest: 75 secs, Tempo: 2,1,2,0, Cue: Pin your elbows beside your ribs and start with your forearms above parallel. Press the handle down until your arms are straight, pause, then return slowly without letting your shoulders roll forward. Do not superset the main compound lifts.
- This is a serious results driven program. Prescribe genuinely challenging working loads taken to 1 to 3 reps in reserve on main lifts. Never default to light token weights.
- Use real training volume: 3 to 5 working sets on main lifts, 2 to 4 on accessories. Several exercises per session. Scale intensity to experience.
- Keep it safe: tell the user to choose a weight that makes the last 1 to 3 reps genuinely hard, add load or reps as they get stronger, and reduce weight if form breaks. Respect injuries over intensity.
- Put a brief warmup and cooldown note on their own lines (not in exercise format) at the start and end of each session
- In the Meal Plan section, create a detailed daily meal plan that is easy to follow and matched to the user's goal, body size, schedule, training days, equipment, and any limitations
${nutritionGuidance(profile)}
- Scale every meal's portion sizes so the full day of meals actually adds up to the Calorie Target and the protein target for this client. A larger or heavier client gets bigger portions, a smaller or lighter client gets smaller portions. Do not use one size fits all portions, match them to this person's numbers.
- In the Meal Plan section, start with Grocery List before any meal options
- In the Meal Plan section, use these exact line labels in this order: Grocery List, Protein Target, Calorie Target, Water Target, Carb Target, Fat Target, Breakfast Option 1, Breakfast Option 2, Breakfast Option 3, Breakfast Option 4, Lunch Option 1, Lunch Option 2, Lunch Option 3, Lunch Option 4, Dinner Option 1, Dinner Option 2, Dinner Option 3, Dinner Option 4, Snack, Pre Workout, Post Workout, Training Day Intake, Rest Day Intake
- CRITICAL FORMAT RULE: Write each label and all of its content on a single line. Put the label, then a colon, then the items separated by commas, all on the same one line. Never put items or ingredients on their own separate lines. Never start a line with a comma. Never use bullet points or dashes inside a meal item.
- You MUST provide exactly four options for Breakfast, four for Lunch, and four for Dinner. Use every one of these labels and never skip any: Breakfast Option 1, Breakfast Option 2, Breakfast Option 3, Breakfast Option 4, Lunch Option 1, Lunch Option 2, Lunch Option 3, Lunch Option 4, Dinner Option 1, Dinner Option 2, Dinner Option 3, Dinner Option 4. Twelve meal options total, this is required.
- Each meal option must list its exact ingredients with portion sizes (for example: 4 ounces grilled chicken, 1 cup brown rice, 1 cup steamed broccoli, 1 tablespoon olive oil), followed by a busy day substitution, all on one single line.
- Build the Grocery List first, tailored to the client's goal, calorie target, equipment, and limitations. It must be a comprehensive comma separated list of every food used across all twelve meal options plus the snack and workout meals, with rough weekly quantities where helpful. List it all on the single Grocery List line.
- Accuracy rule: every ingredient named in any meal option, snack, pre workout, or post workout must be a food that appears in the Grocery List, and every food in the Grocery List must be used in at least one meal. Do not introduce foods in meals that are not in the Grocery List, and do not list foods in the Grocery List that no meal uses.
- Still include workout specific meals, hydration, protein, carb, fat, calorie intake targets, and the goal behind each target
- Four Week Progression section: describe exactly how each of the 4 weeks changes from the last (specific load or rep changes per lift, following the ${periodization.name} scheme), so the client knows what to expect each week
- Recovery protocol covering sleep, nutrition timing, and deload strategy
- Key performance indicators and how to measure them
- Scientific rationale for every major recommendation
- Keep each section easy to scan with short numbered steps
- Use simple words and friendly direction
- Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols
- Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks`
}

async function callProgramService(messages: ProgramMessage[]) {
  const key = apiKey()
  if (!key) {
    return { error: 'Missing OpenAI API key. Add OPENAI_API_KEY to Supabase function secrets.' }
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: toProgramMessages(messages),
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || `Program request failed with status ${response.status}.`
    return { error: message, status: response.status }
  }

  const text = extractText(payload)
  if (!text) return { error: 'Program service returned an empty response.' }

  return { text: sanitizeCopy(text) }
}

function mediaMessages(history: ProgramMessage[], mediaPayload: Record<string, any>) {
  const mediaBlocks =
    mediaPayload.type === 'video'
      ? (mediaPayload.framesBase64 || []).map((frame: string) => ({
          type: 'input_image',
          image_url: dataUrl('image/jpeg', frame),
          detail: 'high',
        }))
      : [
          {
            type: 'input_image',
            image_url: dataUrl(mediaPayload.mimeType, mediaPayload.base64),
            detail: 'high',
          },
        ]

  return [
    ...history,
    {
      role: 'user' as const,
      content: [
        ...mediaBlocks,
        {
          type: 'input_text',
          text:
            'Analyze this exercise media like an elite biomechanics coach. Use simple words. Give clear form feedback, safety notes, corrective exercises, useful cues, and program changes. Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols. Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks.',
        },
      ],
    },
  ]
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  if (!authenticatedUserId(request)) {
    return jsonResponse({ error: 'Sign in before generating a program.' }, 401)
  }

  try {
    const body = await request.json()
    const action = body?.action
    let result: { text?: string; error?: string; status?: number }

    if (action === 'generateProgram') {
      if (!body.profile) return jsonResponse({ error: 'Missing profile.' }, 400)
      result = await callProgramService([
        { role: 'user', content: programPrompt(body.profile, body.options || {}) },
      ])
    } else if (action === 'sendMessage') {
      result = await callProgramService([
        ...(Array.isArray(body.history) ? body.history : []),
        { role: 'user', content: body.text || '' },
      ])
    } else if (action === 'analyzeMedia') {
      result = await callProgramService(mediaMessages(
        Array.isArray(body.history) ? body.history : [],
        body.mediaPayload || {},
      ))
    } else {
      return jsonResponse({ error: 'Unknown program action.' }, 400)
    }

    if (result.error) {
      return jsonResponse({ error: result.error }, result.status || 500)
    }

    return jsonResponse({ text: result.text })
  } catch (error) {
    console.error(error)
    return jsonResponse({ error: error.message || 'Program service failed.' }, 500)
  }
})
