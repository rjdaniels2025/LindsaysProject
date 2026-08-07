import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Generation is submitted to OpenAI with background:true / store:true, so the
// job runs and the result is held on their side whether or not the member's
// browser is still open. Only collecting the result depended on the browser.
// This function records jobs and finishes them server-side.

const API_URL = Deno.env.get('PROGRAM_API_URL') || 'https://api.openai.com/v1/responses'
// The client gives up polling at 10 minutes; allow well past that before
// declaring a job dead, since the sweep runs about once a minute.
const MAX_ATTEMPTS = Number(Deno.env.get('PROGRAM_JOB_MAX_ATTEMPTS') || 25)
const SWEEP_BATCH = 20

function apiKey() {
  return Deno.env.get('PROGRAM_API_KEY') || Deno.env.get('OPENAI_API_KEY')
}

// Gate for the sweep endpoint. Kept in Vault rather than source or the cron
// definition, read through a service-role-only accessor like get_fal_key().
async function sweepSecret(supabase: SupabaseClient): Promise<string> {
  const envSecret = Deno.env.get('PROGRAM_SWEEP_SECRET')
  if (envSecret) return envSecret
  const { data } = await supabase.rpc('get_program_sweep_secret')
  return typeof data === 'string' ? data : ''
}

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase service role environment.')
  return createClient(url, serviceRoleKey)
}

// ── Ported verbatim from program-service so the text is byte-identical ────────

function extractText(payload: Record<string, any> | null) {
  if (payload?.output_text) return payload.output_text

  return payload?.output
    ?.flatMap((item: any) => item.content || [])
    .filter((content: any) => content.type === 'output_text' || content.type === 'text')
    .map((content: any) => content.text)
    .join('\n\n')
}

function sanitizeCopy(text: unknown) {
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

// ── Ported verbatim from src/utils/programSafety.js ───────────────────────────
// The injury audit must produce the same flags server-side as it does in the
// browser, or a program finished by the sweep would silently lose its warnings.

const RULES = [
  {
    limitation: /lower back|low back|\bback\b|herniat|disc|sciatic|lumbar/i,
    label: 'lower back',
    risky: /deadlift|good morning|barbell row|bent ?over row|back squat|barbell squat|sit ?up|russian twist|leg press|power clean|hyperextension/i,
    suggestion: 'try hip thrusts, goblet box squats, chest-supported rows, or glute bridges instead',
  },
  {
    limitation: /knee|acl|mcl|meniscus|patell/i,
    label: 'knee',
    risky: /deep squat|lunge|jump|box jump|leg extension|pistol|step ?up|burpee/i,
    suggestion: 'try box squats to a comfortable depth, leg press in a pain-free range, or glute bridges instead',
  },
  {
    limitation: /shoulder|rotator cuff|labrum|impingement/i,
    label: 'shoulder',
    risky: /overhead press|military press|behind (the )?neck|upright row|\bdips?\b|push press|snatch/i,
    suggestion: 'try neutral-grip dumbbell presses, landmine presses, or cable work in a pain-free range instead',
  },
  {
    limitation: /wrist|carpal/i,
    label: 'wrist',
    risky: /push ?up|front squat|barbell curl|clean/i,
    suggestion: 'use dumbbells, neutral grips, or push-up handles to keep the wrist neutral',
  },
  {
    limitation: /neck|cervical/i,
    label: 'neck',
    risky: /behind (the )?neck|upright row|barbell shrug|sit ?up/i,
    suggestion: 'use supported alternatives that do not load the neck',
  },
]

// Exercise lines come in several shapes depending on how the model wrote the
// program:
//   "Goblet Box Squat: Warmup: 25 lbs x 10, Sets: 4, Reps: 10 to 12, ..."
//   "1. High box squat to comfortable depth: Week 1, 4 sets of 10. ..."
//   "Superset A1 Dumbbell Squeeze Press: Warmup: none, Sets: 3, ..."
// This once required "Sets:" to follow the exercise name immediately, which
// matched none of them — so the audit silently never flagged anything for
// anybody. Identify the exercise the same way the dashboard does instead:
// a line carrying training detail, named by the text before its first colon.
const DETAIL_HINT = /\bsets?\b|\breps?\b|\brest\b|\btempo\b|\bcue\b|\brpe\b|\brir\b/i
const NOT_AN_EXERCISE = /^(workout|session|day|week|warm ?up|cool ?down|note|focus|rest|progression|goal|tip|meal|nutrition)\b/i

function exerciseNameFrom(line: string) {
  // Exercise lines always name the movement before a colon; prose guidance
  // ("Sets and reps stay the same for all 4 weeks.") does not.
  if (!line.includes(':')) return ''
  const stripped = line
    .replace(/^[,\s]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^superset\s*[A-Z]?\d?\s*[,:]?\s*/i, '')
    .trim()
  const name = stripped.split(':')[0]?.trim()
  if (!name || name.length < 3 || name.length > 60) return ''
  if (!/[A-Za-z]/.test(name)) return ''
  if (NOT_AN_EXERCISE.test(name)) return ''
  return name
}

// The program text has already been through sanitizeCopy, which turns every
// hyphen into ", " — so "Push-Up" arrives as "Push, Up" and a pattern like
// /push ?up/ would never match it. Match against a comma-flattened name.
function matchable(name: string) {
  return name.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
}

function auditProgram(text: string, limitations: unknown) {
  const lim = String(limitations || '').trim()
  if (!lim || /^(none|n\/?a|no|nope|n\/a)\b/i.test(lim)) return []

  const active = RULES.filter((rule) => rule.limitation.test(lim))
  if (!active.length) return []

  const flags: Array<{ exercise: string; limitation: string; suggestion: string }> = []
  const seen = new Set<string>()
  for (const rawLine of String(text || '').split('\n')) {
    const line = rawLine.trim()
    if (!DETAIL_HINT.test(line)) continue
    const name = exerciseNameFrom(line)
    if (!name) continue
    const testable = matchable(name)
    for (const rule of active) {
      if (rule.risky.test(testable)) {
        const key = `${name.toLowerCase()}|${rule.label}`
        if (seen.has(key)) continue
        seen.add(key)
        flags.push({ exercise: name, limitation: rule.label, suggestion: rule.suggestion })
      }
    }
  }
  return flags
}

// ── Job handling ──────────────────────────────────────────────────────────────

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

async function handleRegister(supabase: SupabaseClient, userId: string, body: Record<string, unknown>) {
  const jobId = String(body.jobId || '').trim()
  if (!jobId) return jsonResponse({ error: 'Missing job id.' }, 400)
  const blockNumber = Number(body.blockNumber) > 0 ? Number(body.blockNumber) : 1

  const { error } = await supabase
    .from('program_jobs')
    .upsert(
      { user_id: userId, openai_job_id: jobId, block_number: blockNumber, status: 'pending' },
      { onConflict: 'openai_job_id' },
    )
  if (error) throw error

  return jsonResponse({ registered: true })
}

// Writes the program only when one is not already saved. The browser writes the
// whole app_state, so this narrow, conditional update keeps a client that is
// still open from being clobbered — and makes the two a harmless race.
async function saveProgram(supabase: SupabaseClient, userId: string, text: string) {
  const { data: row } = await supabase
    .from('user_programs')
    .select('app_state')
    .eq('user_id', userId)
    .maybeSingle()

  const appState = (row?.app_state || {}) as Record<string, any>
  const messages = Array.isArray(appState.messages) ? appState.messages : []
  if (messages.some((m: any) => m?.meta?.type === 'program')) return 'already-present'

  const profile = appState.profile || appState.profileDraft || null
  const safetyFlags = auditProgram(text, profile?.limitations)

  const programMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: text,
    timestamp: new Date().toISOString(),
    meta: { type: 'program', safetyFlags },
  }

  const { error } = await supabase
    .from('user_programs')
    .update({ app_state: { ...appState, messages: [programMessage] } })
    .eq('user_id', userId)
  if (error) throw error

  return 'saved'
}

