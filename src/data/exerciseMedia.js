const fallbackMedia = {
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80',
  label: 'guided strength training',
}

const exerciseMedia = [
  {
    keys: ['goblet squat', 'front squat', 'back squat', 'squat'],
    image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
    label: 'squat exercise demonstration',
  },
  {
    keys: ['reverse lunge', 'walking lunge', 'lunge', 'split squat'],
    image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80',
    label: 'lower body lunge exercise',
  },
  {
    keys: ['romanian deadlift', 'deadlift', 'hip hinge', 'good morning'],
    image: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=80',
    label: 'weighted hip hinge exercise',
  },
  {
    keys: ['glute bridge', 'hip thrust', 'bridge'],
    image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?auto=format&fit=crop&w=900&q=80',
    label: 'glute bridge exercise setup',
  },
  {
    keys: ['push up', 'pushup', 'press up'],
    image: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80',
    label: 'push up exercise demonstration',
  },
  {
    keys: ['bench press', 'chest press', 'floor press', 'dumbbell press'],
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80',
    label: 'chest press strength exercise',
  },
  {
    keys: ['shoulder press', 'overhead press', 'military press'],
    image: 'https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=900&q=80',
    label: 'overhead press exercise',
  },
  {
    keys: ['bent over row', 'dumbbell row', 'row', 'seated row'],
    image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=900&q=80',
    label: 'back row exercise',
  },
  {
    keys: ['lat pulldown', 'pull up', 'pullup', 'chin up'],
    image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?auto=format&fit=crop&w=900&q=80',
    label: 'upper body pulling exercise',
  },
  {
    keys: ['plank', 'side plank', 'bear plank'],
    image: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=900&q=80',
    label: 'plank core exercise',
  },
  {
    keys: ['dead bug', 'crunch', 'sit up', 'hollow hold', 'core'],
    image: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=900&q=80',
    label: 'core exercise demonstration',
  },
  {
    keys: ['biceps curl', 'curl', 'hammer curl'],
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80',
    label: 'dumbbell curl exercise',
  },
  {
    keys: ['triceps extension', 'tricep extension', 'triceps pushdown', 'dip'],
    image: 'https://images.unsplash.com/photo-1584863231364-2edc166de576?auto=format&fit=crop&w=900&q=80',
    label: 'triceps strength exercise',
  },
  {
    keys: ['burpee', 'mountain climber', 'high knees', 'jumping jack'],
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    label: 'conditioning exercise',
  },
  {
    keys: ['walk', 'jog', 'run', 'running', 'treadmill'],
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
    label: 'cardio running workout',
  },
  {
    keys: ['stretch', 'mobility', 'yoga', 'cooldown', 'warmup'],
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80',
    label: 'mobility and stretching exercise',
  },
]

function normalizeExerciseName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(alternating|assisted|banded|bodyweight|cable|dumbbell|kettlebell|machine|single arm|single leg)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getExerciseMedia(name) {
  const normalized = normalizeExerciseName(name || '')
  const match = exerciseMedia.find((item) => item.keys.some((key) => normalized.includes(key)))

  return match || fallbackMedia
}
