const cache = new Map()
const inflight = new Map()

function getEdgeFunctionUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/generate-image`
}

// Prompts are encoded as "type::query" so the edge function can route to the
// right image source (exercise demo database vs food image search).
export function exercisePrompt(name) {
  return `exercise::${String(name || '').trim()}`
}

// Build a clean food search query from a meal's ingredient details, dropping
// quantities, units, and the busy-day substitution so the search matches the
// actual dish (e.g. "scrambled eggs spinach") instead of the label.
export function mealQuery(details) {
  let s = String(details || '')
  s = s.split(/busy day/i)[0]
  s = s.split('.')[0]
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/\b\d+(\.\d+)?\b/g, ' ')
  s = s.replace(/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|ounces?|oz|slices?|scoops?|grams?|g|lbs?|pounds?|handfuls?|pieces?|cans?|servings?|cloves?)\b/gi, ' ')
  s = s.replace(/\bwith\b|\band\b|\bof\b/gi, ' ')
  s = s.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  return s.split(' ').slice(0, 4).join(' ')
}

export function mealPrompt(title, details) {
  return `meal::${mealQuery(details)}`
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

  const sep = prompt.indexOf('::')
  const type = sep > -1 ? prompt.slice(0, sep) : 'meal'
  const query = sep > -1 ? prompt.slice(sep + 2) : prompt

  const promise = (async () => {
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ type, query }),
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
const MEAL_LINE = /^,?\s*((?:Breakfast|Lunch|Dinner|Snack|Pre Workout|Post Workout)[^:]{0,30}?)\s*:?\s*(.*)$/i

export async function waitForProgramImages(text) {
  if (!text) return
  const prompts = []
  for (const line of text.split('\n')) {
    const ex = line.match(EXERCISE_LINE)
    if (ex) prompts.push(exercisePrompt(ex[1].trim()))
    const meal = line.match(MEAL_LINE)
    if (meal && meal[2].trim()) prompts.push(mealPrompt(meal[1].trim(), meal[2].trim()))
  }
  await Promise.all([...new Set(prompts)].map((p) => generateAiImage(p)))
}
