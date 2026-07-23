import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const FAL_QUEUE_URL = 'https://queue.fal.run'
// Cheapest realistic option on Fal: Wan 2.5 image-to-video at 480p. Both are
// overridable by env so the model can be swapped without a code change.
const VIDEO_MODEL_ID = Deno.env.get('FAL_VIDEO_MODEL_ID') || 'fal-ai/wan-25-preview/image-to-video'
const VIDEO_RESOLUTION = Deno.env.get('FAL_VIDEO_RESOLUTION') || '480p'
const VIDEO_DURATION = Deno.env.get('FAL_VIDEO_DURATION') || '5'
const IMAGE_MODEL_ID = Deno.env.get('FAL_IMAGE_MODEL_ID') || 'fal-ai/flux/schnell'
// Hard cap on how many distinct exercise videos can ever be generated, as a
// spend guard: each unique exercise costs real money exactly once.
const MAX_LIBRARY_SIZE = Number(Deno.env.get('EXERCISE_VIDEO_MAX_LIBRARY') || 300)

const BUCKET = 'exercise-videos'
// A pending row with no Fal request id after this long means the submit crashed.
const SUBMIT_STALL_MS = 3 * 60 * 1000
// Give up on a generation entirely after this long so users are never stuck.
const GENERATION_TIMEOUT_MS = 20 * 60 * 1000

// Same normalization as generate-image's exercise matching, so free-text names
// like "Goblet Squat" and "goblet squat!" share one cache entry.
function normalizedKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
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

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase service role environment.')
  return createClient(url, serviceRoleKey)
}

// FAL_KEY comes from function secrets when set, otherwise from Supabase Vault
// via the service-role-only get_fal_key() accessor. Cached per instance.
let cachedFalKey: string | null = null

async function getFalKey(supabase: SupabaseClient): Promise<string> {
  if (cachedFalKey) return cachedFalKey
  const envKey = Deno.env.get('FAL_KEY')
  if (envKey) {
    cachedFalKey = envKey
    return envKey
  }
  const { data } = await supabase.rpc('get_fal_key')
  if (typeof data === 'string' && data) {
    cachedFalKey = data
    return data
  }
  throw new Error('Missing FAL_KEY. Add it to Supabase Vault or function secrets.')
}

async function falFetch(supabase: SupabaseClient, url: string, init?: RequestInit) {
  const key = await getFalKey(supabase)
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    const message =
      (Array.isArray(detail) ? detail[0]?.msg : typeof detail === 'string' ? detail : null) ||
      payload?.error ||
      `Fal request failed with status ${response.status}.`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return payload
}

// The Fal queue API takes the model input directly as the POST body and
// returns request_id plus ready-made status_url / response_url. Always use
// those returned URLs: models with subpaths (like wan-25-preview/image-to-video)
// do not poll at the same path they were submitted to.
async function submitFalJob(supabase: SupabaseClient, modelId: string, input: Record<string, unknown>) {
  const submitted = await falFetch(supabase, `${FAL_QUEUE_URL}/${modelId}`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!submitted?.request_id || !submitted?.status_url || !submitted?.response_url) {
    throw new Error('Fal did not return a request id.')
  }
  return {
    requestId: String(submitted.request_id),
    statusUrl: String(submitted.status_url),
    responseUrl: String(submitted.response_url),
  }
}

async function falJobStatus(supabase: SupabaseClient, statusUrl: string): Promise<string> {
  const status = await falFetch(supabase, statusUrl)
  return String(status?.status || 'IN_PROGRESS')
}

let bucketEnsured = false

