import { useState } from 'react'
import Chat from './components/Chat.jsx'
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
  const [stage, setStage] = useState('onboarding')
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const openAI = useOpenAI()

  async function generateProgram(nextProfile) {
    setError('')
    setIsLoading(true)
    setProfile(nextProfile)

    try {
      const program = await openAI.generateProgram(nextProfile)
      setMessages([createMessage('assistant', program, { type: 'program' })])
      setStage('chat')
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to generate the program.')
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage(text) {
    const userMessage = createMessage('user', text)
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setError('')
    setIsLoading(true)

    try {
      const response = await openAI.sendMessage(messages, text)
      setMessages([...nextMessages, createMessage('assistant', response)])
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
      setMessages([...nextMessages, createMessage('assistant', response, { type: 'analysis' })])
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to analyze this media.')
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setStage('onboarding')
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

  return <Onboarding onComplete={generateProgram} isLoading={isLoading} error={error} />
}

export default App
