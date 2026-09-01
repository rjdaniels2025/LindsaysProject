import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  Users, UserCheck, CalendarDays,
  RefreshCw, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, Search, X,
  Upload, Trash2, Video, Sparkles, AlertTriangle, Link as LinkIcon,
} from 'lucide-react'
import AdminClientDetail from './AdminClientDetail.jsx'
import { ADMIN_PASSCODE } from './AdminPasscode.jsx'
import { membershipAccess } from '../lib/membership.js'

function isActive(status) {
  return status === 'active' || status === 'trialing'
}

function hasProgram(appState) {
  return Array.isArray(appState?.messages) &&
    appState.messages.some((m) => m?.meta?.type === 'program')
}

function monthProgress(programCreatedAt, programEndsAt) {
  if (!programCreatedAt || !programEndsAt) return null
  const start = new Date(programCreatedAt).getTime()
  const end = new Date(programEndsAt).getTime()
  const now = Date.now()
  const totalMonths = 6
  const elapsed = Math.max(0, now - start)
  const totalMs = end - start
  const monthsIn = Math.min(totalMonths, Math.floor((elapsed / totalMs) * totalMonths))
  const pct = Math.min(100, Math.round((elapsed / totalMs) * 100))
  return { monthsIn, totalMonths, pct, done: now >= end }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }) {
  if (isActive(status)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
        <CheckCircle2 size={11} /> {status === 'trialing' ? 'Trialing' : 'Active'}
      </span>
    )
  }
  if (status === 'canceled' || status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        <XCircle size={11} /> {status ?? 'No plan'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
      <AlertCircle size={11} /> {status ?? 'No plan'}
    </span>
  )
}

function PlanBadge({ planId, billing }) {
  if (!planId) return <span className="text-xs text-body">—</span>
  const label = planId.charAt(0).toUpperCase() + planId.slice(1)
  const billingLabel = billing === 'annual' ? 'Annual' : 'Monthly'
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
      {label} · {billingLabel}
    </span>
  )
}

