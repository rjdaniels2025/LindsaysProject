import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Chat from './components/Chat.jsx'
import Landing from './components/Landing.jsx'
import MembershipGate from './components/MembershipGate.jsx'
import Onboarding from './components/Onboarding.jsx'
import { useProgramService } from './hooks/useProgramService.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

function emptyAppState() {
  return {
    stage: 'landing',
    profile: null,
    messages: [],
    profileDraft: null,
    selectedPlan: 'transformation',
    selectedBilling: 'monthly',
    programCreatedAt: null,
    programEndsAt: null,
  }
}

function normalizeStage(stage) {
  return stage === 'onboarding' ? 'assessment' : stage
}

function stageFromHash() {
  if (typeof window === 'undefined') return ''
  const hashStage = window.location.hash.replace(/^#\/?/, '')
  return ['landing', 'assessment', 'membership', 'account', 'chat'].includes(hashStage) ? hashStage : ''
}

function addWeeks(date, weeks) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + weeks * 7)
  return nextDate.toISOString()
}

function createMessage(role, content, meta = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
    meta,
  }
}

function membershipIsActive(membership) {
  if (!membership) return false
  if (!['active', 'trialing'].includes(membership.status)) return false
  if (!membership.current_period_end) return true
  return new Date(membership.current_period_end).getTime() > Date.now()
}

function userFromSession(session) {
  const user = session?.user
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
  }
}

function authRedirectUrl() {
  if (typeof window === 'undefined') return undefined
  return window.location.origin
}

function readAuthCallbackFromUrl() {
  if (typeof window === 'undefined') {
    return { code: '', error: '', hasAuthParams: false }
  }

  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = searchParams.get('code') || hashParams.get('code') || ''
  const error = searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error') ||
    ''
  const hasAuthParams = Boolean(
    code ||
    error ||
    searchParams.get('token_hash') ||
    hashParams.get('access_token') ||
    hashParams.get('refresh_token'),
  )

  return { code, error, hasAuthParams }
}

function clearAuthCallbackFromUrl() {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', window.location.pathname || '/')
}

function MissingSupabaseGate({ onBack, onHome }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-5 text-body">
      <div className="w-full max-w-md rounded-lg border border-red-400/40 bg-card p-5 shadow-2xl shadow-black/50 sm:p-6">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl">Account Setup Needed</h1>
        <p className="mt-3 text-sm leading-6 text-body">
          Account creation is ready, but Supabase is not connected to this deployment yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.
        </p>
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white"
          >
            Back To Membership
          </button>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-[#111] px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            <ArrowLeft size={18} />
            Home
          </button>
        </div>
      </div>
    </main>
  )
}

