const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const EXERCISE_DB_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json'
const EXERCISE_IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'

// Module-level cache survives across warm invocations on the same instance.
let exerciseDb: Array<{ name: string; images: string[] }> | null = null
let exerciseTokens: Array<{ tokens: string[]; joined: string; image: string; len: number }> | null = null

function normalize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
}

async function getExerciseIndex() {
  if (exerciseTokens) return exerciseTokens
  const res = await fetch(EXERCISE_DB_URL)
  exerciseDb = await res.json()
  exerciseTokens = (exerciseDb || [])
    .filter((e) => e.images && e.images.length)
    .map((e) => {
      const tokens = normalize(e.name)
      return { tokens, joined: tokens.join(''), image: EXERCISE_IMG_BASE + e.images[0], len: tokens.length }
    })
  return exerciseTokens
}

function tokenMatch(q: string, n: string): boolean {
  const qs = q.replace(/s$/, '')
  const ns = n.replace(/s$/, '')
  return q === n || qs === ns || n.startsWith(q) || q.startsWith(n)
}

async function matchExercise(query: string): Promise<string | null> {
  const qTokens = normalize(query)
  if (!qTokens.length) return null
  const qJoined = qTokens.join('')
  const index = await getExerciseIndex()

  let best: string | null = null
  let bestScore = 0
  let bestLen = Infinity

  for (const entry of index) {
    let matched = 0
    for (const qt of qTokens) {
      if (entry.tokens.some((nt) => tokenMatch(qt, nt))) matched++
    }
    if (!matched) continue
    let score = matched * 2 + matched / entry.len
    if (entry.joined === qJoined) score += 100
    if (score > bestScore || (score === bestScore && entry.len < bestLen)) {
      best = entry.image
      bestScore = score
      bestLen = entry.len
    }
  }
  return best
}

async function searchMealDb(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`)
    const data = await res.json()
    const meal = data?.meals?.[0]
    return meal?.strMealThumb || null
  } catch {
    return null
  }
}

async function searchPexels(query: string): Promise<string | null> {
  const apiKey = Deno.env.get('PEXELS_API_KEY')
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photos: Array<{ src: { large2x: string; large: string; medium: string } }> = data?.photos ?? []
    if (!photos.length) return null
    const photo = photos[Math.floor(Math.random() * photos.length)]
    return photo.src?.large2x || photo.src?.large || photo.src?.medium || null
  } catch {
    return null
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const body = await request.json()
    const type: string = body?.type || 'meal'
    const query: string = (body?.query || '').toString().trim()

    if (!query) return jsonResponse({ url: null })

    if (type === 'exercise') {
      const dbImage = await matchExercise(query)
      if (dbImage) return jsonResponse({ url: dbImage })
      const fallback = await searchPexels(`${query} exercise gym`)
      return jsonResponse({ url: fallback })
    }

    // meal
    const mealImage = await searchMealDb(query)
    if (mealImage) return jsonResponse({ url: mealImage })
    const fallback = await searchPexels(`${query} food meal`)
    return jsonResponse({ url: fallback })
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err)
    return jsonResponse({ error: 'Unexpected server error.' }, 500)
  }
})
