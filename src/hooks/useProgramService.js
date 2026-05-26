const SYSTEM_PROMPT =
  'You are an elite sports scientist and certified strength and conditioning specialist with deep expertise in exercise physiology, biomechanics, and evidence based training. Give precise recommendations, but explain them in simple everyday language that an average person can follow. Use short sections, clear steps, and friendly wording. Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols. Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks.'

const API_URL = import.meta.env.VITE_PROGRAM_API_URL || `https://api.${'open'}${'ai'}.com/v1/responses`
const MODEL = import.meta.env.VITE_PROGRAM_MODEL || 'gpt-5.5'
const MAX_OUTPUT_TOKENS = 8096

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

function programPrompt(profile) {
  return `Generate a fully personalized science-based training program for this client.

Client profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weightLbs} lbs
- Height: ${profile.height}
- Primary goals: ${formatGoals(profile.primaryGoal)}
- Training experience: ${profile.experience}
- Training days per week: ${profile.daysPerWeek}
- Equipment access: ${profile.equipment}
- Injuries or limitations: ${profile.limitations || 'None reported'}

Include:
- Start with a friendly "Today first" section that gives the user's first 3 actions in plain language
- Use clear plain headings exactly named: Today First, Weekly Map, Workouts, Meal Plan, Eight Week Progression, Recovery, Track Progress, Why This Works
- Specific sets, reps, rest periods, and tempo notation such as 3-1-2-0
- Weekly training split with every session detailed
- In the Workouts section, write every exercise on its own line using this exact pattern: Exercise name: Sets: number, Reps: number or time, Weight: exact beginner safe weight range in pounds or bodyweight, Rest: seconds or minutes, Tempo: numbers separated by commas, Cue: one simple coaching cue
- For any weighted exercise, give a realistic starting weight range based on the client's body weight, experience, equipment, and limitations. Use simple ranges like 10 to 20 lbs, 20 to 35 lbs, or 45 to 65 lbs. For bodyweight exercises, write Weight: Bodyweight.
- Include weight guidance that is safe and practical. Tell the user to choose a load that leaves 2 to 3 reps in reserve and to reduce weight if form breaks.
- Put warmup and cooldown notes on their own short lines before or after the exercise lines
- In the Meal Plan section, create a detailed daily meal plan that is easy to follow and matched to the user's goal, body size, schedule, and training days
- In the Meal Plan section, start with Grocery List before any meal options
- In the Meal Plan section, use these exact line labels in this order: Grocery List, Protein Target, Calorie Target, Water Target, Carb Target, Fat Target, Breakfast Option 1, Breakfast Option 2, Breakfast Option 3, Breakfast Option 4, Lunch Option 1, Lunch Option 2, Lunch Option 3, Lunch Option 4, Dinner Option 1, Dinner Option 2, Dinner Option 3, Dinner Option 4, Snack, Pre Workout, Post Workout, Training Day Intake, Rest Day Intake, Prep Steps
- For breakfast, lunch, and dinner, give 4 simple options each with portion sizes and a busy day substitution
- Still include workout specific meals, hydration, protein, carb, fat, calorie intake targets, and the goal behind each target
- Eight week progressive overload plan
- Recovery protocol covering sleep, nutrition timing, and deload strategy
- Key performance indicators and how to measure them
- Scientific rationale for every major recommendation
- Keep each section easy to scan with short numbered steps
- Use simple words and friendly direction
- Do not use em dashes, asterisks, square brackets, markdown symbols, bullet symbols, or decorative symbols
- Only use commas, periods, colons, quotation marks, regular parentheses, and exclamation marks`
}

export function useProgramService() {
  async function generateProgram(profile) {
    return callProgramService([
      {
        role: 'user',
        content: programPrompt(profile),
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

  return {
    generateProgram,
    sendMessage,
    analyzeMedia,
  }
}
