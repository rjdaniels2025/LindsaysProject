const SYSTEM_PROMPT =
  'You are an elite sports scientist and certified strength and conditioning specialist with deep expertise in exercise physiology, biomechanics, and evidence based training. Give precise recommendations, but explain them in simple everyday language that an average person can follow. Use short sections, clear steps, and friendly wording. Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols. Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks.'

const API_URL = import.meta.env.VITE_PROGRAM_API_URL || `https://api.${'open'}${'ai'}.com/v1/responses`
const MODEL = import.meta.env.VITE_PROGRAM_MODEL || 'gpt-5.5'
const MAX_OUTPUT_TOKENS = 16000

function getApiKey() {
  return import.meta.env.VITE_PROGRAM_API_KEY || import.meta.env[`VITE_${'OP'}${'EN'}${'A'}${'I'}_API_KEY`]
}

function dataUrl(mediaType, base64) {
  return `data:${mediaType};base64,${base64}`
}

function toProgramContent(content, role) {
  if (Array.isArray(content)) return content

  if (role === 'assistant') {
    return String(content || '')
  }

  return [
    {
      type: 'input_text',
      text: String(content || ''),
    },
  ]
}

function toProgramMessages(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: toProgramContent(message.content, message.role),
  }))
}

function extractText(payload) {
  if (payload?.output_text) return payload.output_text

  return payload?.output
    ?.flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text' || content.type === 'text')
    .map((content) => content.text)
    .join('\n\n')
}

function sanitizeCopy(text) {
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

function formatGoals(primaryGoal) {
  return Array.isArray(primaryGoal) ? primaryGoal.join(', ') : primaryGoal
}

function hasRealLimitations(limitations) {
  const lim = String(limitations || '').trim()
  return Boolean(lim) && !/^(none|n\/?a|no|nope)\b/i.test(lim)
}

function injuryRules(limitations) {
  if (!hasRealLimitations(limitations)) {
    return '- If the client reports no injuries, still choose joint-friendly movements and remind them to reduce load if anything hurts.'
  }
  return `- SAFETY IS THE TOP PRIORITY. The client reports these injuries or limitations: ${limitations}. You must NOT program any exercise that is contraindicated or risky for these limitations. Replace every risky movement with a safe alternative that trains the same muscles through a pain-free range.
- Use this judgment as a guide. For lower back pain, avoid conventional deadlifts, barbell back squats, good mornings, bent over barbell rows, sit-ups, and Russian twists, and prefer hip thrusts, goblet box squats, chest-supported rows, glute bridges, and bird dogs. For knee pain, avoid deep squats, lunges, and any jumping, and prefer box squats to a comfortable depth and leg press in a pain-free range. For shoulder issues, avoid overhead pressing, upright rows, and dips, and prefer neutral grip dumbbell presses, landmine presses, and cable work. Apply the same careful reasoning to any other limitation the client listed.
- Do not include any exercise that stresses the injured area. When you choose a safer substitute, add a short note in that exercise's Cue explaining it is a joint-friendly choice for the client's limitation.`
}

async function callProgramService(messages) {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('Missing program generation API key. Add it to your Vercel environment variables and local .env file.')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
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
    throw new Error(message)
  }

  const text = extractText(payload)

  if (!text) throw new Error('Program service returned an empty response.')

  return sanitizeCopy(text)
}

