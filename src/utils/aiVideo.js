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

// Mirrors supabase/functions/_shared/exerciseKey.ts and the exercise_key()
// used by the admin dashboard. Programs write the same movement several ways,
// so the coach can mark one video as demonstrating several exercise names;
// this resolves the name on screen to the key those links are stored under.
const NOT_PLURAL = new Set([
  'press', 'cross', 'triceps', 'biceps', 'abs', 'lats',
  'glutes', 'calves', 'hamstrings', 'quads', 'plus',
])
const SPELLING_ALIASES = {
  dumbell: 'dumbbell', dumbells: 'dumbbell', dumbbells: 'dumbbell',
  barbells: 'barbell', bicep: 'biceps', tricep: 'triceps',
}

function singularize(token) {
  if (NOT_PLURAL.has(token)) return token
  if (token.length > 3 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('ses')) return token.slice(0, -2)
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

function exerciseKeyOf(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => singularize(SPELLING_ALIASES[token] || token))
    .join(' ')
}

// A video the coach marked as also demonstrating this exercise. Read straight
// from the table, which is public-readable like exercise_videos itself, so a
// borrowed clip resolves without an edge call and without triggering a paid
// generation for a movement she has already filmed.
async function linkedVideoUrl(name) {
  if (!supabase) return null
  const key = exerciseKeyOf(name)
  if (!key) return null

  try {
    const { data: link } = await supabase
      .from('exercise_video_links')
      .select('video_id')
      .eq('exercise_key', key)
      .maybeSingle()
    if (!link?.video_id) return null

    // Two plain reads rather than an embedded select: both tables are already
    // public-readable, and this does not depend on how PostgREST happens to
    // name the relationship.
    const { data: video } = await supabase
      .from('exercise_videos')
      .select('status, video_url')
      .eq('id', link.video_id)
      .maybeSingle()

    return video?.status === 'ready' && video.video_url ? video.video_url : null
  } catch {
    return null
  }
}

async function invokeVideoService(action, name, description) {
  if (!supabase) return { status: 'failed', error: 'Video service is not configured.' }

  const { data, error } = await supabase.functions.invoke('generate-exercise-video', {
    body: description ? { action, name, description } : { action, name },
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
// ready or failed. `description` is the exercise's coaching cue, used server-side
// to make the generated movement match the app's own form instructions.
// `shouldContinue` lets the caller stop polling on unmount; a cancelled wait
// resolves null without caching, so a later request retries.
export async function requestExerciseVideo(name, description, shouldContinue = () => true) {
  if (!name) return null
  if (cache.has(name)) return cache.get(name)
  if (inflight.has(name)) return inflight.get(name)

  const promise = (async () => {
    try {
      // Check for a coach-linked clip first: it is already recorded, so there
      // is nothing to generate and nothing to wait for.
      const linked = await linkedVideoUrl(name)
      if (linked) {
        cache.set(name, linked)
        return linked
      }

      let outcome = await invokeVideoService('request', name, description)
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
