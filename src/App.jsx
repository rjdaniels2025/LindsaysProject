import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import AdminDashboard from './components/AdminDashboard.jsx'
import AdminPasscode from './components/AdminPasscode.jsx'
import Chat from './components/Chat.jsx'
import Landing from './components/Landing.jsx'
import Onboarding from './components/Onboarding.jsx'
import PricingPage from './components/PricingPage.jsx'
import { useProgramService } from './hooks/useProgramService.js'
import { waitForProgramImages } from './utils/aiImage.js'
import { auditProgram } from './utils/programSafety.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const BLOCK_WEEKS = 4

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// A short, plain-text summary of last block's logged loads, fed into the next block so the
// program progresses from real performance instead of starting over.
function summarizeProgress(workoutLog) {
  const history = Array.isArray(workoutLog?.history) ? workoutLog.history : []
  if (!history.length) return ''
  const latest = new Map()
  for (const entry of history) {
    if (entry?.name && entry?.weight) latest.set(entry.name, entry.weight)
  }
  const lines = [...latest.entries()].map(([name, weight]) => `${name}: last used ${weight}`)
  if (!lines.length) return ''
  return lines.join('; ')
}

function summarizeCheckins(workoutLog) {
  const checkins = Array.isArray(workoutLog?.checkins) ? workoutLog.checkins : []
  if (!checkins.length) return ''
  return checkins
    .slice(-4)
    .map((c) => `Week ${c.week}: soreness ${c.soreness || '?'}/5, energy ${c.energy || '?'}/5${c.notes ? `, notes: ${c.notes}` : ''}`)
    .join('; ')
}

function makeMessage(role, content, meta = {}) {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString(), meta }
}

function hasProgramMessage(messages) {
  return messages.some((m) => m.meta?.type === 'program')
}

function userFromSession(session) {
  const u = session?.user
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.email?.split('@')[0] || 'Member',
  }
}

function authRedirectUrl() {
  return typeof window !== 'undefined' ? window.location.origin : undefined
}

const VALID_STAGES = ['landing', 'assessment', 'account', 'pricing', 'chat', 'admin']
const VALID_BILLING_OPTIONS = ['pay-in-full', 'monthly', 'biweekly']

function storedBillingOption() {
  if (typeof window === 'undefined') return 'monthly'
  try {
    const stored = localStorage.getItem('elevate_selected_billing')
    return VALID_BILLING_OPTIONS.includes(stored) ? stored : 'monthly'
  } catch {
    return 'monthly'
  }
}

function saveBillingOption(billing) {
  if (!VALID_BILLING_OPTIONS.includes(billing)) return
  try { localStorage.setItem('elevate_selected_billing', billing) } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

async function functionErrorMessage(error, fallback = 'Unable to start checkout.') {
  const response = error?.context
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json()
      return body?.error || body?.message || error?.message || fallback
    } catch {
      return error?.message || fallback
    }
  }

  return error?.message || fallback
}

function stageFromHash() {
  if (typeof window === 'undefined') return ''
  const h = window.location.hash.replace(/^#\/?/, '')
  return VALID_STAGES.includes(h) ? h : ''
}

function pushStage(stage) {
  if (typeof window === 'undefined') return
  window.history.pushState(null, '', stage === 'landing' ? '/' : `#${stage}`)
}

function replaceStage(stage) {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', stage === 'landing' ? '/' : `#${stage}`)
}

function clearUrl() {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', '/')
}

// The single source of truth for where an authenticated member belongs after a real
// auth transition (login, signup, payment, password reset). Returns a stage name, or
// 'generate' meaning "paid and assessed but no program exists yet — build one now".
//   - hasProgram                       → chat (their dashboard)
//   - membership + profile, no program → generate (first plan after payment)
//   - membership, no profile           → assessment (paid; finish onboarding to get a plan)
//   - profile, no membership           → pricing (complete payment)
//   - neither                          → landing
// This only runs on genuine transitions — the "Member Login" button and passive page
// loads do NOT call it, so a member is never bounced into the assessment just by
// clicking around or revisiting the site.
function routeForState({ hasProgram, hasMembership, hasProfile }) {
  if (hasProgram) return 'chat'
  if (hasMembership) return hasProfile ? 'generate' : 'assessment'
  if (hasProfile) return 'pricing'
  return 'landing'
}

// ─── UI components ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-6 text-center shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Fitness</p>
        <p className="mt-3 font-heading text-4xl uppercase leading-none text-white">Loading</p>
        <p className="mt-3 text-sm leading-6 text-body">Getting your member area ready.</p>
      </div>
    </main>
  )
}

