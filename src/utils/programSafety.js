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

const EXERCISE_LINE = /^([A-Za-z][\w\s()/-]{2,40}?)\s*:\s*Sets\s*:/i

export function auditProgram(text, limitations) {
  const lim = String(limitations || '').trim()
  if (!lim || /^(none|n\/?a|no|nope|n\/a)\b/i.test(lim)) return []

  const active = RULES.filter((rule) => rule.limitation.test(lim))
  if (!active.length) return []

  const flags = []
  const seen = new Set()
  for (const rawLine of String(text || '').split('\n')) {
    const line = rawLine.replace(/^,\s*/, '').trim()
    const match = line.match(EXERCISE_LINE)
    if (!match) continue
    const name = match[1].trim()
    for (const rule of active) {
      if (rule.risky.test(name)) {
        const key = `${name.toLowerCase()}|${rule.label}`
        if (seen.has(key)) continue
        seen.add(key)
        flags.push({ exercise: name, limitation: rule.label, suggestion: rule.suggestion })
      }
    }
  }
  return flags
}
