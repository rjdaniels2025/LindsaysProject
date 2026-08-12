// The one place an exercise name becomes a cache key.
//
// Uploaded videos and member lookups meet here and nowhere else. Both video
// functions used to carry their own private copy of this, which is how ten of
// the coach's twelve uploads ended up connected to nothing: she typed "Seated
// Leg Curls", the program said "Seated Leg Curl", the strings differed by one
// character and the video was silently orphaned.
//
// Anything added here must be a difference that CANNOT change which movement is
// meant. Plurals qualify. Loose fuzzy matching does not: "Cable Kickbacks" is a
// near-match for both "Cable Triceps Kickback" and "Cable Glute Kickback", and
// guessing wrong would show a client the wrong muscle group with nobody the
// wiser. Ambiguous names are left unmatched on purpose, for the coach to relink.

// Misspellings seen in real uploads. Deliberately explicit rather than a
// general spellchecker, so it can never invent a correction nobody intended.
const SPELLING_ALIASES: Record<string, string> = {
  dumbell: 'dumbbell',
  dumbells: 'dumbbell',
  dumbbells: 'dumbbell',
  barbells: 'barbell',
  bicep: 'biceps',
  tricep: 'triceps',
}

// Words whose trailing "s" is part of the word, not a plural.
const NOT_PLURAL = new Set([
  'press',
  'cross',
  'triceps',
  'biceps',
  'abs',
  'lats',
  'glutes',
  'calves',
  'hamstrings',
  'quads',
  'plus',
  'kickass',
])

function singularize(token: string): string {
  if (NOT_PLURAL.has(token)) return token
  if (token.length > 3 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('ses')) return token.slice(0, -2)
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

export function exerciseKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => singularize(SPELLING_ALIASES[token] || token))
    .join(' ')
}