function MissingSupabaseGate({ onHome }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-5 text-body">
      <div className="w-full max-w-md rounded-lg border border-red-400/40 bg-card p-5 shadow-2xl shadow-black/50 sm:p-6">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Fitness</p>
        <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl">
          Account Setup Needed
        </h1>
        <p className="mt-3 text-sm leading-6 text-body">
          Account creation is ready, but Supabase is not connected to this deployment yet.
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.
        </p>
        <button
          type="button"
          onClick={onHome}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-[#111] px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
        >
          <ArrowLeft size={18} />
          Home
        </button>
      </div>
    </main>
  )
}

function AccountGate({ onBack, onHome, onAuthenticated, onResetPassword, isPasswordReset, backLabel, initialMode = 'login' }) {
  const [mode, setMode] = useState(isPasswordReset ? 'reset' : initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isCreating = mode === 'create'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (isForgot) {
      if (!email.trim()) { setError('Enter your email address.'); return }
      setIsSubmitting(true)
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl(),
        })
        if (err) setError(err.message)
        else setMessage(`Reset link sent to ${email.trim()}. Check your inbox.`)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (isReset) {
      if (!password || password.length < 6) { setError('Use at least 6 characters for your new password.'); return }
      setIsSubmitting(true)
      try {
        const { error: err } = await supabase.auth.updateUser({ password })
        if (err) setError(err.message)
        else onResetPassword?.()
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!email.trim() || !password || (isCreating && !name.trim())) {
      setError('Complete every required field.')
      return
    }
    if (password.length < 6) {
      setError('Use at least 6 characters for your password.')
      return
    }

    setIsSubmitting(true)
    try {
      const trimmedEmail = email.trim()
      const result = isCreating
        ? await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: { emailRedirectTo: authRedirectUrl(), data: { name: name.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email: trimmedEmail, password })

      if (result.error) {
        const msg = result.error.message
        setError(
          /already registered|already exists|user already/i.test(msg)
            ? 'An account with this email already exists. Log in instead.'
            : msg.includes('Email not confirmed')
              ? 'Check your email and confirm your account before logging in.'
              : msg,
        )
        if (/already registered|already exists|user already/i.test(msg)) {
          setMode('login')
          setPassword('')
        }
        return
      }

      // Supabase returns a user with no identities (and no session) when the email is
      // already registered — surface that clearly instead of a dead-end "check email".
      if (isCreating && Array.isArray(result.data.user?.identities) && result.data.user.identities.length === 0) {
        setMode('login')
        setPassword('')
        setError('An account with this email already exists. Log in instead.')
        return
      }

      if (result.data.session) {
        onAuthenticated?.({ isSignup: isCreating })
        return
      }

      if (isCreating) {
        setPassword('')
        setMode('login')
        setMessage(`Check ${trimmedEmail} to confirm your account, then log in here.`)
        return
      }

      setError('Unable to create a session. Try logging in again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const heading = isReset ? 'Set New Password' : isForgot ? 'Reset Password' : isCreating ? 'Create Account' : 'Member Login'
  const submitLabel = isSubmitting ? 'Working' : isReset ? 'Set Password' : isForgot ? 'Send Reset Link' : isCreating ? 'Create Account' : 'Log In'

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-5 text-body">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-line bg-card p-5 shadow-2xl shadow-black/50 sm:p-6"
      >
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Fitness</p>
        <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl">
          {heading}
        </h1>
        {!isReset && !isForgot ? (
          <p className="mt-3 text-sm leading-6 text-body">
            {isCreating
              ? 'Create your account to generate your personalized 6-month transformation plan and dashboard.'
              : 'Log in to access your personalized training dashboard.'}
          </p>
        ) : null}
        {isCreating ? (
          <label className="mt-6 block">
            <span className="mb-2 block font-heading text-lg uppercase text-white">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
        ) : null}
        {!isReset ? (
          <label className="mt-6 block">
            <span className="mb-2 block font-heading text-lg uppercase text-white">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          </label>
        ) : null}
        {!isForgot ? (
          <label className="mt-4 block">
            <span className="mb-2 block font-heading text-lg uppercase text-white">
              {isReset ? 'New Password' : 'Password'}
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
              placeholder="At least 6 characters"
              type="password"
              autoComplete={isCreating || isReset ? 'new-password' : 'current-password'}
            />
          </label>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {!isReset ? (
          <button
            type="button"
            onClick={() => { setMode(isForgot || isCreating ? 'login' : 'create'); setError(''); setMessage('') }}
            className="mt-3 min-h-11 w-full rounded-lg border border-line bg-[#111] px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            {isForgot ? 'Back to login' : isCreating ? 'I already have an account' : 'Create a new account'}
          </button>
        ) : null}
        {!isReset && !isForgot && !isCreating ? (
          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
            className="mt-3 w-full text-center text-sm text-body underline-offset-2 transition hover:text-white hover:underline"
          >
            Forgot your password?
          </button>
        ) : null}
        {!isReset ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-3 min-h-11 w-full rounded-lg px-5 font-heading text-lg uppercase text-body transition hover:text-white"
          >
            {backLabel || 'Back'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onHome}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 font-heading text-lg uppercase text-body transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Home
        </button>
      </form>
    </main>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  // ── Core data ──
  const [user, setUser] = useState(null)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [programCreatedAt, setProgramCreatedAt] = useState(null)
  const [programEndsAt, setProgramEndsAt] = useState(null)
  const [workoutLog, setWorkoutLog] = useState({})
  const [blockNumber, setBlockNumber] = useState(1)

  // ── UI state ──
  const [stage, setStage] = useState(() => stageFromHash() || 'landing')
  const [profileDraft, setProfileDraft] = useState(null)
  const [accountMode, setAccountMode] = useState('login') // 'login' | 'create'
  const [selectedBilling, setSelectedBilling] = useState(storedBillingOption)
  const [isAuthReady, setIsAuthReady] = useState(!isSupabaseConfigured)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [hasMembership, setHasMembership] = useState(false)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)

  const programService = useProgramService()

  // Stable refs — read inside callbacks without causing re-subscriptions
  const isInitializedRef = useRef(false)
  const profileRef = useRef(null)
  // Guards the debounced save: it must never run until a real loadUserData has populated
  // state, otherwise an auth flow that sets `user` without loading (e.g. password reset)
  // would persist empty profile/messages over the member's saved program.
  const dataLoadedRef = useRef(false)

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = useCallback((nextStage, { replace = false } = {}) => {
    setStage(nextStage)
    if (replace) replaceStage(nextStage)
    else pushStage(nextStage)
  }, [])

  const goHome = useCallback(() => navigate('landing'), [navigate])

  // ── Program generation ────────────────────────────────────────────────────

  const generateProgramForProfile = useCallback(async (targetProfile) => {
    const createdAt = new Date().toISOString()
    setError('')
    setIsLoading(true)
    setProfile(targetProfile)
    profileRef.current = targetProfile
    setProgramCreatedAt(createdAt)
    setProgramEndsAt(addDays(createdAt, BLOCK_WEEKS * 7))
    setWorkoutLog({}) // fresh program — old exercise tracking no longer applies
    setBlockNumber(1) // first 4-week block
    navigate('chat')
    setMessages([
      makeMessage(
        'assistant',
        `## Building ${targetProfile.name}'s program\n\nYour assessment is saved to your account. Lindsay is generating your first 4-week block now.`,
        { type: 'status' },
      ),
    ])

    try {
      const text = await programService.generateProgram(targetProfile, { blockNumber: 1 })
      const safetyFlags = auditProgram(text, targetProfile.limitations)
      await waitForProgramImages(text)
      setMessages([makeMessage('assistant', text, { type: 'program', safetyFlags })])
    } catch (err) {
      setError(err.message || 'Unable to generate the program.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate, programService])

  // Regenerate the next 4-week block from the client's logged progress. Triggered by the
  // client confirming the end-of-block prompt; only meaningful while their membership is active.
  const generateNextBlock = useCallback(async () => {
    const targetProfile = profileRef.current || profile
    if (!targetProfile || isLoading) return

    const nextBlock = blockNumber + 1
    const progress = summarizeProgress(workoutLog)
    const checkins = summarizeCheckins(workoutLog)
    const preservedHistory = Array.isArray(workoutLog?.history) ? workoutLog.history : []
    const createdAt = new Date().toISOString()

    setError('')
    setIsLoading(true)
    setProgramCreatedAt(createdAt)
    setProgramEndsAt(addDays(createdAt, BLOCK_WEEKS * 7))
    setBlockNumber(nextBlock)
    const preservedCheckins = Array.isArray(workoutLog?.checkins) ? workoutLog.checkins : []
    setWorkoutLog({ history: preservedHistory, checkins: preservedCheckins }) // keep cross-block history + check-ins
    setMessages([
      makeMessage(
        'assistant',
        `## Building ${targetProfile.name}'s block ${nextBlock}\n\nLindsay is using your logged progress to build your next 4 weeks.`,
        { type: 'status' },
      ),
    ])

    try {
      const text = await programService.generateProgram(targetProfile, { blockNumber: nextBlock, progress, checkins })
      const safetyFlags = auditProgram(text, targetProfile.limitations)
      await waitForProgramImages(text)
      setMessages([makeMessage('assistant', text, { type: 'program', safetyFlags })])
    } catch (err) {
      setError(err.message || 'Unable to generate the next block.')
    } finally {
      setIsLoading(false)
    }
  }, [profile, isLoading, blockNumber, workoutLog, programService])

  // ── Data loading ──────────────────────────────────────────────────────────

  // Pure loader: fetches the member's saved program + membership, pushes it all into
  // state, and returns a summary. It performs NO navigation and NO generation — callers
  // decide what to do via routeAfterAuth. Passing a null session fully resets to a
  // signed-out state. Returns null when there is no user.
  const loadUserData = useCallback(async (session) => {
    const nextUser = userFromSession(session)

    if (!nextUser) {
      setUser(null)
      setProfile(null)
      profileRef.current = null
      setMessages([])
      setProgramCreatedAt(null)
      setProgramEndsAt(null)
      setWorkoutLog({})
      setBlockNumber(1)
      setHasMembership(false)
      dataLoadedRef.current = false
      setIsAuthReady(true)
      return null
    }

    // Fetch data BEFORE updating state — prevents the save effect from firing
    // with empty profile/messages while the query is in flight
    const [programResult, membershipResult] = await Promise.all([
      supabase.from('user_programs').select('display_name, app_state').eq('user_id', nextUser.id).maybeSingle(),
      supabase.from('user_memberships').select('status').eq('user_id', nextUser.id).maybeSingle(),
    ])

    if (programResult.error) setError(programResult.error.message)
    const programData = programResult.data
    const membershipIsActive = membershipResult.data?.status === 'active'

    const saved = programData?.app_state || {}
    const loadedProfile = saved.profile || saved.profileDraft || null
    const loadedMessages = Array.isArray(saved.messages) ? saved.messages : []
    const resolvedName = programData?.display_name || nextUser.name

    // Set all state in one batch now that data is ready
    setUser({ ...nextUser, name: resolvedName })
    setProfile(loadedProfile)
    profileRef.current = loadedProfile
    setMessages(loadedMessages)
    setProgramCreatedAt(saved.programCreatedAt || null)
    setProgramEndsAt(saved.programEndsAt || null)
    setWorkoutLog(saved.workoutLog && typeof saved.workoutLog === 'object' ? saved.workoutLog : {})
    setBlockNumber(typeof saved.blockNumber === 'number' && saved.blockNumber > 0 ? saved.blockNumber : 1)
    setHasMembership(membershipIsActive)
    dataLoadedRef.current = true
    setIsAuthReady(true)

    return {
      userId: nextUser.id,
      profile: loadedProfile,
      hasProfile: !!loadedProfile,
      hasMembership: membershipIsActive,
      hasProgram: hasProgramMessage(loadedMessages),
    }
  }, [])

  // The one place that turns a loaded auth summary into a destination. Called only at
  // genuine transition points (login, signup confirmation, payment return, password
  // reset) — never on a passive page refresh.
  const routeAfterAuth = useCallback((summary) => {
    if (!summary) { navigate('landing', { replace: true }); return }
    const target = routeForState(summary)
    if (target === 'generate') { generateProgramForProfile(summary.profile); return }
    navigate(target, { replace: true })
  }, [navigate, generateProgramForProfile])

  // Restores an in-progress assessment saved to localStorage during signup, so a brand
  // new member who just confirmed their email keeps their answers even though nothing is
  // in the database yet. Only ever consumed in the email-confirmation path.
  const restoreSignupDraft = useCallback((summary) => {
    let storedDraft = null
    try {
      const raw = localStorage.getItem('elevate_draft')
      if (raw) storedDraft = JSON.parse(raw)
    } catch {
      // A bad draft should not block a member from loading their account.
    }
    try { localStorage.removeItem('elevate_draft') } catch { /* storage may be unavailable */ }

    if (summary && !summary.profile && storedDraft) {
      setProfile(storedDraft)
      profileRef.current = storedDraft
      return { ...summary, profile: storedDraft, hasProfile: true }
    }
    return summary
  }, [])

  // ── Auth setup (runs once) ────────────────────────────────────────────────

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let mounted = true

    async function init() {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const authError =
        searchParams.get('error_description') || hashParams.get('error_description') ||
        searchParams.get('error') || hashParams.get('error') || ''
      if (authError) {
        clearUrl()
        if (!mounted) return
        setError(authError)
        setIsAuthReady(true)
        isInitializedRef.current = true
        return
      }

      // ── Stripe checkout success return ──
      // Poll until the webhook has marked the membership active, then load + route
      // (which generates the first plan for a paid, assessed member).
      if (searchParams.get('checkout') === 'success') {
        clearUrl()
        if (!mounted) return
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          isInitializedRef.current = true
          await loadUserData(null)
          navigate('landing', { replace: true })
          return
        }
        setIsVerifyingPayment(true)
        setIsAuthReady(true)
        const userId = sessionData.session.user.id
        let attempts = 0
        let membershipActive = false
        while (attempts < 6 && !membershipActive) {
          if (attempts > 0) await new Promise((r) => setTimeout(r, 2000))
          if (!mounted) break
          const { data: membershipData } = await supabase
            .from('user_memberships')
            .select('status')
            .eq('user_id', userId)
            .maybeSingle()
          if (membershipData?.status === 'active') membershipActive = true
          attempts++
        }
        if (!mounted) return
        setIsVerifyingPayment(false)
        const summary = await loadUserData(sessionData.session)
        isInitializedRef.current = true
        routeAfterAuth(summary)
        return
      }

      // ── Password reset link ──
      // Load the member's real data (so the save effect can't clobber their program with
      // empty state) and land on the reset form. Routing happens later via the
      // USER_UPDATED event once the new password is saved.
      if (hashParams.get('type') === 'recovery') {
        clearUrl()
        if (!mounted) return
        const { data } = await supabase.auth.getSession()
        await loadUserData(data.session)
        if (!mounted) return
        setIsPasswordReset(true)
        navigate('account', { replace: true })
        isInitializedRef.current = true
        return
      }

      // ── Email confirmation (signup) ──
      // Restore the assessment draft they filled in before confirming, then route
      // (a freshly confirmed, unpaid member lands on pricing).
      const code = searchParams.get('code') || hashParams.get('code') || ''
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        clearUrl()
        if (!mounted) return
        if (exchangeError) {
          setError(exchangeError.message)
          setIsAuthReady(true)
          isInitializedRef.current = true
          return
        }
        const summary = restoreSignupDraft(await loadUserData(data.session))
        isInitializedRef.current = true
        routeAfterAuth(summary)
        return
      }

      // ── Implicit token (magic link, OAuth) ──
      const hasImplicitToken =
        hashParams.get('access_token') || hashParams.get('refresh_token') || searchParams.get('token_hash')
      if (hasImplicitToken) clearUrl()

      // ── Passive session restore ──
      // A normal page load. If the user has a valid saved session, route them
      // directly to their dashboard so they don't have to log in again.
      // If there's no session, show the landing page as normal.
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const summary = await loadUserData(data.session)
      isInitializedRef.current = true
      if (data.session) {
        routeAfterAuth(summary)
      } else {
        navigate('landing', { replace: true })
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Recovery can arrive as an event instead of a URL fragment. Load real data first
      // so the save effect can't overwrite the member's program with empty state.
      if (event === 'PASSWORD_RECOVERY') {
        await loadUserData(session)
        if (!mounted) return
        setIsPasswordReset(true)
        navigate('account')
        return
      }

      // Ignore events fired while init() is still resolving the initial session.
      if (!isInitializedRef.current) return

      if (event === 'SIGNED_OUT') {
        await loadUserData(null)
        navigate('landing', { replace: true })
        return
      }

      // Fired after a successful password change — reload and route to their dashboard.
      if (event === 'USER_UPDATED') {
        routeAfterAuth(await loadUserData(session))
        return
      }

      // SIGNED_IN is intentionally not handled here. Explicit form logins route via
      // onAccountAuthenticated; signup confirmation, checkout and recovery route inside
      // init(). Ignoring the event avoids re-routing on the SDK's tab-refocus re-emits.
    })

    init()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserData, navigate, routeAfterAuth, restoreSignupDraft])

  // ── Browser navigation (back/forward) ────────────────────────────────────

  useEffect(() => {
    function onNavigation() {
      const next = stageFromHash() || 'landing'

      // The dashboard only makes sense with a program loaded (or one being built).
      // Bounce stale #chat history entries to landing instead of showing an empty shell.
      if (next === 'chat' && !hasProgramMessage(messages) && !isLoading) {
        replaceStage('landing')
        setStage('landing')
        return
      }

      setStage(next)
    }
    window.addEventListener('hashchange', onNavigation)
    window.addEventListener('popstate', onNavigation)
    return () => {
      window.removeEventListener('hashchange', onNavigation)
      window.removeEventListener('popstate', onNavigation)
    }
  }, [messages, isLoading])

  // ── Persist user data (debounced) ─────────────────────────────────────────

  useEffect(() => {
    // Never persist until a real load has populated state — prevents wiping a member's
    // saved program when an auth flow sets `user` before loadUserData runs.
    if (!user || !isAuthReady || !dataLoadedRef.current) return

    const timer = setTimeout(async () => {
      const { error: saveError } = await supabase.from('user_programs').upsert(
        {
          user_id: user.id,
          display_name: user.name || user.email?.split('@')[0] || 'Member',
          app_state: { profile, messages, programCreatedAt, programEndsAt, workoutLog, blockNumber },
        },
        { onConflict: 'user_id' },
      )
      if (saveError) {
        // FK violation means the auth.users record is gone (deleted account with a
        // cached JWT). Sign out to clear the stale session instead of showing an error.
        if (saveError.code === '23503') {
          await supabase.auth.signOut()
        } else {
          setError(saveError.message)
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [user, isAuthReady, profile, messages, programCreatedAt, programEndsAt, workoutLog, blockNumber])

  // ── User actions ──────────────────────────────────────────────────────────

  function openLogin() {
    setError('')
    // "Member Login" does exactly one thing: open the login screen.
    setAccountMode('login')
    navigate('account')
  }

  function openPricing() {
    setError('')
    navigate('pricing')
  }

  function selectPricingAndStartAssessment(billing) {
    if (VALID_BILLING_OPTIONS.includes(billing)) {
      setSelectedBilling(billing)
      saveBillingOption(billing)
    }
    setError('')
    navigate('landing')
  }

  async function onAccountAuthenticated({ isSignup = false } = {}) {
    // A login or signup just succeeded with an immediate session.
    const { data } = await supabase.auth.getSession()
    let summary = await loadUserData(data.session)
    // On signup the assessment lives only in the localStorage draft (nothing in the DB
    // yet) — restore it so the new member carries their answers into pricing. We never
    // do this for a plain login, so a stale draft can't leak into an existing account.
    if (isSignup) summary = restoreSignupDraft(summary)
    routeAfterAuth(summary)
  }

  function onPasswordReset() {
    setIsPasswordReset(false)
    // Routing is handled by the USER_UPDATED auth event fired after updateUser
  }

  function completeAssessment(completedProfile) {
    setError('')
    setProfile(completedProfile)
    profileRef.current = completedProfile
    setProfileDraft(completedProfile)

    // Already signed in (e.g. a paid member who hadn't finished onboarding): no account
    // step needed — generate their plan if they've paid, otherwise send them to pricing.
    if (user) {
      routeAfterAuth({
        profile: completedProfile,
        hasProfile: true,
        hasMembership,
        hasProgram: hasProgramMessage(messages),
      })
      return
    }

    // New visitor: persist the assessment so it survives the email-confirmation redirect,
    // then move on to account creation.
    try { localStorage.setItem('elevate_draft', JSON.stringify(completedProfile)) } catch {
      // Account creation still works if local storage is unavailable.
    }
    setAccountMode('create')
    navigate('account')
  }

  async function sendMessage(text, meta = {}) {
    const userMsg = makeMessage('user', text, { type: 'request', label: meta.label || text })
    const next = [...messages, userMsg]
    setMessages(next)
    setError('')
    setIsLoading(true)
    try {
      const reply = await programService.sendMessage(messages, text)
      setMessages([...next, makeMessage('assistant', reply, { type: 'result', label: meta.label || text })])
    } catch (err) {
      setError(err.message || 'Unable to send this message.')
    } finally {
      setIsLoading(false)
    }
  }

  async function analyzeMedia(payload) {
    const label = payload.type === 'video' ? `Analyze video: ${payload.name}` : `Analyze image: ${payload.name}`
    const userMsg = makeMessage('user', label, { type: 'media', mediaName: payload.name })
    const next = [...messages, userMsg]
    setMessages(next)
    setError('')
    setIsLoading(true)
    try {
      const reply = await programService.analyzeMedia(messages, payload)
      setMessages([...next, makeMessage('assistant', reply, { type: 'analysis', label: 'Form feedback' })])
    } catch (err) {
      setError(err.message || 'Unable to analyze this media.')
    } finally {
      setIsLoading(false)
    }
  }

  function retryGenerateProgram() {
    const targetProfile = profileRef.current || profile
    if (!targetProfile) return
    setMessages([])
    setError('')
    generateProgramForProfile(targetProfile)
  }

  async function checkout(billing, coupon = null) {
    setError('')
    if (VALID_BILLING_OPTIONS.includes(billing)) {
      setSelectedBilling(billing)
      saveBillingOption(billing)
    }
    if (!supabase) { setError('Account system is not configured.'); return }
    setIsLoading(true)
    try {
      if (coupon?.discount_percent === 100) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('redeem-coupon', {
          body: { code: coupon.code },
        })
        if (fnError) { setError(await functionErrorMessage(fnError, 'Unable to redeem coupon.')); return }
        if (!fnData?.success) { setError('Unable to redeem coupon. Please try again.'); return }
        const { data: sessionData } = await supabase.auth.getSession()
        routeAfterAuth(await loadUserData(sessionData.session))
        return
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: { billing },
      })
      if (fnError) { setError(await functionErrorMessage(fnError)); return }
      if (fnData?.url) window.location.href = fnData.url
      else setError('No checkout URL returned. Please try again.')
    } catch (err) {
      setError(err.message || 'Unable to start checkout.')
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    // SIGNED_OUT event calls loadUserData(null) which resets everything
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isAuthReady) return <LoadingScreen />

  if (stage === 'chat') {
    return (
      <Chat
        user={user}
        profile={profile}
        messages={messages}
        programCreatedAt={programCreatedAt}
        programEndsAt={programEndsAt}
        workoutLog={workoutLog}
        onWorkoutLogChange={setWorkoutLog}
        blockNumber={blockNumber}
        membershipActive={hasMembership}
        onStartNextBlock={generateNextBlock}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        onAnalyzeMedia={analyzeMedia}
        onSignOut={signOut}
        onHome={goHome}
        onRetry={retryGenerateProgram}
      />
    )
  }

  if (stage === 'account') {
    if (!isSupabaseConfigured) {
      return <MissingSupabaseGate onHome={goHome} />
    }
    return (
      <AccountGate
        onBack={goHome}
        onHome={goHome}
        onAuthenticated={onAccountAuthenticated}
        onResetPassword={onPasswordReset}
        isPasswordReset={isPasswordReset}
        backLabel="Back to home"
        initialMode={accountMode}
      />
    )
  }

  if (stage === 'assessment') {
    return (
      <Onboarding
        initialProfile={profileDraft}
        onProfileChange={setProfileDraft}
        onComplete={completeAssessment}
        onHome={goHome}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  if (stage === 'pricing') {
    return (
      <PricingPage
        onCheckout={checkout}
        onStartAssessment={selectPricingAndStartAssessment}
        initialBilling={selectedBilling}
        requiresAssessment={!profile}
        isLoading={isLoading}
        isVerifyingPayment={isVerifyingPayment}
        error={error}
        onHome={goHome}
      />
    )
  }

  if (stage === 'admin') {
    if (!adminUnlocked) {
      return (
        <AdminPasscode
          onUnlock={() => setAdminUnlocked(true)}
          onBack={goHome}
        />
      )
    }
    return (
      <AdminDashboard
        onBack={() => {
          setAdminUnlocked(false)
          goHome()
        }}
      />
    )
  }

  // landing (default)
  return (
    <Landing
      user={user}
      hasProgram={hasProgramMessage(messages)}
      onStart={() => navigate('assessment')}
      onPricing={openPricing}
      onDashboard={() => navigate('chat')}
      onLogin={openLogin}
      onSignOut={signOut}
      onAdmin={() => navigate('admin')}
    />
  )
}

export default App
