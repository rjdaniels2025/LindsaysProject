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
// Kling 2.5 Turbo Pro. NOTE: Google Veo 3.1 is the realism leader, but its
// safety checker hard-blocks animating photorealistic full-body people (even
// plain gym form demos), and no parameter — max safety_tolerance, auto_fix —
// gets past it, so Veo is unusable for this content. Kling has no such filter.
// Overridable by env so the model can be swapped without a code change.
const VIDEO_MODEL_ID = Deno.env.get('FAL_VIDEO_MODEL_ID') || 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
const VIDEO_ASPECT_RATIO = Deno.env.get('FAL_VIDEO_ASPECT_RATIO') || '9:16'
const VIDEO_DURATION = Deno.env.get('FAL_VIDEO_DURATION') || '5'
const VIDEO_DURATION_SECONDS = VIDEO_DURATION.replace(/[^0-9]/g, '') || '5'
const IMAGE_MODEL_ID = Deno.env.get('FAL_IMAGE_MODEL_ID') || 'fal-ai/kling-image/o3/text-to-image'
// Image-to-image model used to place the coach into each exercise's starting
// position WITH the right equipment. Image-to-video is hard-anchored to its
// start frame: equipment absent from frame one never appears mid-clip, so
// every exercise gets its own setup frame derived from the coach reference.
const SETUP_IMAGE_MODEL_ID = Deno.env.get('FAL_SETUP_IMAGE_MODEL_ID') || 'fal-ai/kling-image/o3/image-to-image'
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
// those returned URLs: models with subpaths (like kling-video/v2.5-turbo/pro)
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

// Submits an image job and waits for its result inline. Image generation is
// fast enough (~5-20s) to poll within one invocation, unlike video.
async function generateImage(supabase: SupabaseClient, modelId: string, input: Record<string, unknown>): Promise<string> {
  const job = await submitFalJob(supabase, modelId, input)
  const deadline = Date.now() + 2 * 60 * 1000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    if ((await falJobStatus(supabase, job.statusUrl)) === 'COMPLETED') break
  }
  const result = await falFetch(supabase, job.responseUrl)
  const imageUrl = result?.images?.[0]?.url
  if (!imageUrl) throw new Error('Image generation returned no image.')
  return imageUrl
}

// Ensures the one fixed coach reference photo exists (generated once, then
// reused as the identity anchor for every exercise's setup frame).
async function getOrCreateCoachReferenceImage(supabase: SupabaseClient): Promise<string> {
  const { data: config } = await supabase
    .from('video_generation_config')
    .select('coach_reference_image_url')
    .eq('id', true)
    .maybeSingle()

  if (config?.coach_reference_image_url) return config.coach_reference_image_url

  // Elevate HNF brand kit: black + lime accent (#e8ff47) on a dark premium gym.
  const imageUrl = await generateImage(supabase, IMAGE_MODEL_ID, {
    prompt:
      'photorealistic professional photo of a friendly fitness coach, athletic build, standing in a neutral relaxed pose facing the camera, full body visible head to feet, wearing a fitted matte black athletic t-shirt with a subtle lime-yellow accent trim and small lime-yellow chest logo mark, black training shorts with matching lime-yellow accent stripes, clean black training shoes, inside a dark modern premium gym with matte black equipment softly blurred in the background, soft even key lighting with a subtle lime-yellow accent glow, sharp focus, realistic skin texture, natural proportions, no text, no watermark',
    aspect_ratio: '3:4',
    num_images: 1,
  })

  const publicUrl = await uploadToBucket(supabase, 'coach-reference.png', imageUrl, 'image/png')
  await supabase.from('video_generation_config').upsert({ id: true, coach_reference_image_url: publicUrl })
  return publicUrl
}

// Places the coach (identity from the reference photo) into the exercise's
// exact starting position with the correct equipment already in frame, so the
// video's first frame contains everything the movement needs.
async function generateSetupFrame(
  supabase: SupabaseClient,
  key: string,
  setupPrompt: string,
  coachReferenceUrl: string,
): Promise<string> {
  const imageUrl = await generateImage(supabase, SETUP_IMAGE_MODEL_ID, {
    prompt: setupPrompt,
    image_urls: [coachReferenceUrl],
    aspect_ratio: '9:16',
    num_images: 1,
  })
  return uploadToBucket(supabase, `${key.replace(/\s+/g, '-')}-start.png`, imageUrl, 'image/png')
}

