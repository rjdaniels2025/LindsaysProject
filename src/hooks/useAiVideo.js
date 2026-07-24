import { useEffect, useState } from 'react'
import { requestExerciseVideo, peekVideoCache } from '../utils/aiVideo.js'

// status: 'idle' | 'generating' | 'ready' | 'failed'
// `enabled` gates the request so a video is only fetched/generated once the
// user actually asks for it (opening the demonstration modal), never eagerly
// for every exercise on screen. Callers should remount per exercise (key by
// name) so a previous exercise's outcome never bleeds into the next.
export function useAiVideo(name, enabled) {
  const [outcome, setOutcome] = useState(() => {
    const cached = name ? peekVideoCache(name) : undefined
    return cached === undefined ? null : { url: cached }
  })

  useEffect(() => {
    if (!name || !enabled || peekVideoCache(name) !== undefined) return

    let cancelled = false
    requestExerciseVideo(name, () => !cancelled).then((url) => {
      if (!cancelled) setOutcome({ url })
    })

    return () => {
      cancelled = true
    }
  }, [name, enabled])

  if (!name || !enabled) return { url: null, status: 'idle' }
  if (!outcome) return { url: null, status: 'generating' }
  return outcome.url ? { url: outcome.url, status: 'ready' } : { url: null, status: 'failed' }
}
