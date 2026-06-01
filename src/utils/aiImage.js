const cache = new Map()

function buildUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux`
}

export function getCached(prompt) {
  return cache.get(prompt) ?? null
}

export function prefetchImages(prompts) {
  ;[...new Set(prompts)]
    .filter((p) => p && !cache.has(p))
    .forEach((p) => cache.set(p, buildUrl(p)))
}

export async function generateAiImage(prompt) {
  if (!prompt) return null
  const cached = cache.get(prompt)
  if (cached !== undefined) return cached
  const url = buildUrl(prompt)
  cache.set(prompt, url)
  return url
}
