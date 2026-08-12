import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { exerciseKey as normalizedKey } from '../_shared/exerciseKey.ts'

const BUCKET = 'exercise-videos'

function storagePath(key: string) {
  return `${key.replace(/\s+/g, '-')}.mp4`
}

// The coach passcode is also compiled into the client bundle (AdminPasscode.jsx),
// so this check is a guard against casual abuse of a public endpoint, not a
// secret. Set an ADMIN_PASSCODE function secret to override it independently.
const ADMIN_PASSCODE = Deno.env.get('ADMIN_PASSCODE') || 'ILoveJesus123!!'

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase service role environment.')
  return createClient(url, serviceRoleKey)
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

// Hands the browser a one-time signed URL so the video bytes go straight to
// Storage. Videos are far too large to route through a function request body.
async function handleUploadUrl(supabase: SupabaseClient, key: string) {
  await ensureBucket(supabase)
  const path = storagePath(key)

  // A signed upload URL refuses to overwrite, so clear any existing object
  // first — replacing a demo video is the common case here.
  await supabase.storage.from(BUCKET).remove([path])

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) throw new Error(error.message)

  return jsonResponse({ path: data.path, token: data.token, key })
}

// Called after the browser finishes the direct-to-Storage upload: points the
// cache row at the new file and marks it coach-uploaded.
async function handleFinalize(supabase: SupabaseClient, exerciseName: string, key: string) {
  const path = storagePath(key)
  const { data: fileList } = await supabase.storage
    .from(BUCKET)
    .list('', { search: path })
  if (!fileList?.some((f) => f.name === path)) {
    return jsonResponse({ error: 'The uploaded video was not found in storage.' }, 400)
  }

  // Cache-bust: the public URL is stable across replacements, so without this
  // the browser keeps showing the previous video.
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const versionedUrl = `${publicUrl}?v=${Date.now()}`

  const { data, error } = await supabase
    .from('exercise_videos')
    .upsert(
      {
        exercise_key: key,
        exercise_name: exerciseName,
        status: 'ready',
        source: 'manual',
        video_url: versionedUrl,
        error: null,
        fal_model_id: null,
        fal_request_id: null,
        fal_status_url: null,
        fal_response_url: null,
        generation_prompt: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'exercise_key' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)

  return jsonResponse({ video: data })
}

// Points an already-uploaded video at a different exercise. Needed because a
// video whose name never matched any program is invisible to everyone, and the
// difference is often one only the coach can settle — "Cable Kickbacks" could
// be the glute one or the triceps one, and guessing wrong would show a client
// the wrong movement. The stored video_url is absolute, so the file stays where
// it is and only the row's identity changes.
async function handleRelink(supabase: SupabaseClient, fromKey: string, exerciseName: string, toKey: string) {
  const { data: existing } = await supabase
    .from('exercise_videos')
    .select('exercise_key, source')
    .eq('exercise_key', toKey)
    .maybeSingle()

  if (existing && existing.exercise_key !== fromKey) {
    if (existing.source === 'manual') {
      return jsonResponse(
        { error: `“${exerciseName}” already has one of your videos. Remove that one first.` },
        409,
      )
    }
    // Only an AI row is in the way, and a coach video supersedes it.
    await supabase.from('exercise_videos').delete().eq('exercise_key', toKey)
  }

  const { data, error } = await supabase
    .from('exercise_videos')
    .update({ exercise_key: toKey, exercise_name: exerciseName, updated_at: new Date().toISOString() })
    .eq('exercise_key', fromKey)
    .select()
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return jsonResponse({ error: 'That video no longer exists.' }, 404)

  return jsonResponse({ video: data })
}

// Removes the cached video entirely. The next member to open that exercise
// triggers a fresh AI generation, so this doubles as "revert to AI".
async function handleDelete(supabase: SupabaseClient, key: string) {
  await supabase.storage
    .from(BUCKET)
    .remove([storagePath(key), `${key.replace(/\s+/g, '-')}-start.png`])

  const { error } = await supabase.from('exercise_videos').delete().eq('exercise_key', key)
  if (error) throw new Error(error.message)

  return jsonResponse({ success: true })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const body = await request.json().catch(() => ({}))

    if (typeof body.passcode !== 'string' || body.passcode !== ADMIN_PASSCODE) {
      return jsonResponse({ error: 'Not authorized.' }, 401)
    }

    const action = String(body.action || '')
    const supabase = supabaseAdmin()

    if (action === 'delete') {
      const key = normalizedKey(String(body.exerciseKey || body.exerciseName || ''))
      if (!key) return jsonResponse({ error: 'Missing exercise.' }, 400)
      return await handleDelete(supabase, key)
    }

    const exerciseName = String(body.exerciseName || '').trim().slice(0, 120)
    if (!exerciseName) return jsonResponse({ error: 'Please enter an exercise name.' }, 400)
    const key = normalizedKey(exerciseName)
    if (!key) return jsonResponse({ error: 'That exercise name is not usable.' }, 400)

    if (action === 'relink') {
      const fromKey = normalizedKey(String(body.fromKey || ''))
      if (!fromKey) return jsonResponse({ error: 'Missing the video to relink.' }, 400)
      if (fromKey === key) return jsonResponse({ error: 'That video is already on this exercise.' }, 400)
      return await handleRelink(supabase, fromKey, exerciseName, key)
    }

    if (action === 'upload-url') return await handleUploadUrl(supabase, key)
    if (action === 'finalize') return await handleFinalize(supabase, exerciseName, key)

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (err) {
    console.error('[manage-exercise-video]', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500)
  }
})
