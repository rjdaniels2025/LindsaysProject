import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Send, X } from 'lucide-react'
import MessageBubble from './MessageBubble.jsx'

const quickReplies = ['Show Week 2 workouts', 'Pre-workout nutrition', 'How to track progress', 'Adjust for soreness']
const MAX_MEDIA_SIZE = 20 * 1024 * 1024

function LoadingDots() {
  return (
    <div className="mr-auto flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-4">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent"
          style={{ animationDelay: `${dot * 150}ms` }}
        />
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
  profile,
  messages,
  isLoading,
  error,
  onSendMessage,
  onAnalyzeMedia,
  onReset,
}) {
  const [draft, setDraft] = useState('')
  const [media, setMedia] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const [isPreparingMedia, setIsPreparingMedia] = useState(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading, error])

  const subtitle = useMemo(() => {
    if (!profile?.name || !profile?.primaryGoal) return 'Personal training intelligence'
    return `${profile.name} / ${profile.primaryGoal}`
  }, [profile])

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

  async function submitMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isLoading) return
    setDraft('')
    await onSendMessage(text)
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
    <main className="flex h-screen flex-col bg-bg text-body">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl uppercase leading-none text-white sm:text-5xl">Apex Fitness AI</h1>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-body">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 font-heading text-lg uppercase text-white transition hover:border-accent"
          >
            Reset
          </button>
        </div>
      </header>

      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-40">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading ? <LoadingDots /> : null}
          {error ? <div className="mr-auto rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                disabled={isLoading}
                onClick={() => onSendMessage(reply)}
                className="shrink-0 rounded-full border border-line bg-[#111] px-4 py-2 text-sm text-white transition hover:border-accent disabled:opacity-50"
              >
                {reply}
              </button>
            ))}
          </div>

          {media ? (
            <div className="mb-3 rounded-lg border border-line bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="h-20 w-28 overflow-hidden rounded border border-line bg-black">
                  {media.type === 'video' ? (
                    <video src={media.previewUrl} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={media.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{media.name}</p>
                  <p className="text-xs text-body">{(media.size / 1024 / 1024).toFixed(1)}MB</p>
                  {mediaError ? <p className="mt-2 text-sm text-red-300">{mediaError}</p> : null}
                </div>
                <button type="button" onClick={dismissMedia} className="rounded border border-line p-2 text-white hover:border-accent">
                  <X size={16} />
                </button>
                <button
                  type="button"
                  disabled={media.size > MAX_MEDIA_SIZE || isLoading || isPreparingMedia}
                  onClick={analyze}
                  className="rounded-lg bg-accent px-4 py-2 font-heading text-lg uppercase text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPreparingMedia ? 'Preparing' : 'Analyze'}
                </button>
              </div>
            </div>
          ) : null}

          {!media && mediaError ? <p className="mb-2 text-sm text-red-300">{mediaError}</p> : null}

          <form onSubmit={submitMessage} className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white transition hover:border-accent"
              aria-label="Upload exercise media"
              title="Upload exercise media"
            >
              <Camera size={20} />
            </button>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Ask about training, nutrition, recovery, or your program..."
              className="max-h-32 min-h-12 flex-1 resize-none rounded-lg border border-line bg-card px-4 py-3 text-white outline-none placeholder:text-[#666] focus:border-accent"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isLoading}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </main>
  )
}