async function handleSweep(supabase: SupabaseClient) {
  const key = apiKey()
  if (!key) return jsonResponse({ error: 'Missing OpenAI API key.' }, 500)

  const { data: jobs, error } = await supabase
    .from('program_jobs')
    .select('id, user_id, openai_job_id, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(SWEEP_BATCH)
  if (error) throw error

  const summary = { checked: 0, saved: 0, failed: 0, pending: 0 }

  for (const job of jobs || []) {
    summary.checked++
    const attempts = (job.attempts || 0) + 1

    try {
      const response = await fetch(`${API_URL}/${job.openai_job_id}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${key}` },
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error?.message || `Poll failed with status ${response.status}.`
        // A job id OpenAI does not recognise will never succeed — stop retrying.
        const terminal = response.status === 404 || attempts >= MAX_ATTEMPTS
        await supabase
          .from('program_jobs')
          .update({ attempts, status: terminal ? 'failed' : 'pending', error: message })
          .eq('id', job.id)
        terminal ? summary.failed++ : summary.pending++
        continue
      }

      const status = String(payload?.status || 'in_progress')

      if (status === 'completed') {
        const text = extractText(payload)
        if (!text) {
          await supabase
            .from('program_jobs')
            .update({ attempts, status: 'failed', error: 'Generation returned empty output.' })
            .eq('id', job.id)
          summary.failed++
          continue
        }
        const result = await saveProgram(supabase, job.user_id, sanitizeCopy(text))
        await supabase
          .from('program_jobs')
          .update({ attempts, status: 'done', error: result === 'already-present' ? 'Client saved it first.' : null })
          .eq('id', job.id)
        summary.saved++
        continue
      }

      if (status === 'failed' || status === 'incomplete' || status === 'cancelled') {
        const message = payload?.error?.message || payload?.incomplete_details?.reason || `Generation ${status}.`
        await supabase
          .from('program_jobs')
          .update({ attempts, status: 'failed', error: message })
          .eq('id', job.id)
        summary.failed++
        continue
      }

      // queued / in_progress
      const giveUp = attempts >= MAX_ATTEMPTS
      await supabase
        .from('program_jobs')
        .update({
          attempts,
          status: giveUp ? 'failed' : 'pending',
          error: giveUp ? 'Generation did not finish in time.' : null,
        })
        .eq('id', job.id)
      giveUp ? summary.failed++ : summary.pending++
    } catch (err) {
      console.error('[program-jobs] job failed', job.openai_job_id, err)
      await supabase.from('program_jobs').update({ attempts }).eq('id', job.id)
      summary.pending++
    }
  }

  return jsonResponse(summary)
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
    const action = String(body.action || '')
    const supabase = supabaseAdmin()

    if (action === 'sweep') {
      const expected = await sweepSecret(supabase)
      if (!expected || typeof body.secret !== 'string' || body.secret !== expected) {
        return jsonResponse({ error: 'Not authorized.' }, 401)
      }
      return await handleSweep(supabase)
    }

    if (action === 'register') {
      const userId = authenticatedUserId(request)
      if (!userId) return jsonResponse({ error: 'Sign in first.' }, 401)
      return await handleRegister(supabase, userId, body)
    }

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (err) {
    console.error('[program-jobs]', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500)
  }
})
