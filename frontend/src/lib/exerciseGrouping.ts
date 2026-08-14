import type { ExerciseListItem } from '@/types'

export interface ExerciseGroup {
  region: string
  items: ExerciseListItem[]
}

// Backend already returns exercises sorted by region then name, so this is
// just a client-side split on adjacent items -- no re-sort needed.
export function groupByRegion(items: ExerciseListItem[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = []
  for (const item of items) {
    const region = item.region ?? 'other'
    const last = groups[groups.length - 1]
    if (last && last.region === region) {
      last.items.push(item)
    } else {
      groups.push({ region, items: [item] })
    }
  }
  return groups
}
