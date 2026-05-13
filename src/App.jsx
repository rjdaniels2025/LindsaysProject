import { useState } from 'react'
import Chat from './components/Chat.jsx'
import Landing from './components/Landing.jsx'
import Onboarding from './components/Onboarding.jsx'
import { useOpenAI } from './hooks/useOpenAI.js'

function createMessage(role, content, meta = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
    meta,
  }
}

function App() {
  const [stage, setStage] = useState('landing')
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const openAI = useOpenAI()

  async function generateProgram(nextProfile) {
    setError('')
    setIsLoading(true)
    setProfile(nextProfile)
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
    setError('')
    setIsLoading(false)
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

  return <Onboarding onComplete={generateProgram} isLoading={isLoading} error={error} />
}

export default App
