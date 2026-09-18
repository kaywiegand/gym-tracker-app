import { useState } from 'react'
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

const COLLAPSED_STORAGE_KEY = 'workout-groups-collapsed'

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

// Which sections are collapsed, kept per browser. A collapsed group is a
// display preference, not data -- it does not belong on the server, and it
// should survive a reload on the phone it was collapsed on. Shared by the
// Workouts page and the dashboard's workout picker (BACKLOG #51), under the
// same key, so a group collapsed in one place stays collapsed in the other.
export function useCollapsedWorkoutGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedGroups)

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // a private window can refuse storage -- the toggle still works for this visit
      }
      return next
    })
  }

  return { collapsed, toggle }
}