// Fallback prompts when the AI prompt-engineering stage is unavailable.
function staticSetupPrompt(name: string) {
  return `The same coach from the reference photo, same outfit and same dark gym, now standing in the exact textbook starting position of the exercise "${name}", holding and gripping every piece of equipment that exercise requires, full body visible head to feet, facing the camera, photorealistic, sharp focus, no text, no watermark.`
}

function staticMotionPrompt(name: string) {
  return `MEDIUM WIDE SHOT on a locked tripod, the full body framed head to feet, zero camera movement. The coach, already in the starting position shown, performs two slow, controlled repetitions of the exercise "${name}" with textbook-perfect form, keeping hold of the same equipment throughout, torso upright and core braced, feet planted, realistic weight and momentum, athletic fabric shifting naturally, visible steady breathing, soft gym key lighting, one smooth unbroken take. Avoid: extra or missing limbs, distorted or bending joints, equipment changing shape or floating, a second person, warping face, camera shake, jump cuts, on-screen text or watermarks.`
}

const PROMPT_MODEL = Deno.env.get('EXERCISE_PROMPT_MODEL') || 'gpt-4.1'

// Two-stage generation: a prompt-engineering model turns the bare exercise
// name into a biomechanically exact setup-image prompt and a rich, cinematic
// motion prompt before the video job is submitted. Runs once per unique
// exercise ever (results are cached), so the added cost is negligible.
const EXERCISE_DEMO_SYSTEM_PROMPT = `You are a world-class prompt engineer for AI exercise demonstration videos with the biomechanics knowledge of a certified strength and conditioning specialist. The pipeline works in two stages and you write one prompt for each:

STAGE 1 — SETUP FRAME (Kling image-to-image): a reference photo of the coach is edited to place him in the exercise's starting position. Your "setup_image_prompt" drives this edit.
STAGE 2 — VIDEO (Kling image-to-video): the setup frame becomes the first frame of a short clip. Your "motion_prompt" drives the movement. The video model cannot introduce equipment that is not already visible in the setup frame — the setup frame must contain EVERYTHING the exercise needs. It rewards richly detailed, precisely choreographed prompts; be specific and physical.

EXERCISE ACCURACY — HIGHEST PRIORITY RULE FOR BOTH PROMPTS:
The setup and movement must match the EXACT named exercise variant, never a lookalike. A goblet squat holds one dumbbell vertically at the chest; a front squat racks a barbell on the shoulders; a Romanian deadlift keeps knees nearly fixed while a conventional deadlift does not. A lateral raise holds a dumbbell in EACH hand at the sides. State the precise equipment, grip, stance, and movement path for the named variant. If the exercise uses no equipment, say bodyweight only, hands positioned exactly as the movement requires.

SETUP_IMAGE_PROMPT RULES (50-80 words):
- Begin with: "The same coach from the reference photo, same outfit, same dark gym," — this preserves identity and brand.
- Then describe the exact textbook STARTING position of the named exercise: stance width, grip, where each piece of equipment is held or positioned, body angles, gaze. Name every piece of equipment explicitly (e.g. "holding one dumbbell in each hand at his sides"). For bench/machine exercises, include the bench or machine and the coach positioned on it.
- End with: "full body visible head to feet, photorealistic, sharp focus, no text, no watermark."

MOTION_PROMPT RULES (90-140 words, richly descriptive):
- Open with exactly: "MEDIUM WIDE SHOT on a locked tripod, the full body framed head to feet, zero camera movement." — the entire body stays visible.
- The first frame ALREADY shows the coach in the starting position holding the equipment. Never re-describe his appearance or introduce new equipment; the movement uses exactly what the frame contains, and he keeps hold of it for the entire clip.
- Choreograph TWO complete, slow, controlled repetitions across the clip so the movement path is unmistakable. Break each rep into explicit phases with named joint actions AND concrete angles / body landmarks: e.g. "elbows held soft at roughly 15 degrees, arms rising in the scapular plane out to exactly shoulder height until the wrists are level with the shoulders, a brief one-second hold at the top, then lowering under control back to the sides over two seconds." Specify tempo for each phase and the pause at the end range. State the fixed points that must NOT move (torso upright, core braced, feet planted, spine neutral).
- REALISM PHYSICS — include at least 3, phrased physically: athletic fabric shifting and creasing with each rep; the weight's real mass and momentum, settling with gravity, never floating; visible controlled breathing and core bracing; feet planted with pressure through the whole foot; soft gym key lighting with gentle contact shadows.
- Close with continuity anchors then an avoid-clause: "...the same coach throughout, equipment gripped continuously, lighting and background constant, one smooth unbroken take. Avoid: extra or missing limbs, distorted or bending joints, equipment changing shape or floating, a second person, warping face, camera shake, jump cuts, on-screen text or watermarks."

COACH'S FORM TIP — when the request includes one:
The tip is the app's own coaching instruction for this exercise. Its technique content (setup, body position, movement path, safety checks) is a set of MANDATORY constraints — the setup frame and depicted movement must visibly follow every one of them. However, ignore anything in the tip that is client-specific: injury references, substitution explanations, or personal remarks. The clip is shared by every user of the app, so only universal, textbook form belongs in it.

OUTPUT — STRICT JSON:
Return ONLY a JSON object: {"setup_image_prompt": "...", "motion_prompt": "..."}. No markdown, no commentary.`

