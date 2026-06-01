const cache = new Map()
const inflight = new Map()

function getEdgeFunctionUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/generate-image`
}

export function exercisePrompt(name) {
  return `${name} exercise`
}

export function mealPrompt(title) {
  return `${title} food`
}

export function getCached(prompt) {
  return cache.get(prompt) ?? null
}

export function prefetchImages(prompts) {
  ;[...new Set(prompts)]
    .filter((p) => p && !cache.has(p) && !inflight.has(p))
    .forEach((p) => generateAiImage(p))
}

export async function generateAiImage(prompt) {
  if (!prompt) return null

  const hit = cache.get(prompt)
  if (hit !== undefined) return hit

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
        body: JSON.stringify({ query: prompt }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('[aiImage] Edge function error', response.status, data?.error)
        cache.set(prompt, null)
        return null
      }
      const url = data?.url ?? null
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

const EXERCISE_LINE = /^([A-Za-z][\w\s()/-]{2,40}?)\s*:\s*Sets\s*:/i
const MEAL_LINE = /^((?:Breakfast|Lunch|Dinner|Snack|Pre Workout|Post Workout)[^:]{0,30})\s*:/i

export async function waitForProgramImages(text) {
  if (!text) return
  const prompts = []
  for (const line of text.split('\n')) {
    const ex = line.match(EXERCISE_LINE)
    if (ex) prompts.push(exercisePrompt(ex[1].trim()))
    const meal = line.match(MEAL_LINE)
    if (meal) prompts.push(mealPrompt(meal[1].trim()))
  }
  await Promise.all([...new Set(prompts)].map((p) => generateAiImage(p)))
}
