import type { WorkoutGroup, WorkoutListItem } from '@/types'

export interface WorkoutSection {
  id: string | null
  name: string
  workouts: WorkoutListItem[]
}

// Groups in their configured order, then whatever has no group. Shared by the
// Workouts page and the dashboard's workout picker, so a workout sits in the
// same place wherever it is chosen. An empty group is kept -- the Workouts
// page shows it so a group made in advance is visibly there; a picker with
// nothing to pick drops it itself.
export function groupWorkouts(workouts: WorkoutListItem[], groups: WorkoutGroup[]): WorkoutSection[] {
  const byGroup = new Map<string, WorkoutListItem[]>()
  const ungrouped: WorkoutListItem[] = []
  for (const w of workouts) {
    if (w.group_id) {
      const list = byGroup.get(w.group_id) ?? []
      list.push(w)
      byGroup.set(w.group_id, list)
    } else {
      ungrouped.push(w)
    }
  }

  const out: WorkoutSection[] = groups.map((g) => ({ id: g.id, name: g.name, workouts: byGroup.get(g.id) ?? [] }))
  if (ungrouped.length > 0) {
    out.push({ id: null, name: groups.length > 0 ? 'Ungrouped' : 'All workouts', workouts: ungrouped })
  }
  return out
}
