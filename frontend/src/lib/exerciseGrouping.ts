import type { ExerciseListItem } from '@/types'

// Flat, case-insensitive alphabetical order by the displayed title (#60) --
// replaces the former per-muscle grouping. `localeCompare` with base
// sensitivity ignores case (and accents), matching how a user scans a list
// for a name regardless of how they typed it.
export function sortByDisplayName(items: ExerciseListItem[]): ExerciseListItem[] {
  return [...items].sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }))
}

export interface ExerciseGroup {
  name: string
  items: ExerciseListItem[]
  isUsed: boolean
}

const byLabel = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

// Variants of one exercise under a single row (BACKLOG #169), trained ones
// first: among 33 Triceps Extensions those are the ones being looked for.
export function groupExercises(items: ExerciseListItem[]): ExerciseGroup[] {
  const groups = new Map<string, ExerciseListItem[]>()
  for (const item of items) {
    const name = item.group_name ?? item.display_name
    groups.set(name, [...(groups.get(name) ?? []), item])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => byLabel(a, b))
    .map(([name, rows]) => ({
      name,
      isUsed: rows.some((r) => r.is_used),
      items: [...rows].sort(
        (a, b) => b.is_used - a.is_used || byLabel(a.variant_name ?? a.display_name, b.variant_name ?? b.display_name),
      ),
    }))
}

// Whether the chosen filter is this exercise's main muscle. Under Triceps the
// triceps exercises come first and bench presses, which only assist, after.
export function isPrimaryMatch(exercise: ExerciseListItem, region: string | null, focus: string | null): boolean {
  if (focus) return exercise.primary_focus?.includes(focus) === true
  if (region) return exercise.region === region
  return true
}
