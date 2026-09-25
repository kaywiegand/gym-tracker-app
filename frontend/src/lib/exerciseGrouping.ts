import type { ExerciseListItem } from '@/types'

// Flat, case-insensitive alphabetical order by the displayed title (#60) --
// replaces the former per-muscle grouping. `localeCompare` with base
// sensitivity ignores case (and accents), matching how a user scans a list
// for a name regardless of how they typed it.
export function sortByDisplayName(items: ExerciseListItem[]): ExerciseListItem[] {
  return [...items].sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }))
}
