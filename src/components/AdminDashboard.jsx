import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  Users, UserCheck, CalendarDays,
  RefreshCw, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, Search, X,
  Upload, Trash2, Video, Sparkles,
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

const MAX_VIDEO_BYTES = 100 * 1024 * 1024

// Uploads the file straight to Storage using a one-time signed URL. The bytes
// never pass through an edge function, which could not carry a video this size.
async function uploadExerciseVideo(exerciseName, file) {
  if (!file.type.startsWith('video/')) throw new Error('Please choose a video file.')
  if (file.size > MAX_VIDEO_BYTES) throw new Error('That video is over 100MB. Please trim or compress it.')

  const signed = await supabase.functions.invoke('manage-exercise-video', {
    body: { action: 'upload-url', exerciseName, passcode: ADMIN_PASSCODE },
  })
  if (signed.error || signed.data?.error) throw new Error(signed.data?.error || 'Could not start the upload.')

  const { error: uploadError } = await supabase.storage
    .from('exercise-videos')
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type })
  if (uploadError) throw new Error(uploadError.message)

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

function VideoCard({ video, onChanged }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

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

function NewVideoUpload({ onChanged }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

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
        The name must match how the exercise appears in a client&apos;s program (capitalisation and
        punctuation don&apos;t matter). MP4 plays everywhere — a .MOV from an iPhone may not play for
        every client. Max 100MB.
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
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {done && <p className="mt-2 text-xs text-accent">{done}</p>}
    </div>
  )
}

export default function AdminDashboard({ onBack }) {
  const [clients, setClients] = useState([])
  const [applications, setApplications] = useState([])
  const [videos, setVideos] = useState([])
  const [view, setView] = useState('clients')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  async function loadData(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError('')

    const [clientsRes, appsRes, videosRes] = await Promise.all([
      supabase.rpc('get_admin_dashboard'),
      supabase.rpc('get_trial_applications'),
      supabase.rpc('list_exercise_videos'),
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

    isRefresh ? setRefreshing(false) : setLoading(false)
  }

  async function reloadVideos() {
    const { data, error: videosError } = await supabase.rpc('list_exercise_videos')
    if (!videosError) setVideos(data || [])
  }

  function updateApplicationStatus(id, status) {
    setApplications((current) => current.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  useEffect(() => { loadData() }, [])

  const totalClients = clients.length
  const activeCount = clients.filter((c) => isActive(c.membership_status)).length
  const newThisMonth = clients.filter((c) => {
    if (!c.program_created_at) return false
    const d = new Date(c.program_created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const activeTrials = applications.filter(
    (a) => membershipAccess({ status: a.membership_status, current_period_end: a.trial_ends_at }).trialing,
  ).length

  const query = searchQuery.trim().toLowerCase()
  const filteredClients = query
    ? clients.filter((c) => {
        const name = (c.display_name || c.app_state?.profile?.name || '').toLowerCase()
        const plan = (c.plan_id || '').toLowerCase()
        return name.includes(query) || plan.includes(query)
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
              placeholder="Search clients by name or plan..."
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

        {view === 'videos' && (
          <>
            <NewVideoUpload onChanged={reloadVideos} />

            <h2 className="mb-4 font-heading text-2xl uppercase text-white">
              Demonstration Library
              <span className="ml-2 font-heading text-lg text-body">({videos.length})</span>
            </h2>

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
                  <VideoCard key={video.exercise_key} video={video} onChanged={reloadVideos} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
