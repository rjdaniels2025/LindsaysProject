import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Chat from './components/Chat.jsx'
import Landing from './components/Landing.jsx'
import Onboarding from './components/Onboarding.jsx'
import PricingPage from './components/PricingPage.jsx'
import { useProgramService } from './hooks/useProgramService.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function addWeeks(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString()
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

const VALID_STAGES = ['landing', 'assessment', 'account', 'pricing', 'chat']

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

// Where to send a logged-in user on page load (session restore)
function resolveLoadRoute({ messages }) {
  if (hasProgramMessage(messages)) return 'chat'
  return 'landing'
}

// Where to send a user after they log in — only used when they already have a program
function resolveLoginRoute({ messages }) {
  if (hasProgramMessage(messages)) return 'chat'
  return 'assessment' // no program yet — assessment or auto-generate handles it
}

// ─── UI components ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-6 text-center shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
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
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
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
        setError(
          result.error.message.includes('Email not confirmed')
            ? 'Check your email and confirm your account before logging in.'
            : result.error.message,
        )
        return
      }

      if (result.data.session) {
        onAuthenticated?.()
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
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl">
          {heading}
        </h1>
        {!isReset && !isForgot ? (
          <p className="mt-3 text-sm leading-6 text-body">
            {isCreating
              ? 'Create your account to generate your personalized 8-week training plan and dashboard.'
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
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [programCreatedAt, setProgramCreatedAt] = useState(null)
  const [programEndsAt, setProgramEndsAt] = useState(null)

  // ── UI state ──
  const [stage, setStage] = useState(() => stageFromHash() || 'landing')
  const [profileDraft, setProfileDraft] = useState(null)
  const [accountMode, setAccountMode] = useState('login') // 'login' | 'create'
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
    setProgramEndsAt(addWeeks(createdAt, 8))
    navigate('chat')
    setMessages([
      makeMessage(
        'assistant',
        `## Building ${targetProfile.name}'s program\n\nYour assessment is saved to your account. Elevate is generating your complete 8-week plan now.`,
        { type: 'status' },
      ),
    ])

    try {
      const text = await programService.generateProgram(targetProfile)
      setMessages([makeMessage('assistant', text, { type: 'program' })])
    } catch (err) {
      setError(err.message || 'Unable to generate the program.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate, programService])

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadUserData = useCallback(async (session, { isLogin = false } = {}) => {
    const nextUser = userFromSession(session)

    if (!nextUser) {
      setUser(null)
      setProfile(null)
      profileRef.current = null
      setMessages([])
      setProgramCreatedAt(null)
      setProgramEndsAt(null)
      setHasMembership(false)
      setIsAuthReady(true)
      navigate('landing', { replace: true })
      return
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

    // Recover profile saved before navigating to account (survives email-confirmation redirect)
    let storedDraft = null
    try {
      const raw = localStorage.getItem('elevate_draft')
      if (raw) { storedDraft = JSON.parse(raw); localStorage.removeItem('elevate_draft') }
    } catch {}

    const loadedProfile = saved.profile || saved.profileDraft || storedDraft || null
    const loadedMessages = Array.isArray(saved.messages) ? saved.messages : []
    const resolvedName = programData?.display_name || nextUser.name

    // Set all state in one batch now that data is ready
    setUser({ ...nextUser, name: resolvedName })
    setProfile(loadedProfile)
    profileRef.current = loadedProfile
    setMessages(loadedMessages)
    setProgramCreatedAt(saved.programCreatedAt || null)
    setProgramEndsAt(saved.programEndsAt || null)
    setHasMembership(membershipIsActive)
    setIsAuthReady(true)

    // Route based on membership + program state
    if (hasProgramMessage(loadedMessages)) {
      navigate('chat', { replace: true })
      return
    }

    if (membershipIsActive && loadedProfile) {
      generateProgramForProfile(loadedProfile)
      return
    }

    if (membershipIsActive) {
      navigate('assessment', { replace: true })
      return
    }

    if (loadedProfile) {
      navigate('pricing', { replace: true })
      return
    }

    navigate(isLogin ? 'assessment' : 'landing', { replace: true })
  }, [navigate, generateProgramForProfile])

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

      // Stripe checkout success return
      if (searchParams.get('checkout') === 'success') {
        clearUrl()
        if (!mounted) return
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          setIsAuthReady(true)
          isInitializedRef.current = true
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
        await loadUserData(sessionData.session, { isLogin: true })
        isInitializedRef.current = true
        return
      }

      // Password reset link
      if (hashParams.get('type') === 'recovery') {
        clearUrl()
        if (!mounted) return
        const { data } = await supabase.auth.getSession()
        if (data.session) setUser(userFromSession(data.session))
        setIsPasswordReset(true)
        setIsAuthReady(true)
        navigate('account', { replace: true })
        isInitializedRef.current = true
        return
      }

      // Email confirmation code exchange
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
        await loadUserData(data.session, { isLogin: true })
        isInitializedRef.current = true
        return
      }

      // Implicit token (magic link, OAuth)
      const hasImplicitToken =
        hashParams.get('access_token') || hashParams.get('refresh_token') || searchParams.get('token_hash')
      if (hasImplicitToken) clearUrl()

      // Standard session restore
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      await loadUserData(data.session)
      isInitializedRef.current = true
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true)
        setUser(userFromSession(session))
        navigate('account')
        setIsAuthReady(true)
        return
      }

      if (!isInitializedRef.current) return

      if (event === 'SIGNED_OUT') { loadUserData(null); return }
      if (event === 'SIGNED_IN') { loadUserData(session, { isLogin: true }) }
    })

    init()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserData, navigate])

  // ── Browser navigation (back/forward) ────────────────────────────────────

  useEffect(() => {
    function onNavigation() {
      const next = stageFromHash()
      if (next) setStage(next)
    }
    window.addEventListener('hashchange', onNavigation)
    window.addEventListener('popstate', onNavigation)
    return () => {
      window.removeEventListener('hashchange', onNavigation)
      window.removeEventListener('popstate', onNavigation)
    }
  }, [])

  // ── Persist user data (debounced) ─────────────────────────────────────────

  useEffect(() => {
    if (!user || !isAuthReady) return

    const timer = setTimeout(async () => {
      const { error: saveError } = await supabase.from('user_programs').upsert(
        {
          user_id: user.id,
          display_name: user.name,
          app_state: { profile, messages, programCreatedAt, programEndsAt },
        },
        { onConflict: 'user_id' },
      )
      if (saveError) setError(saveError.message)
    }, 100)

    return () => clearTimeout(timer)
  }, [user, isAuthReady, profile, messages, programCreatedAt, programEndsAt])

  // ── User actions ──────────────────────────────────────────────────────────

  function openLogin() {
    setError('')
    if (!user) {
      setAccountMode('login')
      navigate('account')
      return
    }
    if (hasProgramMessage(messages)) { navigate('chat'); return }
    if (hasMembership && profile) { generateProgramForProfile(profile); return }
    if (hasMembership) { navigate('assessment'); return }
    if (profile) { navigate('pricing'); return }
    navigate('assessment')
  }

  function onAccountAuthenticated() {
    // SIGNED_IN event fires and loadUserData handles routing — nothing to do here
  }

  function onPasswordReset() {
    setIsPasswordReset(false)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadUserData(data.session, { isLogin: true })
    })
  }

  function completeAssessment(completedProfile) {
    setError('')
    setProfile(completedProfile)
    profileRef.current = completedProfile
    setProfileDraft(completedProfile)
    // Save to localStorage so it survives email-confirmation redirect
    try { localStorage.setItem('elevate_draft', JSON.stringify(completedProfile)) } catch {}
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

  async function checkout(billing) {
    setError('')
    if (!supabase) { setError('Account system is not configured.'); return }
    setIsLoading(true)
    try {
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
        isLoading={isLoading}
        isVerifyingPayment={isVerifyingPayment}
        error={error}
        onHome={goHome}
      />
    )
  }

  // landing (default)
  return (
    <Landing
      user={user}
      hasProgram={hasProgramMessage(messages)}
      onStart={() => navigate('assessment')}
      onDashboard={() => navigate('chat')}
      onLogin={openLogin}
      onSignOut={signOut}
    />
  )
}

export default App