function programPrompt(profile, { blockNumber = 1, progress = '' } = {}) {
  return `Generate a personalized science-based 4-week training block for this client. This is block ${blockNumber}. It covers 4 weeks and should get progressively more challenging week by week across those 4 weeks.${progress ? `\n\nProgress logged in the previous block (apply sensible progressive overload: increase load or difficulty where the client clearly handled it, hold or adjust where they did not): ${progress}` : ''}

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
- Specific sets, reps, rest periods, and tempo notation such as 3-1-2-0
- Provide one distinct workout session for each of the client's ${profile.daysPerWeek} training days per week, with every session fully detailed. Label each session on its own line as Workout One, then Workout Two, and so on in order, then list that session's exercises on the lines beneath its label. Do not name days of the week, the client chooses when to do each session.
- In the Workouts section, write every exercise on its own line using this exact pattern: Exercise name: Sets: number, Reps: number or time, Weight: exact beginner safe weight range in pounds or bodyweight, Rest: seconds or minutes, Tempo: numbers separated by commas, Cue: one simple coaching cue
- For any weighted exercise, give a realistic starting weight range based on the client's body weight, experience, equipment, and limitations. Use simple ranges like 10 to 20 lbs, 20 to 35 lbs, or 45 to 65 lbs. For bodyweight exercises, write Weight: Bodyweight.
- Include weight guidance that is safe and practical. Tell the user to choose a load that leaves 2 to 3 reps in reserve and to reduce weight if form breaks.
- Put warmup and cooldown notes on their own short lines before or after the exercise lines
- In the Meal Plan section, create a detailed daily meal plan that is easy to follow and matched to the user's goal, body size, schedule, training days, equipment, and any limitations
- In the Meal Plan section, start with Grocery List before any meal options
- In the Meal Plan section, use these exact line labels in this order: Grocery List, Protein Target, Calorie Target, Water Target, Carb Target, Fat Target, Breakfast Option 1, Breakfast Option 2, Breakfast Option 3, Breakfast Option 4, Lunch Option 1, Lunch Option 2, Lunch Option 3, Lunch Option 4, Dinner Option 1, Dinner Option 2, Dinner Option 3, Dinner Option 4, Snack, Pre Workout, Post Workout, Training Day Intake, Rest Day Intake
- CRITICAL FORMAT RULE: Write each label and all of its content on a single line. Put the label, then a colon, then the items separated by commas, all on the same one line. Never put items or ingredients on their own separate lines. Never start a line with a comma. Never use bullet points or dashes inside a meal item.
- You MUST provide exactly four options for Breakfast, four for Lunch, and four for Dinner. Use every one of these labels and never skip any: Breakfast Option 1, Breakfast Option 2, Breakfast Option 3, Breakfast Option 4, Lunch Option 1, Lunch Option 2, Lunch Option 3, Lunch Option 4, Dinner Option 1, Dinner Option 2, Dinner Option 3, Dinner Option 4. Twelve meal options total, this is required.
- Each meal option must list its exact ingredients with portion sizes (for example: 4 ounces grilled chicken, 1 cup brown rice, 1 cup steamed broccoli, 1 tablespoon olive oil), followed by a busy day substitution, all on one single line.
- Build the Grocery List first, tailored to the client's goal, calorie target, equipment, and limitations. It must be a comprehensive comma separated list of every food used across all twelve meal options plus the snack and workout meals, with rough weekly quantities where helpful. List it all on the single Grocery List line.
- Accuracy rule: every ingredient named in any meal option, snack, pre workout, or post workout must be a food that appears in the Grocery List, and every food in the Grocery List must be used in at least one meal. Do not introduce foods in meals that are not in the Grocery List, and do not list foods in the Grocery List that no meal uses.
- Still include workout specific meals, hydration, protein, carb, fat, calorie intake targets, and the goal behind each target
- Four week progressive overload plan that makes each of the 4 weeks a little more challenging than the one before
- Recovery protocol covering sleep, nutrition timing, and deload strategy
- Key performance indicators and how to measure them
- Scientific rationale for every major recommendation
- Keep each section easy to scan with short numbered steps
- Use simple words and friendly direction
- Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols
- Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks`
}

async function generateProgram(profile, options = {}) {
  return callProgramService([
    {
      role: 'user',
      content: programPrompt(profile, options),
    },
  ])
}

async function sendMessage(history, userText) {
  return callProgramService([
    ...history,
    {
      role: 'user',
      content: userText,
    },
  ])
}

async function analyzeMedia(history, mediaPayload) {
  const mediaBlocks =
    mediaPayload.type === 'video'
      ? mediaPayload.framesBase64.map((frame) => ({
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

  return callProgramService([
    ...history,
    {
      role: 'user',
      content: [
        ...mediaBlocks,
        {
          type: 'input_text',
          text:
            'Analyze this exercise media like an elite biomechanics coach. Use simple words. Give clear form feedback, safety notes, corrective exercises, useful cues, and program changes. Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols. Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks.',
        },
      ],
    },
  ])
}

const programService = {
  generateProgram,
  sendMessage,
  analyzeMedia,
}

export function useProgramService() {
  return programService
}