function AccountGate({ onBack, onHome, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isCreating = mode === 'create'

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

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
            options: {
              emailRedirectTo: authRedirectUrl(),
              data: {
                name: name.trim(),
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })

      if (result.error) {
        setError(result.error.message.includes('Email not confirmed')
          ? 'Check your email and confirm your account before logging in.'
          : result.error.message)
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

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-5 text-body">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-card p-5 shadow-2xl shadow-black/50 sm:p-6">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 text-balance font-heading text-4xl uppercase leading-none text-white min-[380px]:text-5xl">
          {isCreating ? 'Create Account' : 'Member Login'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-body">
          Create your member account so your questionnaire, subscription, dashboard, and eight week plan can be saved securely.
        </p>
        {isCreating ? (
          <label className="mt-6 block">
            <span className="mb-2 block font-heading text-lg uppercase text-white">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
        ) : null}
        <label className="mt-6 block">
          <span className="mb-2 block font-heading text-lg uppercase text-white">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block font-heading text-lg uppercase text-white">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
            placeholder="At least 6 characters"
            type="password"
            autoComplete={isCreating ? 'new-password' : 'current-password'}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Working' : isCreating ? 'Create Account' : 'Log In'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(isCreating ? 'login' : 'create')
            setError('')
            setMessage('')
          }}
          className="mt-3 min-h-11 w-full rounded-lg border border-line bg-[#111] px-5 font-heading text-lg uppercase text-white transition hover:border-accent"
        >
          {isCreating ? 'I already have an account' : 'Create a new account'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 min-h-11 w-full rounded-lg px-5 font-heading text-lg uppercase text-body transition hover:text-white"
        >
          Back to membership
        </button>
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

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [stage, setStage] = useState(() => stageFromHash() || 'landing')
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [profileDraft, setProfileDraft] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('transformation')
  const [selectedBilling, setSelectedBilling] = useState('monthly')
  const [membership, setMembership] = useState(null)
  const [programCreatedAt, setProgramCreatedAt] = useState(null)
  const [programEndsAt, setProgramEndsAt] = useState(null)
  const [returnToMembershipAfterAuth, setReturnToMembershipAfterAuth] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isProgramLoaded, setIsProgramLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const programService = useProgramService()

  const navigateStage = useCallback((nextStage) => {
    const normalizedStage = normalizeStage(nextStage)
    setStage(normalizedStage)

    if (typeof window !== 'undefined') {
      const nextHash = normalizedStage === 'landing' ? window.location.pathname : `#${normalizedStage}`
      window.history.pushState(null, '', nextHash)
    }
  }, [])

  const goHome = useCallback(() => {
    navigateStage('landing')
  }, [navigateStage])

  const applyAppState = useCallback((nextState) => {
    setStage(stageFromHash() || normalizeStage(nextState.stage))
    setProfile(nextState.profile)
    setMessages(nextState.messages)
    setProfileDraft(nextState.profileDraft)
    setSelectedPlan(nextState.selectedPlan || 'transformation')
    setSelectedBilling(nextState.selectedBilling || 'monthly')
    setProgramCreatedAt(nextState.programCreatedAt)
    setProgramEndsAt(nextState.programEndsAt)
  }, [])

  const loadUserProgram = useCallback(async (session) => {
    const nextUser = userFromSession(session)
    setCurrentUser(nextUser)

    if (!nextUser) {
      applyAppState(emptyAppState())
      setMembership(null)
      setIsProgramLoaded(false)
      setIsAuthLoading(false)
      return
    }

    setIsProgramLoaded(false)
    const { data, error: loadError } = await supabase
      .from('user_programs')
      .select('display_name, app_state')
      .eq('user_id', nextUser.id)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
      applyAppState(emptyAppState())
    } else {
      const nextState = { ...emptyAppState(), ...(data?.app_state || {}) }
      applyAppState(nextState)
      if (returnToMembershipAfterAuth && profileDraft) {
        navigateStage('membership')
        setProfile(profileDraft)
        setProfileDraft(profileDraft)
        setReturnToMembershipAfterAuth(false)
      }
      if (data?.display_name && data.display_name !== nextUser.name) {
        setCurrentUser({ ...nextUser, name: data.display_name })
      }
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('user_memberships')
      .select('plan_id, billing, status, current_period_end')
      .eq('user_id', nextUser.id)
      .maybeSingle()

    if (membershipError) {
      setError(membershipError.message)
      setMembership(null)
    } else {
      setMembership(membershipData)
    }

    setIsProgramLoaded(true)
    setIsAuthLoading(false)
  }, [applyAppState, navigateStage, profileDraft, returnToMembershipAfterAuth])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let isMounted = true

    async function initializeAuth() {
      const callback = readAuthCallbackFromUrl()

      if (callback.error) {
        clearAuthCallbackFromUrl()
        if (!isMounted) return
        setError(callback.error)
        setIsAuthLoading(false)
        return
      }

      if (callback.code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(callback.code)
        clearAuthCallbackFromUrl()
        if (!isMounted) return

        if (exchangeError) {
          setError(exchangeError.message)
          setIsAuthLoading(false)
          return
        }

        loadUserProgram(data.session)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!isMounted) return

      if (callback.hasAuthParams) {
        clearAuthCallbackFromUrl()
      }

      loadUserProgram(data.session)
    }

    initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        loadUserProgram(session)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadUserProgram])

  useEffect(() => {
    function handleNavigation() {
      const nextStage = stageFromHash()
      if (nextStage) setStage(nextStage)
    }

    window.addEventListener('hashchange', handleNavigation)
    window.addEventListener('popstate', handleNavigation)

    return () => {
      window.removeEventListener('hashchange', handleNavigation)
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !isProgramLoaded) return

    const nextState = {
      stage,
      profile,
      messages,
      profileDraft,
      selectedPlan,
      selectedBilling,
      programCreatedAt,
      programEndsAt,
    }

    const saveTimer = window.setTimeout(async () => {
      const { error: saveError } = await supabase
        .from('user_programs')
        .upsert({
          user_id: currentUser.id,
          display_name: currentUser.name,
          app_state: nextState,
        })

      if (saveError) setError(saveError.message)
    }, 350)

    return () => window.clearTimeout(saveTimer)
  }, [currentUser, isProgramLoaded, stage, profile, messages, profileDraft, selectedPlan, selectedBilling, programCreatedAt, programEndsAt])

  const saveProfileDraft = useCallback((nextProfile) => {
    setProfileDraft(nextProfile)
  }, [])

  const prepareMembership = useCallback((nextProfile) => {
    setError('')
    setProfileDraft(nextProfile)
    setProfile(nextProfile)
    navigateStage('membership')
  }, [navigateStage])

  function startAccountCreation() {
    setError('')
    if (!isSupabaseConfigured) {
      navigateStage('account')
      return
    }
    setReturnToMembershipAfterAuth(true)
    navigateStage('account')
  }

  function handleAuthenticated() {
    setReturnToMembershipAfterAuth(false)
    navigateStage(profileDraft ? 'membership' : 'landing')
  }

  async function startCheckout() {
    if (!currentUser) {
      startAccountCreation()
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const { data, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId: selectedPlan,
          billing: selectedBilling,
        },
      })

      if (checkoutError) {
        throw new Error(checkoutError.message)
      }

      if (!data?.url) {
        throw new Error('Stripe did not return a checkout URL.')
      }

      window.location.assign(data.url)
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to start checkout.')
      setIsLoading(false)
    }
  }

  async function generateProgram() {
    const nextProfile = profileDraft || profile

    if (!currentUser) {
      startAccountCreation()
      return
    }

    if (!nextProfile) {
      setError('Complete the questionnaire before generating your plan.')
      navigateStage('assessment')
      return
    }

    if (!membershipIsActive(membership)) {
      setError('Complete checkout before generating your plan.')
      navigateStage('membership')
      return
    }

    const createdAt = new Date().toISOString()
    setError('')
    setIsLoading(true)
    setProfile(nextProfile)
    setProfileDraft(nextProfile)
    setProgramCreatedAt(createdAt)
    setProgramEndsAt(addWeeks(createdAt, 8))
    navigateStage('chat')
    setMessages([
      createMessage(
        'assistant',
        `## Building ${nextProfile.name}'s program\n\nYour assessment is saved to your member account. Elevate is generating your complete 8-week plan now.`,
        { type: 'status' },
      ),
    ])

    try {
      const program = await programService.generateProgram(nextProfile)
      setMessages([createMessage('assistant', program, { type: 'program' })])
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to generate the program.')
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage(text, meta = {}) {
    const userMessage = createMessage('user', text, { type: 'request', label: meta.label || text })
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setError('')
    setIsLoading(true)

    try {
      const response = await programService.sendMessage(messages, text)
      setMessages([...nextMessages, createMessage('assistant', response, { type: 'result', label: meta.label || text })])
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to send this message.')
    } finally {
      setIsLoading(false)
    }
  }

  async function analyzeMedia(mediaPayload) {
    const label = mediaPayload.type === 'video' ? `Analyze video: ${mediaPayload.name}` : `Analyze image: ${mediaPayload.name}`
    const userMessage = createMessage('user', label, { type: 'media', mediaName: mediaPayload.name })
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setError('')
    setIsLoading(true)

    try {
      const response = await programService.analyzeMedia(messages, mediaPayload)
      setMessages([...nextMessages, createMessage('assistant', response, { type: 'analysis', label: 'Form feedback' })])
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to analyze this media.')
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setCurrentUser(null)
    applyAppState(emptyAppState())
    setMembership(null)
    setError('')
    setIsLoading(false)
    setIsProgramLoaded(false)
    navigateStage('landing')
  }

  if (isAuthLoading || (currentUser && !isProgramLoaded)) {
    return (
      <Landing
        user={currentUser}
        hasProgram={false}
        onStart={() => navigateStage('assessment')}
        onDashboard={() => navigateStage('chat')}
        onSignOut={signOut}
      />
    )
  }

  if (stage === 'chat') {
    return (
      <Chat
        user={currentUser}
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
      />
    )
  }

  if (stage === 'account') {
    if (!isSupabaseConfigured) {
      return <MissingSupabaseGate onBack={() => navigateStage('membership')} onHome={goHome} />
    }

    return <AccountGate onBack={() => navigateStage('membership')} onHome={goHome} onAuthenticated={handleAuthenticated} />
  }

  if (stage === 'assessment') {
    return (
      <Onboarding
        initialProfile={profileDraft}
        onProfileChange={saveProfileDraft}
        onComplete={prepareMembership}
        onHome={goHome}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  if (stage === 'landing') {
    return (
      <Landing
        user={currentUser}
        hasProgram={messages.some((message) => message.meta?.type === 'program')}
        onStart={() => navigateStage('assessment')}
        onDashboard={() => navigateStage('chat')}
        onSignOut={signOut}
      />
    )
  }

  if (stage === 'membership') {
    return (
      <MembershipGate
        user={currentUser}
        profile={profileDraft || profile}
        selectedPlan={selectedPlan}
        selectedBilling={selectedBilling}
        onSelectPlan={setSelectedPlan}
        onSelectBilling={setSelectedBilling}
        onCreateAccount={startAccountCreation}
        onCheckout={startCheckout}
        onGeneratePlan={generateProgram}
        hasActiveMembership={membershipIsActive(membership)}
        isLoading={isLoading}
        onBack={() => navigateStage('assessment')}
        onHome={goHome}
        error={error}
      />
    )
  }

  return (
    <Onboarding
      initialProfile={profileDraft}
      onProfileChange={saveProfileDraft}
      onComplete={prepareMembership}
      onHome={goHome}
      isLoading={isLoading}
      error={error}
    />
  )
}

export default App