async function ensureBucket(supabase: SupabaseClient) {
  if (bucketEnsured) return
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Could not create storage bucket: ${error.message}`)
  }
  bucketEnsured = true
}

async function uploadToBucket(supabase: SupabaseClient, path: string, sourceUrl: string, fallbackType: string) {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Could not download generated media (status ${response.status}).`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || fallbackType

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
  if (error) throw new Error(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Ensures the one fixed coach reference photo exists (generated once, then
// reused for every exercise so all clips show the same coach).
async function getOrCreateCoachReferenceImage(supabase: SupabaseClient): Promise<string> {
  const { data: config } = await supabase
    .from('video_generation_config')
    .select('coach_reference_image_url')
    .eq('id', true)
    .maybeSingle()

  if (config?.coach_reference_image_url) return config.coach_reference_image_url

  const job = await submitFalJob(supabase, IMAGE_MODEL_ID, {
    prompt:
      'professional photo of a friendly fitness coach, athletic build, standing in a neutral relaxed pose facing the camera, plain grey gym studio background, full body visible head to feet, fitted athletic clothing, natural even lighting, photorealistic',
    image_size: 'portrait_4_3',
    num_images: 1,
  })

  const deadline = Date.now() + 2 * 60 * 1000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    if ((await falJobStatus(supabase, job.statusUrl)) === 'COMPLETED') break
  }

  const result = await falFetch(supabase, job.responseUrl)
  const imageUrl = result?.images?.[0]?.url
  if (!imageUrl) throw new Error('Coach reference image generation returned no image.')

  const publicUrl = await uploadToBucket(supabase, 'coach-reference.png', imageUrl, 'image/png')
  await supabase.from('video_generation_config').upsert({ id: true, coach_reference_image_url: publicUrl })
  return publicUrl
}

function exercisePrompt(name: string) {
  return `The fitness coach from the reference image performs slow, controlled repetitions of the exercise "${name}" with perfect form, in a clean gym, camera locked off, full body always in frame, realistic human movement, no cuts.`
}

function ageMs(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime()
}

async function markFailed(supabase: SupabaseClient, key: string, message: string) {
  await supabase.from('exercise_videos').update({ status: 'failed', error: message }).eq('exercise_key', key)
  return jsonResponse({ status: 'failed', error: message })
}

async function handleRequest(supabase: SupabaseClient, exerciseName: string, key: string) {
  const { data: existing } = await supabase
    .from('exercise_videos')
    .select('status, video_url')
    .eq('exercise_key', key)
    .maybeSingle()

  if (existing?.status === 'ready') return jsonResponse({ status: 'ready', url: existing.video_url })
  if (existing?.status === 'pending') return jsonResponse({ status: 'pending' })
  if (existing?.status === 'failed') {
    // Clear the failed attempt so a fresh request can retry a transient error.
    await supabase.from('exercise_videos').delete().eq('exercise_key', key)
  }

  const { count } = await supabase.from('exercise_videos').select('id', { count: 'exact', head: true })
  if ((count || 0) >= MAX_LIBRARY_SIZE) {
    return jsonResponse({ status: 'failed', error: 'The demonstration library is full. Contact support to expand it.' })
  }

  const { error: insertError } = await supabase
    .from('exercise_videos')
    .insert({ exercise_key: key, exercise_name: exerciseName, status: 'pending', fal_model_id: VIDEO_MODEL_ID })
  if (insertError) {
    // 23505: a concurrent request inserted this row first — treat as in flight.
    if (insertError.code === '23505') return jsonResponse({ status: 'pending' })
    return jsonResponse({ error: insertError.message }, 500)
  }

  try {
    await ensureBucket(supabase)
    const referenceImageUrl = await getOrCreateCoachReferenceImage(supabase)
    const job = await submitFalJob(supabase, VIDEO_MODEL_ID, {
      prompt: exercisePrompt(exerciseName),
      image_url: referenceImageUrl,
      duration: VIDEO_DURATION,
      resolution: VIDEO_RESOLUTION,
    })

    await supabase
      .from('exercise_videos')
      .update({ fal_request_id: job.requestId, fal_status_url: job.statusUrl, fal_response_url: job.responseUrl })
      .eq('exercise_key', key)

    return jsonResponse({ status: 'pending' })
  } catch (err) {
    return markFailed(supabase, key, err instanceof Error ? err.message : 'Failed to start video generation.')
  }
}

async function handlePoll(supabase: SupabaseClient, key: string) {
  const { data: row } = await supabase
    .from('exercise_videos')
    .select('status, video_url, error, fal_status_url, fal_response_url, created_at')
    .eq('exercise_key', key)
    .maybeSingle()

  if (!row) return jsonResponse({ status: 'failed', error: 'No generation in progress for this exercise.' })
  if (row.status === 'ready') return jsonResponse({ status: 'ready', url: row.video_url })
  if (row.status === 'failed') return jsonResponse({ status: 'failed', error: row.error })

  if (!row.fal_status_url) {
    // The submitting invocation crashed before recording the job; self-heal.
    if (ageMs(row.created_at) > SUBMIT_STALL_MS) {
      return markFailed(supabase, key, 'Video generation did not start. Please try again.')
    }
    return jsonResponse({ status: 'pending' })
  }

  try {
    const status = await falJobStatus(supabase, row.fal_status_url)
    if (status !== 'COMPLETED') {
      if (ageMs(row.created_at) > GENERATION_TIMEOUT_MS) {
        return markFailed(supabase, key, 'Video generation timed out. Please try again.')
      }
      return jsonResponse({ status: 'pending' })
    }

    const result = await falFetch(supabase, row.fal_response_url)
    const videoUrl = result?.video?.url || result?.video_url || null
    if (!videoUrl) throw new Error('Fal completed the job but returned no video.')

    await ensureBucket(supabase)
    const publicUrl = await uploadToBucket(supabase, `${key.replace(/\s+/g, '-')}.mp4`, videoUrl, 'video/mp4')

    await supabase.from('exercise_videos').update({ status: 'ready', video_url: publicUrl }).eq('exercise_key', key)
    return jsonResponse({ status: 'ready', url: publicUrl })
  } catch (err) {
    return markFailed(supabase, key, err instanceof Error ? err.message : 'Video generation failed.')
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }
  if (!authenticatedUserId(request)) {
    return jsonResponse({ error: 'Sign in to view demonstrations.' }, 401)
  }

  try {
    const body = await request.json()
    const action = body?.action
    const exerciseName = String(body?.name || '').trim().slice(0, 80)
    const key = normalizedKey(exerciseName)
    if (!key) return jsonResponse({ error: 'Missing exercise name.' }, 400)

    const supabase = supabaseAdmin()
    if (action === 'request') return await handleRequest(supabase, exerciseName, key)
    if (action === 'poll') return await handlePoll(supabase, key)
    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (err) {
    console.error('[generate-exercise-video] Unexpected error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected server error.' }, 500)
  }
})
