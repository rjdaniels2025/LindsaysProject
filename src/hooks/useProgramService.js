import { supabase } from '../lib/supabase.js'

async function callProgramService(action, body) {
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
  if (!data?.text) throw new Error('Program service returned an empty response.')

  return data.text
}

async function generateProgram(profile, options = {}) {
  return callProgramService('generateProgram', { profile, options })
}

async function sendMessage(history, userText) {
  return callProgramService('sendMessage', {
    history,
    text: userText,
  })
}

async function analyzeMedia(history, mediaPayload) {
  return callProgramService('analyzeMedia', { history, mediaPayload })
}

const programService = {
  generateProgram,
  sendMessage,
  analyzeMedia,
}

export function useProgramService() {
  return programService
}
