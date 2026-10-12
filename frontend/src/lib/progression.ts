import type { SetEntry } from '@/types'

interface SuggestNextInput {
  lastSets: SetEntry[]
  repLow: number
  repHigh: number
  incrementKg: number
  roundingKg: number
  trigger: 'all_sets' | 'last_set'
}

export interface Suggestion {
  weightKg: number | null
  reps: number
  reason: string
}

// "16, 16, 14" -- what was really logged, so the reason never claims a rep
// count the user did not do.
const repsList = (sets: SetEntry[]) => sets.map((s) => s.reps).join(', ')

// Double Progression (CLAUDE.md §8): +increment once the rep-range ceiling
// is hit (trigger decides "all working sets" vs "just the last one"),
// otherwise same weight and work the reps up towards the ceiling. Pure and
// offline-tolerant by design -- callers pass in whatever last-session data
// they already have (empty when offline, see TrackingPage).
export function suggestNext(input: SuggestNextInput): Suggestion {
  const { lastSets, repLow, repHigh, incrementKg, roundingKg, trigger } = input
  const workingSets = lastSets.filter((s) => !s.is_warmup)

  if (workingSets.length === 0) {
    return { weightKg: null, reps: repLow, reason: 'First time logging this exercise — enter your starting weight.' }
  }

  const hitTop = (s: SetEntry) => s.reps >= repHigh
  const triggerMet = trigger === 'all_sets' ? workingSets.every(hitTop) : hitTop(workingSets[workingSets.length - 1])
  const lastWeight = workingSets[workingSets.length - 1].weight_kg

  if (triggerMet) {
    const rawWeight = lastWeight + incrementKg
    const weightKg = roundingKg > 0 ? Math.round(rawWeight / roundingKg) * roundingKg : rawWeight
    const logged = trigger === 'all_sets' ? `${repsList(workingSets)} reps` : `${workingSets[workingSets.length - 1].reps} reps on the last set`
    return {
      weightKg,
      reps: repLow,
      reason: `Last time ${logged} (top of range: ${repHigh}) — try +${incrementKg}kg.`,
    }
  }

  return {
    weightKg: lastWeight,
    reps: repHigh,
    reason: `Last time ${repsList(workingSets)} reps — same weight, work up to ${repHigh}.`,
  }
}
