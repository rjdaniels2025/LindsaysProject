import { supabase } from '../lib/supabase.js'

// name -> video url string, or null when generation failed. Absence means the
// video has not been requested this session (the server cache is permanent, so
// a fresh session's first request for a known exercise resolves instantly).
const cache = new Map()
const inflight = new Map()
const POLL_INTERVAL_MS = 4000

// undefined = not requested yet, null = failed, string = ready url.
export function peekVideoCache(name) {
  return cache.get(name)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function invokeVideoService(action, name) {
  if (!supabase) return { status: 'failed', error: 'Video service is not configured.' }

  const { data, error } = await supabase.functions.invoke('generate-exercise-video', {
    body: { action, name },
  })

  if (error) {
    console.error('[aiVideo] Edge function error:', error.message)
    return { status: 'failed', error: error.message }
  }
  if (data?.error && !data?.status) return { status: 'failed', error: data.error }
  return data
}

// Requests a demonstration video for an exercise, waiting through the one-time
// generation (per unique exercise name, shared across all users) until it is
// ready or failed. `shouldContinue` lets the caller stop polling on unmount;
// a cancelled wait resolves null without caching, so a later request retries.
export async function requestExerciseVideo(name, shouldContinue = () => true) {
  if (!name) return null
  if (cache.has(name)) return cache.get(name)
  if (inflight.has(name)) return inflight.get(name)

  const promise = (async () => {
    try {
      let outcome = await invokeVideoService('request', name)
      while (outcome?.status === 'pending') {
        if (!shouldContinue()) return null
        await sleep(POLL_INTERVAL_MS)
        outcome = await invokeVideoService('poll', name)
      }
      const url = outcome?.status === 'ready' && outcome.url ? outcome.url : null
      cache.set(name, url)
      return url
    } finally {
      inflight.delete(name)
    }
  })()

  inflight.set(name, promise)
  return promise
}
