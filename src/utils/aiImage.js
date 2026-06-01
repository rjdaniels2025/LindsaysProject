const cache = new Map()

function buildUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux`
}

export function exercisePrompt(name) {
  return `Photorealistic fitness photograph of a skilled personal trainer performing ${name} with correct form. The full movement is clearly visible from a flattering camera angle. Modern luxury gym with commercial equipment, bright professional studio lighting, clean white walls. High-end editorial fitness photography.`
}

export function mealPrompt(title, details) {
  return `Professional food photography: ${title} — ${details.slice(0, 100)}. Beautifully plated on premium tableware, marble or light wood surface, soft natural window light from the side. Restaurant quality, sharp focus, vibrant and appetizing. Photorealistic.`
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

const EXERCISE_LINE = /^([A-Za-z][\w\s()/-]{2,40}?)\s*:\s*Sets\s*:/i
const MEAL_LINE = /^((?:Breakfast|Lunch|Dinner|Snack|Pre Workout|Post Workout)[^:]{0,30})\s*:\s*(.+)/i

export function preloadFromProgramText(text) {
  if (!text) return
  const prompts = []
  for (const line of text.split('\n')) {
    const ex = line.match(EXERCISE_LINE)
    if (ex) prompts.push(exercisePrompt(ex[1].trim()))
    const meal = line.match(MEAL_LINE)
    if (meal) prompts.push(mealPrompt(meal[1].trim(), meal[2].trim()))
  }
  ;[...new Set(prompts)].forEach((prompt) => {
    if (cache.has(prompt)) return
    const url = buildUrl(prompt)
    cache.set(prompt, url)
    const img = new Image()
    img.src = url
  })
}