function ProgressBar({ pct }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ClientCard({ client, onView }) {
  const [expanded, setExpanded] = useState(false)
  const progress = monthProgress(
    client.app_state?.programCreatedAt,
    client.app_state?.programEndsAt,
  )
  const profile = client.app_state?.profile || client.app_state?.profileDraft
  const generated = hasProgram(client.app_state)
  const stage = client.app_state?.stage

  return (
    <div className="rounded-lg border border-line bg-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-heading text-2xl uppercase leading-none text-white">
              {client.display_name || 'Unknown Client'}
            </p>
            <p className="mt-1 text-xs text-body">Joined {formatDate(client.program_created_at)}</p>
            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                className="mt-1 block truncate text-xs text-accent transition hover:underline"
              >
                {client.email}
              </a>
            ) : null}
            {profile?.phone ? (
              <a
                href={`tel:${profile.phone}`}
                className="mt-1 block truncate text-xs text-accent transition hover:underline"
              >
                {profile.phone}
              </a>
            ) : null}
          </div>
          <StatusBadge status={client.membership_status} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <PlanBadge planId={client.plan_id} billing={client.billing} />
          {generated ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
              <CheckCircle2 size={11} /> Program generated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-line px-2.5 py-0.5 text-xs font-medium text-body">
              <Clock size={11} /> No program yet
            </span>
          )}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-body">
              <span>Month {progress.monthsIn} of {progress.totalMonths}</span>
              <span>{progress.done ? 'Complete' : `${progress.pct}%`}</span>
            </div>
            <ProgressBar pct={progress.pct} />
            <p className="mt-1 text-xs text-body">
              {progress.done ? 'Program ended' : `Ends ${formatDate(client.app_state?.programEndsAt)}`}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-body transition hover:text-accent"
          >
            {expanded ? <><ChevronUp size={13} /> Less detail</> : <><ChevronDown size={13} /> More detail</>}
          </button>
          <button
            type="button"
            onClick={() => onView(client)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium uppercase text-accent transition hover:bg-accent/20"
          >
            <FileText size={13} /> View Plan &amp; Progress
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line px-4 py-4 sm:px-5 space-y-3">
          {profile ? (
            <>
              {profile.goals && (
                <Detail label="Goals" value={Array.isArray(profile.goals) ? profile.goals.join(', ') : profile.goals} />
              )}
              {profile.fitnessLevel && <Detail label="Fitness Level" value={profile.fitnessLevel} />}
              {profile.equipment && <Detail label="Equipment" value={Array.isArray(profile.equipment) ? profile.equipment.join(', ') : profile.equipment} />}
              {profile.workoutsPerWeek && <Detail label="Workouts / Week" value={profile.workoutsPerWeek} />}
              {profile.injuries && profile.injuries !== 'none' && (
                <Detail label="Injuries / Notes" value={profile.injuries} />
              )}
            </>
          ) : (
            <p className="text-xs text-body">No profile info — assessment not completed.</p>
          )}
          <Detail label="App Stage" value={stage || '—'} />
          {client.current_period_end && (
            <Detail label="Membership Renews" value={formatDate(client.current_period_end)} />
          )}
          <Detail label="Last Active" value={formatDate(client.program_updated_at)} />
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase text-body/60 tracking-wider">{label}</span>
      <p className="mt-0.5 text-sm text-white capitalize">{value}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-body">{label}</p>
          <p className="font-heading text-3xl leading-none text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// Someone who paid (or started a trial) but has no program is owed the thing
// they signed up for — generation is browser-driven, so an interrupted attempt
// leaves them with nothing and no prompt to come back.
function needsProgram(client) {
  return isActive(client.membership_status) && !hasProgram(client.app_state)
}

// Finished the assessment but never subscribed — a warm lead sitting at the
// checkout, invisible among everyone else in the client list.
function neverSubscribed(client) {
  return !client.membership_status && !hasProgram(client.app_state)
}

function profileSummary(appState) {
  const p = appState?.profile || appState?.profileDraft
  if (!p) return []
  const goals = Array.isArray(p.primaryGoal) ? p.primaryGoal : p.primaryGoal ? [p.primaryGoal] : []
  return [
    p.age && p.gender ? `${p.age}, ${p.gender}` : p.age || p.gender,
    p.weightLbs ? `${p.weightLbs} lbs` : null,
    p.experience,
    p.daysPerWeek ? `${p.daysPerWeek} days/week` : null,
    Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment,
    goals.length ? goals.slice(0, 3).join(', ') : null,
    p.limitations ? `Limitations: ${p.limitations}` : null,
  ].filter(Boolean)
}

function FollowUpCard({ client, tone, reason }) {
  const urgent = tone === 'urgent'
  const followUpPhone = client.app_state?.profile?.phone || client.app_state?.profileDraft?.phone
  return (
    <div className={`rounded-lg border bg-card p-4 sm:p-5 ${urgent ? 'border-red-500/40' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-2xl uppercase leading-none text-white">
            {client.display_name || 'Unknown'}
          </p>
          <p className="mt-1 text-xs text-body">Joined {formatDate(client.program_created_at)}</p>
        </div>
        <StatusBadge status={client.membership_status} />
      </div>

      <p
        className={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 ${
          urgent ? 'bg-red-500/10 text-red-300' : 'bg-accent/10 text-accent'
        }`}
      >
        {reason}
      </p>

      {client.email ? (
        <a
          href={`mailto:${client.email}`}
          className="mt-3 block truncate text-sm text-accent transition hover:underline"
        >
          {client.email}
        </a>
      ) : (
        <p className="mt-3 text-sm text-body">No email on file</p>
      )}

      {followUpPhone ? (
        <a
          href={`tel:${followUpPhone}`}
          className="mt-1 block truncate text-sm text-accent transition hover:underline"
        >
          {followUpPhone}
        </a>
      ) : null}

      <ul className="mt-3 grid gap-1 text-xs leading-5 text-body">
        {profileSummary(client.app_state).map((item) => (
          <li key={item} className="truncate">{item}</li>
        ))}
      </ul>
    </div>
  )
}

const APPLICATION_STATUSES = ['new', 'contacted', 'enrolled', 'declined']

// Live account state for an application, derived with the same rule the app
// itself uses so the dashboard and the member's access never disagree.
function TrialBadge({ application }) {
  const access = membershipAccess({
    status: application.membership_status,
    current_period_end: application.trial_ends_at,
  })

  if (!application.membership_status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-line px-2.5 py-0.5 text-xs font-medium text-body">
        <Clock size={11} /> No account yet
      </span>
    )
  }
  if (application.membership_status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
        <CheckCircle2 size={11} /> Paid member
      </span>
    )
  }
  if (access.trialing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
        <CheckCircle2 size={11} /> Trial · {access.daysLeft} {access.daysLeft === 1 ? 'day' : 'days'} left
      </span>
    )
  }
  if (access.expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        <XCircle size={11} /> Trial ended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
      <AlertCircle size={11} /> {application.membership_status}
    </span>
  )
}

