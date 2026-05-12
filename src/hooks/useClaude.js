const SYSTEM_PROMPT =
  'You are an elite sports scientist and certified strength & conditioning specialist (CSCS) with deep expertise in exercise physiology, biomechanics, and evidence-based training. Always provide highly specific, science-backed recommendations referencing rep ranges tied to specific adaptations, progressive overload percentages, RPE/RIR guidance, energy system training, recovery science, and periodization models. Never give generic advice — tailor everything precisely.'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 8096

function getApiKey() {
  return import.meta.env.VITE_ANTHROPIC_API_KEY
}

function normalizeContent(content) {
  if (Array.isArray(content)) return content
  return [{ type: 'text', text: String(content || '') }]
}

function toAnthropicMessages(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: normalizeContent(message.content),
  }))
}

async function callClaude(messages) {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('Missing VITE_ANTHROPIC_API_KEY. Add it to your Vercel environment variables and local .env file.')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: toAnthropicMessages(messages),
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Claude request failed with status ${response.status}.`
    throw new Error(message)
  }

  const text = payload?.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n')

  if (!text) throw new Error('Claude returned an empty response.')

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

export function useClaude() {
  async function generateProgram(profile) {
    return callClaude([
      {
        role: 'user',
        content: programPrompt(profile),
      },
    ])
  }

  async function sendMessage(history, userText) {
    return callClaude([
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
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: frame,
            },
          }))
        : [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaPayload.mimeType,
                data: mediaPayload.base64,
              },
            },
          ]

    return callClaude([
      ...history,
      {
        role: 'user',
        content: [
          ...mediaBlocks,
          {
            type: 'text',
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
