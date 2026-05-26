import { useCallback, useEffect, useState } from 'react'
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

function userFromSession(session) {
  const user = session?.user
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
  }
}

function LoadingScreen({ label = 'Loading your dashboard' }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <div className="w-full max-w-md rounded-lg border border-line bg-card p-6 text-center shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 font-heading text-5xl uppercase leading-none text-white">{label}</h1>
        <div className="mx-auto mt-6 flex justify-center gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-3 w-3 animate-pulse rounded-full bg-accent"
              style={{ animationDelay: `${dot * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

function ConfigError() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <div className="w-full max-w-md rounded-lg border border-red-400/40 bg-card p-6 shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 font-heading text-5xl uppercase leading-none text-white">Supabase Setup Needed</h1>
        <p className="mt-3 text-sm leading-6 text-body">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the app environment before users can create accounts.
        </p>
      </div>
    </main>
  )
}

function AccountGate({ onBack, onAuthenticated }) {
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
      const result = isCreating
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

      if (result.error) {
        setError(result.error.message)
        return
      }

      if (result.data.session) {
        onAuthenticated?.()
      }

      if (isCreating && !result.data.session) {
        setMessage('Account created. Check your email to confirm your account, then log in.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-card p-6 shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 font-heading text-5xl uppercase leading-none text-white">
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
      </form>
    </main>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [stage, setStage] = useState('landing')
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [profileDraft, setProfileDraft] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('transformation')
  const [selectedBilling, setSelectedBilling] = useState('monthly')
  const [programCreatedAt, setProgramCreatedAt] = useState(null)
  const [programEndsAt, setProgramEndsAt] = useState(null)
  const [returnToMembershipAfterAuth, setReturnToMembershipAfterAuth] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isProgramLoaded, setIsProgramLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const programService = useProgramService()

  const applyAppState = useCallback((nextState) => {
    setStage(nextState.stage)
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
        setStage('membership')
        setProfile(profileDraft)
        setProfileDraft(profileDraft)
        setReturnToMembershipAfterAuth(false)
      }
      if (data?.display_name && data.display_name !== nextUser.name) {
        setCurrentUser({ ...nextUser, name: data.display_name })
      }
    }

    setIsProgramLoaded(true)
    setIsAuthLoading(false)
  }, [applyAppState, profileDraft, returnToMembershipAfterAuth])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      loadUserProgram(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      loadUserProgram(session)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadUserProgram])

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
    setStage('membership')
  }, [])

  function startAccountCreation() {
    setError('')
    if (!isSupabaseConfigured) {
      setError('Account creation is the next backend step. Once Supabase is connected, this button will create or log into the member account.')
      return
    }
    setReturnToMembershipAfterAuth(true)
    setStage('account')
  }

  function handleAuthenticated() {
    setReturnToMembershipAfterAuth(false)
    setStage(profileDraft ? 'membership' : 'landing')
  }

  async function generateProgram() {
    const nextProfile = profileDraft || profile

    if (!currentUser) {
      startAccountCreation()
      return
    }

    if (!nextProfile) {
      setError('Complete the questionnaire before generating your plan.')
      setStage('onboarding')
      return
    }

    const createdAt = new Date().toISOString()
    setError('')
    setIsLoading(true)
    setProfile(nextProfile)
    setProfileDraft(nextProfile)
    setProgramCreatedAt(createdAt)
    setProgramEndsAt(addWeeks(createdAt, 8))
    setStage('chat')
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
    setError('')
    setIsLoading(false)
    setIsProgramLoaded(false)
  }

  if (isAuthLoading) {
    return <LoadingScreen />
  }

  if (currentUser && !isProgramLoaded) {
    return <LoadingScreen label="Loading your plan" />
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
      />
    )
  }

  if (stage === 'account') {
    if (!isSupabaseConfigured) {
      return <ConfigError />
    }

    return <AccountGate onBack={() => setStage('membership')} onAuthenticated={handleAuthenticated} />
  }

  if (stage === 'landing') {
    return (
      <Landing
        user={currentUser}
        hasProgram={messages.some((message) => message.meta?.type === 'program')}
        onStart={() => setStage('onboarding')}
        onDashboard={() => setStage('chat')}
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
        onGeneratePlan={generateProgram}
        onBack={() => setStage('onboarding')}
        error={error}
      />
    )
  }

  return (
    <Onboarding
      initialProfile={profileDraft}
      onProfileChange={saveProfileDraft}
      onComplete={prepareMembership}
      isLoading={isLoading}
      error={error}
    />
  )
}

export default App
