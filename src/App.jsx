import { useCallback, useEffect, useState } from 'react'
import Chat from './components/Chat.jsx'
import Landing from './components/Landing.jsx'
import Onboarding from './components/Onboarding.jsx'
import { useOpenAI } from './hooks/useOpenAI.js'

const AUTH_KEY = 'ehf-authenticated'
const STATE_KEY = 'ehf-app-state'
const DRAFT_KEY = 'ehf-onboarding-profile'
const PASSCODE = 'EHF'

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
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

function PasscodeGate({ onUnlock }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (passcode.trim().toUpperCase() !== PASSCODE) {
      setError('Enter the correct passcode.')
      return
    }

    localStorage.setItem(AUTH_KEY, 'true')
    setError('')
    onUnlock()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-card p-6 shadow-2xl shadow-black/50">
        <p className="font-heading text-lg uppercase text-accent">Elevate Health and Wellness</p>
        <h1 className="mt-2 font-heading text-5xl uppercase leading-none text-white">Testing Access</h1>
        <p className="mt-3 text-sm leading-6 text-body">Enter the passcode once. Your program and dashboard will stay saved on this browser while testing.</p>
        <label className="mt-6 block">
          <span className="mb-2 block font-heading text-lg uppercase text-white">Passcode</span>
          <input
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#666] focus:border-accent"
            placeholder="EHF"
            autoComplete="off"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button type="submit" className="mt-5 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white">
          Unlock
        </button>
      </form>
    </main>
  )
}

function App() {
  const savedState = readJson(STATE_KEY, {})
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === 'true')
  const [stage, setStage] = useState(savedState.stage || 'landing')
  const [profile, setProfile] = useState(savedState.profile || null)
  const [messages, setMessages] = useState(savedState.messages || [])
  const [profileDraft, setProfileDraft] = useState(() => readJson(DRAFT_KEY, null))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const openAI = useOpenAI()

  useEffect(() => {
    if (!isAuthenticated) return
    localStorage.setItem(STATE_KEY, JSON.stringify({ stage, profile, messages }))
  }, [isAuthenticated, stage, profile, messages])

  const saveProfileDraft = useCallback((nextProfile) => {
    setProfileDraft(nextProfile)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(nextProfile))
  }, [])

  async function generateProgram(nextProfile) {
    setError('')
    setIsLoading(true)
    setProfile(nextProfile)
    saveProfileDraft(nextProfile)
    setStage('chat')
    setMessages([
      createMessage(
        'assistant',
        `## Building ${nextProfile.name}'s program\n\nI am analyzing the assessment and generating a complete 8-week training plan now.`,
        { type: 'status' },
      ),
    ])

    try {
      const program = await openAI.generateProgram(nextProfile)
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
      const response = await openAI.sendMessage(messages, text)
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
      const response = await openAI.analyzeMedia(messages, mediaPayload)
      setMessages([...nextMessages, createMessage('assistant', response, { type: 'analysis', label: 'Form feedback' })])
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to analyze this media.')
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setStage('landing')
    setProfile(null)
    setMessages([])
    setProfileDraft(null)
    setError('')
    setIsLoading(false)
    localStorage.removeItem(STATE_KEY)
    localStorage.removeItem(DRAFT_KEY)
  }

  if (!isAuthenticated) {
    return <PasscodeGate onUnlock={() => setIsAuthenticated(true)} />
  }

  if (stage === 'chat') {
    return (
      <Chat
        profile={profile}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        onAnalyzeMedia={analyzeMedia}
        onReset={reset}
      />
    )
  }

  if (stage === 'landing') {
    return <Landing onStart={() => setStage('onboarding')} />
  }

  return (
    <Onboarding
      initialProfile={profileDraft}
      onProfileChange={saveProfileDraft}
      onComplete={generateProgram}
      isLoading={isLoading}
      error={error}
    />
  )
}

export default App
