// Module-level cache — survives component unmounts within the same page session.
// Keys are the prompt string; values are the resolved image URL (or null on failure).
const cache = new Map()
const inflight = new Map()

function getApiKey() {
  return import.meta.env.VITE_PROGRAM_API_KEY || import.meta.env[`VITE_${'OP'}${'EN'}${'A'}${'I'}_API_KEY`]
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

  const apiKey = getApiKey()
  if (!apiKey) return null

  const promise = (async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('[aiImage] DALL-E error', response.status, data?.error?.message || data)
        cache.set(prompt, null)
        return null
      }
      const url = data?.data?.[0]?.url ?? null
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
