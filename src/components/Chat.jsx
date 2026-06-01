import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Camera, Sparkles, Target, X } from 'lucide-react'
import ProgramDashboard from './ProgramDashboard.jsx'
import { FormattedMessage } from '../utils/formatMessage.jsx'

const quickReplies = [
  { label: 'Food before workout', prompt: 'Explain what I should eat before workouts in simple steps.' },
  { label: 'Adjust for soreness', prompt: 'Adjust my plan for soreness and explain what to do today.' },
]
const MAX_MEDIA_SIZE = 20 * 1024 * 1024

function formatGoals(primaryGoal) {
  return Array.isArray(primaryGoal) ? primaryGoal.join(', ') : primaryGoal
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${dot * 150}ms` }} />
      ))}
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Unable to read media file.'))
    reader.readAsDataURL(file)
  })
}

function captureFrame(video, canvas, time) {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      try {
        const context = canvas.getContext('2d')
        canvas.width = Math.min(video.videoWidth, 1280)
        canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight)
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
      } catch (error) {
        reject(error)
      }
    }

    video.addEventListener('seeked', handleSeeked, { once: true })
    video.currentTime = time
  })
}

async function extractVideoFrames(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  const canvas = document.createElement('canvas')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = url

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve
      video.onerror = () => reject(new Error('Unable to load video metadata.'))
    })

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
    const count = Math.min(6, Math.max(3, Math.floor(duration / 2) || 3))
    const times = Array.from({ length: count }, (_, index) => ((index + 1) / (count + 1)) * duration)
    const frames = []

    for (const time of times) {
      frames.push(await captureFrame(video, canvas, Math.max(0, Math.min(time, duration - 0.1))))
    }

    return frames
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function Chat({
  user,
  profile,
  messages,
  programCreatedAt,
  programEndsAt,
  isLoading,
  error,
  onSendMessage,
  onAnalyzeMedia,
  onSignOut,
  onHome,
  onRetry,
}) {
  const [media, setMedia] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const [isPreparingMedia, setIsPreparingMedia] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const fileInputRef = useRef(null)

  const subtitle = useMemo(() => {
    const goals = formatGoals(profile?.primaryGoal)
    if (!profile?.name || !goals) return 'Personal training support'
    return `${profile.name}, ${goals}`
  }, [profile])

  const programMessage = messages.find((message) => message.meta?.type === 'program')
  const statusMessage = messages.find((message) => message.meta?.type === 'status')
  const latestResult = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && !['program', 'status'].includes(message.meta?.type))
  const statusCopy = statusMessage?.content?.replace(/^#+\s*/gm, '') ||
    `${user?.name || 'Your'} answers are being turned into workouts, recovery steps, and progress goals.`
  const planDates = useMemo(() => {
    if (!programCreatedAt || !programEndsAt) return ''
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${formatter.format(new Date(programCreatedAt))} to ${formatter.format(new Date(programEndsAt))}`
  }, [programCreatedAt, programEndsAt])

  async function runAction(action) {
    if (isLoading) return
    setPendingAction(action.label)
    try {
      await onSendMessage(action.prompt, { label: action.label })
    } finally {
      setPendingAction('')
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setMediaError('')
    if (!file) return

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setMediaError('Upload an exercise image or video file.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setMedia({
      file,
      previewUrl,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      mimeType: file.type,
      name: file.name,
      size: file.size,
    })

    if (file.size > MAX_MEDIA_SIZE) {
      setMediaError('This file is over 20MB. Use a shorter clip or compressed file before analysis.')
    }
  }

  function dismissMedia() {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
    setMedia(null)
    setMediaError('')
  }

  async function analyze() {
    if (!media || media.size > MAX_MEDIA_SIZE || isLoading || isPreparingMedia) return
    setIsPreparingMedia(true)
    setMediaError('')

    try {
      const payload =
        media.type === 'video'
          ? { ...media, framesBase64: await extractVideoFrames(media.file) }
          : { ...media, base64: await fileToBase64(media.file) }
      dismissMedia()
      await onAnalyzeMedia(payload)
    } catch (caughtError) {
      setMediaError(caughtError.message || 'Unable to prepare media for analysis.')
    } finally {
      setIsPreparingMedia(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg text-body">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto grid max-w-6xl gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-balance font-heading text-2xl uppercase leading-none text-white min-[420px]:text-3xl sm:text-5xl">Elevate Health and Fitness</h1>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-body sm:text-sm sm:tracking-[0.16em]">{subtitle}</p>
            {planDates ? <p className="mt-1 text-xs uppercase tracking-[0.12em] text-accent">{planDates}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              onClick={onHome}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 font-heading text-base uppercase text-white transition hover:border-accent sm:px-4 sm:text-lg"
            >
              <ArrowLeft size={17} />
              Home
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-11 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 font-heading text-base uppercase text-white transition hover:border-accent sm:px-4 sm:text-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="px-2 py-3 sm:px-6 sm:py-6">
        <div className="mx-auto grid max-w-7xl gap-4 sm:gap-5 xl:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            {programMessage ? (
              <ProgramDashboard
                message={programMessage}
                profile={profile}
                programCreatedAt={programCreatedAt}
                onQuickAction={runAction}
                pendingAction={pendingAction}
                isLoading={isLoading}
              />
            ) : (
              <div className="rounded-lg border border-line bg-card p-4 shadow-2xl shadow-black/30 sm:p-6">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                  <Sparkles size={15} />
                  <span className="font-heading text-sm uppercase">Building Your Plan</span>
                </div>
                <h2 className="font-heading text-3xl uppercase leading-none text-white sm:text-5xl">Lindsay is making your plan</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-body sm:text-base">
                  {statusCopy}
                </p>
                {error && !isLoading ? (
                  <div className="mt-6 space-y-3">
                    <p className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
                    {onRetry ? (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="min-h-11 rounded-lg bg-accent px-5 font-heading text-lg uppercase text-black transition hover:bg-white"
                      >
                        Try Again
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-6">
                    <LoadingDots />
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="grid content-start gap-3 sm:gap-4 xl:sticky xl:top-24">
            <section className="rounded-lg border border-line bg-card p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded bg-accent text-black">
                  <Target size={18} />
                </div>
                <div>
                  <p className="font-heading text-xl uppercase text-white">Next Moves</p>
                  <p className="text-sm text-body">Tap one to get a simple answer.</p>
                </div>
              </div>
              <div className="grid gap-2 min-[420px]:grid-cols-2 xl:grid-cols-1">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.label}
                    type="button"
                    disabled={isLoading}
                    onClick={() => runAction(reply)}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line bg-[#111] p-3 text-left text-sm text-white transition hover:border-accent disabled:opacity-50"
                  >
                    <span>{reply.label}</span>
                    {pendingAction === reply.label ? <LoadingDots /> : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-line bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-xl uppercase text-white">Form Check</p>
                  <p className="text-sm text-body">Upload a lift video or photo for form feedback.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white transition hover:border-accent"
                  aria-label="Upload exercise media"
                  title="Upload exercise media"
                >
                  <Camera size={20} />
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

              {media ? (
                <div className="rounded-lg border border-line bg-[#111] p-3">
                  <div className="mb-3 aspect-video overflow-hidden rounded border border-line bg-black">
                    {media.type === 'video' ? (
                      <video src={media.previewUrl} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      <img src={media.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{media.name}</p>
                      <p className="text-xs text-body">{(media.size / 1024 / 1024).toFixed(1)}MB</p>
                    </div>
                    <button type="button" onClick={dismissMedia} className="rounded border border-line p-2 text-white hover:border-accent">
                      <X size={16} />
                    </button>
                  </div>
                  {mediaError ? <p className="mb-3 text-sm text-red-300">{mediaError}</p> : null}
                  <button
                    type="button"
                    disabled={media.size > MAX_MEDIA_SIZE || isLoading || isPreparingMedia}
                    onClick={analyze}
                    className="w-full rounded-lg bg-accent px-4 py-2 font-heading text-lg uppercase text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPreparingMedia ? 'Preparing' : 'Check Form'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-line bg-[#111] p-5 text-center text-sm text-body transition hover:border-accent hover:text-white"
                >
                  Add exercise media
                </button>
              )}
              {!media && mediaError ? <p className="mt-3 text-sm text-red-300">{mediaError}</p> : null}
            </section>

            {(isLoading || latestResult || error) ? (
              <section className="rounded-lg border border-line bg-card p-4">
                <p className="mb-1 font-heading text-xl uppercase text-white">
                  {latestResult?.meta?.type === 'analysis' ? 'Form Feedback' : 'Your Result'}
                </p>
                {latestResult?.meta?.label ? <p className="mb-3 text-sm text-body">{latestResult.meta.label}</p> : null}
                {isLoading ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-line bg-[#111] p-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <span className="text-sm text-body">{pendingAction ? `Working on ${pendingAction}` : 'Lindsay is working on it...'}</span>
                    <LoadingDots />
                  </div>
                ) : null}
                {!isLoading && latestResult ? (
                  <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-line bg-[#111] p-3">
                    <FormattedMessage content={latestResult.content} />
                  </div>
                ) : null}
                {error ? <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  )
}