function ApplicationCard({ application, onStatusChange }) {
  const [saving, setSaving] = useState(false)

  async function changeStatus(status) {
    setSaving(true)
    const { error } = await supabase.rpc('set_trial_application_status', {
      p_id: application.id,
      p_status: status,
    })
    setSaving(false)
    if (!error) onStatusChange(application.id, status)
  }

  return (
    <div className="rounded-lg border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-2xl uppercase leading-none text-white">{application.name}</p>
          <p className="mt-1 text-xs text-body">Signed up {formatDate(application.created_at)}</p>
          <div className="mt-2"><TrialBadge application={application} /></div>
        </div>
        <select
          value={application.status}
          disabled={saving}
          onChange={(e) => changeStatus(e.target.value)}
          className="rounded-lg border border-line bg-[#111] px-2 py-1 text-xs uppercase text-white outline-none transition focus:border-accent disabled:opacity-50"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-1.5 text-sm">
        <a href={`mailto:${application.email}`} className="text-accent transition hover:underline">{application.email}</a>
        {application.phone && (
          <a href={`tel:${application.phone}`} className="text-white transition hover:text-accent">{application.phone}</a>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        {application.fitness_goal && (
          <p className="text-body"><span className="font-heading uppercase text-white">Goal: </span>{application.fitness_goal}</p>
        )}
        {application.biggest_challenge && (
          <p className="text-body"><span className="font-heading uppercase text-white">Challenge: </span>{application.biggest_challenge}</p>
        )}
        <p className="text-body">
          <span className="font-heading uppercase text-white">Tracked macros: </span>
          {application.tracked_macros === null ? '—' : application.tracked_macros ? 'Yes' : 'No'}
        </p>
      </div>
    </div>
  )
}

// Supabase's free plan caps a single file at 50MB. Anything larger is rejected
// before it reaches storage, and that rejection carries no CORS headers, so the
// browser only reports "Failed to fetch". Enforcing the real ceiling here means
// an impossible upload is refused instantly with a message that says why.
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

function formatMb(bytes) {
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

// Uploads the file straight to Storage using a one-time signed URL. The bytes
// never pass through an edge function, which could not carry a video this size.
async function uploadExerciseVideo(exerciseName, file) {
  if (!file.type.startsWith('video/')) throw new Error('Please choose a video file.')
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `That video is ${formatMb(file.size)} and the limit is ${formatMb(MAX_VIDEO_BYTES)}. ` +
      'Record or export it at 720p and keep the clip to about 15 to 20 seconds, which usually lands well under 20MB.',
    )
  }

  const signed = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'upload-url', exerciseName, passcode: ADMIN_PASSCODE },
  })
  if (signed.error || signed.data?.error) throw new Error(signed.data?.error || 'Could not start the upload.')

  // A network-level failure can come back either as a returned error or as a
  // thrown TypeError. Handle both, and say what was being sent — so if this
  // ever fails again the message carries the facts instead of "Failed to fetch".
  const uploadError = await supabase.storage
    .from('exercise-videos')
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type })
    .then((result) => result.error)
    .catch((err) => err)

  if (uploadError) {
    const detail = uploadError.message || String(uploadError)
    throw new Error(
      `Upload failed for a ${formatMb(file.size)} ${file.type || 'video'} file: ${detail}`,
    )
  }

  const finalized = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'finalize', exerciseName, passcode: ADMIN_PASSCODE },
  })
  if (finalized.error || finalized.data?.error) throw new Error(finalized.data?.error || 'Could not save the video.')
}

async function deleteExerciseVideo(exerciseKey) {
  const res = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'delete', exerciseKey, passcode: ADMIN_PASSCODE },
  })
  if (res.error || res.data?.error) throw new Error(res.data?.error || 'Could not remove the video.')
}

// Moves an existing video onto a different exercise, for the uploads whose name
// never matched anything a client actually has.
async function relinkExerciseVideo(fromKey, exerciseName) {
  const res = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'relink', fromKey, exerciseName, passcode: ADMIN_PASSCODE },
  })
  if (res.error || res.data?.error) throw new Error(res.data?.error || 'Could not relink the video.')
}

// Adds another exercise the same video demonstrates, so one recording covers
// every way the programs happen to name that movement.
async function linkExerciseVideo(fromKey, exerciseName) {
  const res = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'link', fromKey, exerciseName, passcode: ADMIN_PASSCODE },
  })
  if (res.error || res.data?.error) throw new Error(res.data?.error || 'Could not add that exercise.')
}

async function unlinkExerciseVideo(exerciseKey) {
  const res = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'unlink', exerciseKey, passcode: ADMIN_PASSCODE },
  })
  if (res.error || res.data?.error) throw new Error(res.data?.error || 'Could not remove that exercise.')
}

