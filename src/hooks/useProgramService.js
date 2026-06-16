import { supabase } from '../lib/supabase.js'

// Program generation runs as an OpenAI background job: we kick it off, then poll for the
// result. Each request is quick, so a slow model can never trip the edge function timeout.
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 10 * 60 * 1000 // give a slow, high-quality model plenty of room

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function invoke(action, body = {}) {
  if (!supabase) {
    throw new Error('Account system is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('program-service', {
    body: { action, ...body },
  })

  if (error) {
    const message =
      typeof error?.context?.json === 'function'
        ? await error.context.json().then((j) => j?.error || error.message).catch(() => error.message)
        : error.message || 'Program service request failed.'
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)
  return data
}

async function invokeForText(action, body = {}) {
  const data = await invoke(action, body)
  if (!data?.text) throw new Error('Program service returned an empty response.')
  return data.text
}

async function generateProgram(profile, options = {}) {
  const start = await invoke('startProgram', { profile, options })
  if (!start?.id) throw new Error('Could not start program generation.')

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    // A failed job sets data.error, which invoke() throws — surfacing the real reason.
    const result = await invoke('pollProgram', { id: start.id })
    if (result.status === 'completed') {
      if (!result.text) throw new Error('Program generation returned empty output.')
      return result.text
    }
    // queued or in_progress: keep waiting
  }

  throw new Error('Program generation is taking longer than expected. Please try again.')
}

async function sendMessage(history, userText) {
  return invokeForText('sendMessage', { history, text: userText })
}

async function analyzeMedia(history, mediaPayload) {
  return invokeForText('analyzeMedia', { history, mediaPayload })
}

const programService = {
  generateProgram,
  sendMessage,
  analyzeMedia,
}

export function useProgramService() {
  return programService
}