type ExercisePrompts = { setupPrompt: string; motionPrompt: string }

function fallbackPrompts(exerciseName: string): ExercisePrompts {
  return { setupPrompt: staticSetupPrompt(exerciseName), motionPrompt: staticMotionPrompt(exerciseName) }
}

async function buildExercisePrompts(exerciseName: string, tip: string): Promise<ExercisePrompts> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return fallbackPrompts(exerciseName)

  const tipLine = tip ? `\nCoach's form tip: ${tip}` : ''

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PROMPT_MODEL,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXERCISE_DEMO_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Exercise: ${exerciseName}\nClip duration: ${VIDEO_DURATION_SECONDS} seconds (choreograph two complete repetitions)${tipLine}\n\nWrite the setup_image_prompt and motion_prompt. Return only the JSON object.`,
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`OpenAI prompt enhancement failed with status ${response.status}.`)
    const payload = await response.json()
    const parsed = JSON.parse(payload?.choices?.[0]?.message?.content || '{}')
    const setupPrompt = String(parsed.setup_image_prompt || '').trim()
    const motionPrompt = String(parsed.motion_prompt || '').trim()
    // Guard against empty or runaway outputs; the fallbacks always work. The
    // motion prompt is intentionally long (two-rep choreography), so allow room.
    const valid = (s: string) => s.length >= 40 && s.length <= 2000
    if (!valid(setupPrompt) || !valid(motionPrompt)) return fallbackPrompts(exerciseName)
    return { setupPrompt, motionPrompt }
  } catch (err) {
    console.error('[generate-exercise-video] Prompt enhancement failed, using fallback:', err)
    return fallbackPrompts(exerciseName)
  }
}

function ageMs(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime()
}

async function markFailed(supabase: SupabaseClient, key: string, message: string) {
  await supabase.from('exercise_videos').update({ status: 'failed', error: message }).eq('exercise_key', key)
  return jsonResponse({ status: 'failed', error: message })
}

async function handleRequest(supabase: SupabaseClient, exerciseName: string, key: string, tip: string) {
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
    const { setupPrompt, motionPrompt } = await buildExercisePrompts(exerciseName, tip)
    // The setup frame carries the equipment into the video's first frame —
    // image-to-video cannot conjure equipment the frame doesn't contain.
    const setupFrameUrl = await generateSetupFrame(supabase, key, setupPrompt, referenceImageUrl)
    // The motion prompt's trailing "Avoid:" clause carries the negative
    // constraints, so no separate negative_prompt field is needed.
    const job = await submitFalJob(supabase, VIDEO_MODEL_ID, {
      prompt: motionPrompt,
      image_url: setupFrameUrl,
      duration: VIDEO_DURATION,
      aspect_ratio: VIDEO_ASPECT_RATIO,
      generate_audio: false,
      cfg_scale: 0.5,
    })

    await supabase
      .from('exercise_videos')
      .update({
        fal_request_id: job.requestId,
        fal_status_url: job.statusUrl,
        fal_response_url: job.responseUrl,
        generation_prompt: `SETUP: ${setupPrompt}\n\nMOTION: ${motionPrompt}`,
      })
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
    // The app's own coaching cue for this exercise; folded into the prompt
    // engineering stage as mandatory form constraints.
    const tip = String(body?.description || '').trim().slice(0, 300)
    const key = normalizedKey(exerciseName)
    if (!key) return jsonResponse({ error: 'Missing exercise name.' }, 400)

    const supabase = supabaseAdmin()
    if (action === 'request') return await handleRequest(supabase, exerciseName, key, tip)
    if (action === 'poll') return await handlePoll(supabase, key)
    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (err) {
    console.error('[generate-exercise-video] Unexpected error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected server error.' }, 500)
  }
})
