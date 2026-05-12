const SYSTEM_PROMPT =
  'You are an elite sports scientist and certified strength & conditioning specialist (CSCS) with deep expertise in exercise physiology, biomechanics, and evidence-based training. Always provide highly specific, science-backed recommendations referencing rep ranges tied to specific adaptations, progressive overload percentages, RPE/RIR guidance, energy system training, recovery science, and periodization models. Never give generic advice — tailor everything precisely.'

const API_URL = 'https://api.openai.com/v1/responses'
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.5'
const MAX_OUTPUT_TOKENS = 8096

function getApiKey() {
  return import.meta.env.VITE_OPENAI_API_KEY
}

function dataUrl(mediaType, base64) {
  return `data:${mediaType};base64,${base64}`
}

function toOpenAIContent(content, role) {
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

function toOpenAIMessages(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: toOpenAIContent(message.content, message.role),
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

async function callOpenAI(messages) {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your Vercel environment variables and local .env file.')
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
      input: toOpenAIMessages(messages),
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || `OpenAI request failed with status ${response.status}.`
    throw new Error(message)
  }

  const text = extractText(payload)

  if (!text) throw new Error('OpenAI returned an empty response.')

  return text
}

function programPrompt(profile) {
  return `Generate a fully personalized science-based training program for this client.

Client profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weightLbs} lbs
- Height: ${profile.height}
- Primary goal: ${profile.primaryGoal}
- Training experience: ${profile.experience}
- Training days per week: ${profile.daysPerWeek}
- Equipment access: ${profile.equipment}
- Injuries or limitations: ${profile.limitations || 'None reported'}

Include:
- Specific sets, reps, rest periods, and tempo notation such as 3-1-2-0
- Weekly training split with every session detailed
- 8-week progressive overload plan
- Recovery protocol covering sleep, nutrition timing, and deload strategy
- Key performance indicators and how to measure them
- Scientific rationale for every major recommendation`
}

export function useOpenAI() {
  async function generateProgram(profile) {
    return callOpenAI([
      {
        role: 'user',
        content: programPrompt(profile),
      },
    ])
  }

  async function sendMessage(history, userText) {
    return callOpenAI([
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

    return callOpenAI([
      ...history,
      {
        role: 'user',
        content: [
          ...mediaBlocks,
          {
            type: 'input_text',
            text:
              'Analyze this exercise media like an elite biomechanics coach. Provide form feedback, likely movement faults, safety concerns, corrective exercises, useful cues, and any program adjustments needed based on what you observe.',
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