// Mirrors supabase/functions/_shared/exerciseKey.ts. Kept in step so the form
// can tell her whether a name will connect BEFORE she spends an upload on it —
// the server is still the authority, this only previews the answer.
const SPELLING_ALIASES = {
  dumbell: 'dumbbell',
  dumbells: 'dumbbell',
  dumbbells: 'dumbbell',
  barbells: 'barbell',
  bicep: 'biceps',
  tricep: 'triceps',
}
const NOT_PLURAL = new Set([
  'press', 'cross', 'triceps', 'biceps', 'abs', 'lats',
  'glutes', 'calves', 'hamstrings', 'quads', 'plus',
])

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

// Ranks program exercises by how many of the typed name's words they share, so
// an unmatched video can offer real candidates instead of a blank shrug. Used
// only to suggest — the coach picks, nothing is auto-applied, because a close
// name can still be the wrong movement ("Cable Kickbacks" fits both the glute
// and the triceps version).
function suggestExercises(name, programExercises, limit = 4) {
  const wanted = exerciseKeyOf(name).split(' ').filter(Boolean)
  if (!wanted.length) return []
  return programExercises
    .map((ex) => {
      const tokens = ex.exercise_key.split(' ')
      const shared = wanted.filter((w) => tokens.some((t) => t === w || t.startsWith(w) || w.startsWith(t))).length
      return { ...ex, shared, score: shared / Math.max(wanted.length, tokens.length) }
    })
    .filter((ex) => ex.shared >= 2 || (ex.shared === 1 && wanted.length === 1))
    .sort((a, b) => b.score - a.score || b.client_count - a.client_count)
    .slice(0, limit)
}

function VideoSourceBadge({ source, status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
        <Clock size={11} /> Generating
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        <XCircle size={11} /> AI failed
      </span>
    )
  }
  if (source === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
        <Video size={11} /> Your video
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-line px-2.5 py-0.5 text-xs font-medium text-body">
      <Sparkles size={11} /> AI generated
    </span>
  )
}

