import { useEffect, useState } from 'react'
import { generateAiImage, getCached } from '../utils/aiImage.js'

export function useAiImage(prompt) {
  const [src, setSrc] = useState(() => (prompt ? getCached(prompt) : null))
  const [isLoading, setIsLoading] = useState(() => Boolean(prompt) && getCached(prompt) === null)

  useEffect(() => {
    if (!prompt) {
      setSrc(null)
      setIsLoading(false)
      return
    }

    const cached = getCached(prompt)
    if (cached !== null) {
      setSrc(cached)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    generateAiImage(prompt).then((url) => {
      if (!cancelled) {
        setSrc(url)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [prompt])

  return { src, isLoading }
}
