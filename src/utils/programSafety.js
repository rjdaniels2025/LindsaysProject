// Conservative contraindication audit. Matches keywords in the client's free-text limitations
// field, then flags any generated exercise whose name matches a risky pattern for that
// limitation. Kept intentionally narrow to avoid false positives — this is a safety net behind
// the injury-aware generation prompt, not a substitute for professional judgment.

const RULES = [
  {
    limitation: /lower back|low back|\bback\b|herniat|disc|sciatic|lumbar/i,
    label: 'lower back',
    risky: /deadlift|good morning|barbell row|bent ?over row|back squat|barbell squat|sit ?up|russian twist|leg press|power clean|hyperextension/i,
    suggestion: 'try hip thrusts, goblet box squats, chest-supported rows, or glute bridges instead',
  },
  {
    limitation: /knee|acl|mcl|meniscus|patell/i,
    label: 'knee',
    risky: /deep squat|lunge|jump|box jump|leg extension|pistol|step ?up|burpee/i,
    suggestion: 'try box squats to a comfortable depth, leg press in a pain-free range, or glute bridges instead',
  },
  {
    limitation: /shoulder|rotator cuff|labrum|impingement/i,
    label: 'shoulder',
    risky: /overhead press|military press|behind (the )?neck|upright row|\bdips?\b|push press|snatch/i,
    suggestion: 'try neutral-grip dumbbell presses, landmine presses, or cable work in a pain-free range instead',
  },
  {
    limitation: /wrist|carpal/i,
    label: 'wrist',
    risky: /push ?up|front squat|barbell curl|clean/i,
    suggestion: 'use dumbbells, neutral grips, or push-up handles to keep the wrist neutral',
  },
  {
    limitation: /neck|cervical/i,
    label: 'neck',
    risky: /behind (the )?neck|upright row|barbell shrug|sit ?up/i,
    suggestion: 'use supported alternatives that do not load the neck',
  },
]

// Exercise lines come in several shapes depending on how the model wrote the
// program:
//   "Goblet Box Squat: Warmup: 25 lbs x 10, Sets: 4, Reps: 10 to 12, ..."
//   "1. High box squat to comfortable depth: Week 1, 4 sets of 10. ..."
//   "Superset A1 Dumbbell Squeeze Press: Warmup: none, Sets: 3, ..."
// This once required "Sets:" to follow the exercise name immediately, which
// matched none of them — so the audit silently never flagged anything for
// anybody. Identify the exercise the same way the dashboard does instead:
// a line carrying training detail, named by the text before its first colon.
const DETAIL_HINT = /\bsets?\b|\breps?\b|\brest\b|\btempo\b|\bcue\b|\brpe\b|\brir\b/i
const NOT_AN_EXERCISE = /^(workout|session|day|week|warm ?up|cool ?down|note|focus|rest|progression|goal|tip|meal|nutrition)\b/i

function exerciseNameFrom(line) {
  // Exercise lines always name the movement before a colon; prose guidance
  // ("Sets and reps stay the same for all 4 weeks.") does not.
  if (!line.includes(':')) return ''
  const stripped = line
    .replace(/^[,\s]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^superset\s*[A-Z]?\d?\s*[,:]?\s*/i, '')
    .trim()
  const name = stripped.split(':')[0]?.trim()
  if (!name || name.length < 3 || name.length > 60) return ''
  if (!/[A-Za-z]/.test(name)) return ''
  if (NOT_AN_EXERCISE.test(name)) return ''
  return name
}

// The program text has already been through sanitizeCopy, which turns every
// hyphen into ", " — so "Push-Up" arrives as "Push, Up" and a pattern like
// /push ?up/ would never match it. Match against a comma-flattened name.
function matchable(name) {
  return name.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
}

export function auditProgram(text, limitations) {
  const lim = String(limitations || '').trim()
  if (!lim || /^(none|n\/?a|no|nope|n\/a)\b/i.test(lim)) return []

  const active = RULES.filter((rule) => rule.limitation.test(lim))
  if (!active.length) return []

  const flags = []
  const seen = new Set()
  for (const rawLine of String(text || '').split('\n')) {
    const line = rawLine.trim()
    if (!DETAIL_HINT.test(line)) continue
    const name = exerciseNameFrom(line)
    if (!name) continue
    const testable = matchable(name)
    for (const rule of active) {
      if (rule.risky.test(testable)) {
        const key = `${name.toLowerCase()}|${rule.label}`
        if (seen.has(key)) continue
        seen.add(key)
        flags.push({ exercise: name, limitation: rule.label, suggestion: rule.suggestion })
      }
    }
  }
  return flags
}