// The same movement is written several ways across programs — "Seated leg curl"
// for one client and "Seated hamstring curl" for another. Rather than ask her to
// film the same machine twice, one video can answer to several names. Which
// names mean the same movement is her call: the candidate list happily offers
// both "Cable Glute Kickback" and "Cable Triceps Kickback", and only she knows
// which one she filmed.
function CoveredExercises({ links, options, open, setOpen, query, setQuery, onAdd, onRemove, busy }) {
  return (
    <div className="mt-1.5">
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <span
              key={link.exercise_key}
              className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/5 py-0.5 pl-2.5 pr-1 text-xs text-accent"
            >
              {link.exercise_name}
              <span className="text-body">· {link.client_count}</span>
              <button
                type="button"
                onClick={() => onRemove(link.exercise_key)}
                disabled={!!busy}
                title={`Stop showing this video on ${link.exercise_name}`}
                className="grid h-4 w-4 place-items-center rounded-full text-body transition hover:text-red-400 disabled:opacity-50"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!!busy}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs uppercase text-body transition hover:text-accent disabled:opacity-50"
        >
          <LinkIcon size={11} />
          {busy || 'Also covers…'}
        </button>
      ) : (
        <div className="mt-1.5 rounded-lg border border-line p-2.5">
          <p className="text-xs leading-5 text-body">
            Other exercises this same video demonstrates. Only pick names that are genuinely the
            same movement.
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your clients' exercises…"
            className="mt-1.5 w-full rounded-lg border border-line bg-[#111] px-2.5 py-1.5 text-xs text-white placeholder:text-body/50 outline-none focus:border-accent"
          />
          <div className="mt-1.5 flex flex-col gap-1">
            {options.length === 0 ? (
              <p className="text-xs text-body">Nothing else to add.</p>
            ) : (
              options.map((ex) => (
                <button
                  key={ex.exercise_key}
                  type="button"
                  onClick={() => onAdd(ex.exercise_name)}
                  disabled={!!busy}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-left text-xs text-white transition hover:border-accent disabled:opacity-50"
                >
                  {ex.exercise_name}
                  <span className="ml-1.5 text-body">
                    · {ex.client_count} {ex.client_count === 1 ? 'client' : 'clients'}
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); setQuery('') }}
            className="mt-1.5 text-xs uppercase text-body transition hover:text-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function VideoCard({ video, onChanged, programExercises = [], match = null, links = [], takenKeys = new Set() }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [relinking, setRelinking] = useState(false)
  const [relinkQuery, setRelinkQuery] = useState('')
  const [covering, setCovering] = useState(false)
  const [coverQuery, setCoverQuery] = useState('')

  const isManual = video.source === 'manual'
  // Reached-by count across this video's own exercise and every extra name it
  // covers, so the payoff of adding one is visible on the card.
  const reach = (match?.client_count || 0) + links.reduce((sum, l) => sum + l.client_count, 0)

  const suggestions = useMemo(
    () => (match ? [] : suggestExercises(video.exercise_name, programExercises)),
    [match, video.exercise_name, programExercises],
  )
  const relinkOptions = useMemo(() => {
    const typed = relinkQuery.trim().toLowerCase()
    if (!typed) return suggestions
    return programExercises
      .filter((ex) => ex.exercise_name.toLowerCase().includes(typed))
      .slice(0, 6)
  }, [relinkQuery, suggestions, programExercises])

  // Candidates for "also covers": exclude this video's own exercise and any
  // name already spoken for, so she is never offered a choice that will 409.
  const coverOptions = useMemo(() => {
    const typed = coverQuery.trim().toLowerCase()
    const pool = typed
      ? programExercises.filter((ex) => ex.exercise_name.toLowerCase().includes(typed))
      : suggestExercises(video.exercise_name, programExercises, 8)
    return pool
      .filter((ex) => ex.exercise_key !== video.exercise_key && !takenKeys.has(ex.exercise_key))
      .slice(0, 8)
  }, [coverQuery, video.exercise_name, video.exercise_key, programExercises, takenKeys])

  async function run(label, action) {
    setError('')
    setBusy(label)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function relink(exerciseName) {
    await run('Connecting…', async () => {
      await relinkExerciseVideo(video.exercise_key, exerciseName)
      setRelinking(false)
      setRelinkQuery('')
    })
  }

  async function addCover(exerciseName) {
    await run('Adding…', () => linkExerciseVideo(video.exercise_key, exerciseName))
  }

  async function removeCover(exerciseKey) {
    await run('Removing…', () => unlinkExerciseVideo(exerciseKey))
  }

  async function replace(file) {
    if (!file) return
    setError('')
    setBusy('Uploading…')
    try {
      await uploadExerciseVideo(video.exercise_name, file)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function remove() {
    setError('')
    setBusy('Removing…')
    try {
      await deleteExerciseVideo(video.exercise_key)
      await onChanged()
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  return (
    <div className="rounded-lg border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-heading text-xl uppercase leading-tight text-white">
          {video.exercise_name}
        </p>
        <VideoSourceBadge source={video.source} status={video.status} />
      </div>

      {video.status === 'ready' && video.video_url ? (
        <video
          key={video.video_url}
          src={video.video_url}
          controls
          preload="metadata"
          playsInline
          className="mt-3 aspect-[9/16] max-h-64 w-full rounded-lg bg-black object-contain"
        />
      ) : (
        <div className="mt-3 grid h-24 place-items-center rounded-lg border border-dashed border-line text-xs text-body">
          {video.status === 'pending' ? 'AI video in progress…' : 'No video available'}
        </div>
      )}

      {/* Whether this video actually reaches anyone. Uploads used to fail this
          silently: the name had to match a client's program exactly and there
          was nothing anywhere that said whether it did. */}
      {match ? (
        <div className="mt-2">
          <p className="inline-flex items-center gap-1.5 text-xs text-accent">
            <CheckCircle2 size={12} />
            Showing on {match.exercise_name} · reaching {reach}{' '}
            {reach === 1 ? 'client' : 'clients'}
          </p>
          {isManual && <CoveredExercises
            links={links}
            options={coverOptions}
            open={covering}
            setOpen={setCovering}
            query={coverQuery}
            setQuery={setCoverQuery}
            onAdd={addCover}
            onRemove={removeCover}
            busy={busy}
          />}
        </div>
      ) : isManual ? (
        <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400">
            <AlertTriangle size={12} />
            Not connected — no client sees this
          </p>
          {!relinking ? (
            <>
              {suggestions.length > 0 && (
                <p className="mt-1 text-xs leading-5 text-body">
                  Closest matches: {suggestions.map((s) => s.exercise_name).join(', ')}
                </p>
              )}
              <button
                type="button"
                onClick={() => setRelinking(true)}
                disabled={!!busy}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/40 px-2.5 py-1 text-xs font-medium uppercase text-yellow-400 transition hover:bg-yellow-500/10 disabled:opacity-50"
              >
                <LinkIcon size={12} />
                {busy || 'Connect to an exercise'}
              </button>
            </>
          ) : (
            <div className="mt-2">
              <input
                type="text"
                value={relinkQuery}
                onChange={(e) => setRelinkQuery(e.target.value)}
                placeholder="Search your clients' exercises…"
                className="w-full rounded-lg border border-line bg-[#111] px-2.5 py-1.5 text-xs text-white placeholder:text-body/50 outline-none focus:border-accent"
              />
              <div className="mt-1.5 flex flex-col gap-1">
                {relinkOptions.length === 0 ? (
                  <p className="text-xs text-body">No exercise matches that.</p>
                ) : (
                  relinkOptions.map((ex) => (
                    <button
                      key={ex.exercise_key}
                      type="button"
                      onClick={() => relink(ex.exercise_name)}
                      disabled={!!busy}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-left text-xs text-white transition hover:border-accent disabled:opacity-50"
                    >
                      {ex.exercise_name}
                      <span className="ml-1.5 text-body">
                        · {ex.client_count} {ex.client_count === 1 ? 'client' : 'clients'}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => { setRelinking(false); setRelinkQuery('') }}
                className="mt-1.5 text-xs uppercase text-body transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}

      <p className="mt-2 text-xs text-body">Updated {formatDate(video.updated_at)}</p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <label className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium uppercase text-accent transition hover:bg-accent/20 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload size={13} />
          {busy || (video.source === 'manual' ? 'Replace' : 'Upload yours')}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={!!busy}
            onChange={(e) => replace(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          onClick={remove}
          disabled={!!busy}
          title={video.source === 'manual' ? 'Remove and go back to the AI video' : 'Delete so it regenerates'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-body transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function NewVideoUpload({ onChanged, programExercises = [] }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const typed = name.trim()
  // Does this name resolve to an exercise a client actually has? Answered as
  // she types, because the alternative — finding out never — is what left ten
  // of her first twelve uploads invisible.
  const exactMatch = useMemo(() => {
    if (!typed) return null
    const key = exerciseKeyOf(typed)
    return programExercises.find((ex) => ex.exercise_key === key) || null
  }, [typed, programExercises])

  const options = useMemo(() => {
    if (!typed || exactMatch) return []
    const lower = typed.toLowerCase()
    const contains = programExercises.filter((ex) => ex.exercise_name.toLowerCase().includes(lower))
    return (contains.length ? contains : suggestExercises(typed, programExercises, 6)).slice(0, 6)
  }, [typed, exactMatch, programExercises])

  async function upload(file) {
    if (!file) return
    if (!name.trim()) {
      setError('Enter the exercise name first.')
      return
    }
    setError('')
    setDone('')
    setBusy(true)
    try {
      await uploadExerciseVideo(name.trim(), file)
      setDone(`Saved for “${name.trim()}”.`)
      setName('')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-line bg-card p-4 sm:p-5">
      <h3 className="font-heading text-xl uppercase text-white">Upload a video for an exercise</h3>
      <p className="mt-1 text-xs leading-5 text-body">
        Start typing and pick the exercise from your clients&apos; programs — that guarantees the
        video reaches them. MP4 plays everywhere; a .MOV from an iPhone may not play for every
        client.
      </p>
      <p className="mt-2 text-xs leading-5 text-body">
        <span className="text-white">Max 50MB.</span> A 15 to 20 second clip recorded at 720p is
        normally under 20MB. Longer or 4K footage will be too big — trim it or drop the resolution
        before uploading.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="e.g. Dumbbell Lateral Raise"
          className="w-full rounded-lg border border-line bg-[#111] px-3 py-2 text-sm text-white placeholder:text-body/50 outline-none transition focus:border-accent"
        />
        <label className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-heading text-base uppercase text-black transition hover:bg-white ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload size={15} />
          {busy ? 'Uploading…' : 'Choose video'}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {typed && (
        exactMatch ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent">
            <CheckCircle2 size={12} />
            Matches {exactMatch.exercise_name} — {exactMatch.client_count}{' '}
            {exactMatch.client_count === 1 ? 'client has' : 'clients have'} this exercise.
          </p>
        ) : (
          <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400">
              <AlertTriangle size={12} />
              No client&apos;s program uses this name yet
            </p>
            <p className="mt-1 text-xs leading-5 text-body">
              You can still upload it, but it won&apos;t appear for anyone until an exercise with
              this name shows up in a program.
            </p>
            {options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {options.map((ex) => (
                  <button
                    key={ex.exercise_key}
                    type="button"
                    onClick={() => { setName(ex.exercise_name); setError('') }}
                    className="rounded-full border border-line px-2.5 py-1 text-xs text-white transition hover:border-accent"
                  >
                    {ex.exercise_name}
                    <span className="ml-1 text-body">· {ex.client_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {done && <p className="mt-2 text-xs text-accent">{done}</p>}
    </div>
  )
}

export default function AdminDashboard({ onBack }) {
  const [clients, setClients] = useState([])
  const [applications, setApplications] = useState([])
  const [videos, setVideos] = useState([])
  // Every exercise that actually appears in a client's program. A video only
  // reaches a member if its name resolves to one of these.
  const [programExercises, setProgramExercises] = useState([])
  // Extra exercise names each video also demonstrates.
  const [videoLinks, setVideoLinks] = useState([])
  const [view, setView] = useState('clients')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  async function loadData(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError('')

    const [clientsRes, appsRes, videosRes, exercisesRes, linksRes] = await Promise.all([
      supabase.rpc('get_admin_dashboard'),
      supabase.rpc('get_trial_applications'),
      supabase.rpc('list_exercise_videos'),
      supabase.rpc('list_program_exercises'),
      supabase.rpc('list_exercise_video_links'),
    ])

    if (clientsRes.error) {
      setError(clientsRes.error.message)
    } else {
      setClients(clientsRes.data || [])
    }
    if (!appsRes.error) {
      setApplications(appsRes.data || [])
    }
    if (!videosRes.error) {
      setVideos(videosRes.data || [])
    }
    if (!exercisesRes.error) {
      setProgramExercises(exercisesRes.data || [])
    }
    if (!linksRes.error) {
      setVideoLinks(linksRes.data || [])
    }

    isRefresh ? setRefreshing(false) : setLoading(false)
  }

  async function reloadVideos() {
    const [videosRes, linksRes] = await Promise.all([
      supabase.rpc('list_exercise_videos'),
      supabase.rpc('list_exercise_video_links'),
    ])
    if (!videosRes.error) setVideos(videosRes.data || [])
    if (!linksRes.error) setVideoLinks(linksRes.data || [])
  }

  function updateApplicationStatus(id, status) {
    setApplications((current) => current.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  useEffect(() => { loadData() }, [])

  const exerciseByKey = useMemo(
    () => new Map(programExercises.map((ex) => [ex.exercise_key, ex])),
    [programExercises],
  )
  // The extra exercises each video covers, resolved to the program entry so the
  // card can show who actually gets it.
  const linksByVideo = useMemo(() => {
    const map = new Map()
    for (const link of videoLinks) {
      const ex = exerciseByKey.get(link.exercise_key)
      const list = map.get(link.video_id) || []
      list.push({
        exercise_key: link.exercise_key,
        exercise_name: ex?.exercise_name || link.exercise_name,
        client_count: ex?.client_count || 0,
      })
      map.set(link.video_id, list)
    }
    return map
  }, [videoLinks, exerciseByKey])

  // A video reaches someone if its own name matches a program exercise or any
  // of the extra names it covers does.
  const linkedKeys = useMemo(() => new Set(videoLinks.map((l) => l.exercise_key)), [videoLinks])

  // Only the coach's own uploads are worth chasing. An AI row that matches
  // nothing is just a stale cache entry, not work she needs to do.
  const unconnectedCount = videos.filter(
    (v) => v.source === 'manual' &&
      !exerciseByKey.has(v.exercise_key) &&
      !(linksByVideo.get(v.id) || []).some((l) => l.client_count > 0),
  ).length

  const totalClients = clients.length
  const activeCount = clients.filter((c) => isActive(c.membership_status)).length
  const newThisMonth = clients.filter((c) => {
    if (!c.program_created_at) return false
    const d = new Date(c.program_created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const stuckMembers = clients.filter(needsProgram)
  const unconvertedLeads = clients.filter(neverSubscribed)
  const followUpCount = stuckMembers.length + unconvertedLeads.length

  const activeTrials = applications.filter(
    (a) => membershipAccess({ status: a.membership_status, current_period_end: a.trial_ends_at }).trialing,
  ).length

  const query = searchQuery.trim().toLowerCase()
  const filteredClients = query
    ? clients.filter((c) => {
        const name = (c.display_name || c.app_state?.profile?.name || '').toLowerCase()
        const plan = (c.plan_id || '').toLowerCase()
        const email = (c.email || '').toLowerCase()
        return name.includes(query) || plan.includes(query) || email.includes(query)
      })
    : clients

  if (selectedClient) {
    return <AdminClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
  }

  return (
    <main className="min-h-screen bg-bg text-body">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-sm uppercase text-accent">Elevate Health &amp; Fitness</p>
            <h1 className="font-heading text-3xl uppercase leading-none text-white sm:text-4xl">Coach Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-card transition hover:border-accent disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-heading text-base uppercase text-white transition hover:border-accent"
            >
              <ArrowLeft size={15} />
              Exit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8">
          <StatCard icon={Users} label="Total Clients" value={totalClients} />
          <StatCard icon={UserCheck} label="Active Members" value={activeCount} sub={`${totalClients - activeCount} inactive`} />
          <StatCard icon={CalendarDays} label="New This Month" value={newThisMonth} />
          <StatCard icon={FileText} label="Active Trials" value={activeTrials} sub={`${applications.length} signups total`} />
        </div>

        {/* Clients / Applications tabs */}
        <div className="mb-6 inline-flex rounded-lg border border-line bg-card p-1">
          {[
            { id: 'clients', label: 'Clients', count: clients.length },
            { id: 'applications', label: 'Applications', count: applications.length },
            { id: 'followup', label: 'Follow Up', count: followUpCount },
            { id: 'videos', label: 'Videos', count: videos.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`rounded-md px-4 py-2 font-heading text-base uppercase transition ${
                view === tab.id ? 'bg-accent text-black' : 'text-body hover:text-white'
              }`}
            >
              {tab.label} <span className="opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {view === 'clients' && (
        <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-2xl uppercase text-white">
            All Clients
            <span className="ml-2 font-heading text-lg text-body">({filteredClients.length})</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name, email or plan..."
              className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-9 text-sm text-white placeholder:text-body/50 outline-none transition focus:border-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body transition hover:text-white"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 rounded-lg border border-line bg-card animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
            No clients yet.
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
            No clients match &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <ClientCard key={client.user_id} client={client} onView={setSelectedClient} />
            ))}
          </div>
        )}
        </>
        )}

        {view === 'applications' && (
          loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 rounded-lg border border-line bg-card animate-pulse" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
              No trial applications yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onStatusChange={updateApplicationStatus}
                />
              ))}
            </div>
          )
        )}

        {view === 'followup' && (
          loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 rounded-lg border border-line bg-card animate-pulse" />
              ))}
            </div>
          ) : followUpCount === 0 ? (
            <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
              Nobody needs chasing right now — every member has a program and every
              assessment turned into a signup.
            </div>
          ) : (
            <>
              {stuckMembers.length > 0 && (
                <section className="mb-8">
                  <h2 className="font-heading text-2xl uppercase text-white">
                    Paying but no program
                    <span className="ml-2 font-heading text-lg text-body">({stuckMembers.length})</span>
                  </h2>
                  <p className="mb-4 mt-1 text-sm leading-6 text-body">
                    These members are on an active plan or trial but never got a program.
                    Ask them to open the site and leave it open for a few minutes — it
                    rebuilds itself.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {stuckMembers.map((client) => (
                      <FollowUpCard
                        key={client.user_id}
                        client={client}
                        tone="urgent"
                        reason="Paid or trialing, but no program was ever built."
                      />
                    ))}
                  </div>
                </section>
              )}

              {unconvertedLeads.length > 0 && (
                <section>
                  <h2 className="font-heading text-2xl uppercase text-white">
                    Finished assessment, never subscribed
                    <span className="ml-2 font-heading text-lg text-body">({unconvertedLeads.length})</span>
                  </h2>
                  <p className="mb-4 mt-1 text-sm leading-6 text-body">
                    They completed the whole assessment and stopped at the payment page.
                    The free 7-day Kickstart is an easy way back in.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {unconvertedLeads.map((client) => (
                      <FollowUpCard
                        key={client.user_id}
                        client={client}
                        tone="lead"
                        reason="Completed the assessment but never subscribed."
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}

        {view === 'videos' && (
          <>
            <NewVideoUpload onChanged={reloadVideos} programExercises={programExercises} />

            <h2 className="mb-4 font-heading text-2xl uppercase text-white">
              Demonstration Library
              <span className="ml-2 font-heading text-lg text-body">({videos.length})</span>
            </h2>

            {unconnectedCount > 0 && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="font-heading text-lg uppercase text-yellow-400">
                  {unconnectedCount} {unconnectedCount === 1 ? 'video is' : 'videos are'} not
                  connected to an exercise
                </p>
                <p className="mt-1 text-xs leading-5 text-body">
                  A video only reaches a client when its name matches an exercise in their program.
                  These don&apos;t match anything yet, so nobody can see them. Each one below shows
                  the closest exercises — pick the right one to connect it.
                </p>
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-64 rounded-lg border border-line bg-card animate-pulse" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="rounded-lg border border-line bg-card p-8 text-center text-body">
                No exercise videos yet. Upload one above, or they appear here once a client views a
                demonstration.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <VideoCard
                    key={video.exercise_key}
                    video={video}
                    onChanged={reloadVideos}
                    programExercises={programExercises}
                    match={exerciseByKey.get(video.exercise_key) || null}
                    links={linksByVideo.get(video.id) || []}
                    takenKeys={linkedKeys}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
