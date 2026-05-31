// Module-level cache — survives component unmounts within the same page session.
// Keys are the prompt string; values are the resolved image URL (or null on failure).
const cache = new Map()
const inflight = new Map()

function getEdgeFunctionUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/generate-image`
}

export function getCached(prompt) {
  return cache.get(prompt) ?? null
}

export async function prefetchImages(prompts) {
  const needed = [...new Set(prompts)].filter((p) => p && !cache.has(p) && !inflight.has(p))
  const BATCH = 3
  for (let i = 0; i < needed.length; i += BATCH) {
    await Promise.allSettled(needed.slice(i, i + BATCH).map(generateAiImage))
    if (i + BATCH < needed.length) await new Promise((r) => setTimeout(r, 1000))
  }
}

export async function generateAiImage(prompt) {
  if (!prompt) return null

  const hit = cache.get(prompt)
  if (hit !== undefined) return hit

  // Return the existing in-flight promise so concurrent callers share one request
  if (inflight.has(prompt)) return inflight.get(prompt)

  const edgeFunctionUrl = getEdgeFunctionUrl()
  if (!edgeFunctionUrl) return null

  const promise = (async () => {
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ prompt }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('[aiImage] Edge function error', response.status, data?.error)
        cache.set(prompt, null)
        return null
      }
      const url = data?.url ?? null
      if (!url) console.error('[aiImage] No URL in response:', data)
      cache.set(prompt, url)
      return url
    } catch (err) {
      console.error('[aiImage] Fetch failed:', err)
      cache.set(prompt, null)
      return null
    } finally {
      inflight.delete(prompt)
    }
  })()

  inflight.set(prompt, promise)
  return promise
}
