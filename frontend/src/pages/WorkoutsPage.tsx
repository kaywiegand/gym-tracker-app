import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkoutGroup, WorkoutListItem } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Section {
  id: string | null
  name: string
  workouts: WorkoutListItem[]
}

const UNGROUPED = '__ungrouped__'

// Which sections are collapsed, kept per browser. A collapsed group is a
// display preference, not data -- it does not belong on the server, and it
// should survive a reload on the phone it was collapsed on.
function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem('workout-groups-collapsed')
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [groups, setGroups] = useState<WorkoutGroup[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get<WorkoutListItem[]>('/workouts'), api.get<WorkoutGroup[]>('/workout-groups')])
      .then(([w, g]) => {
        setWorkouts(w)
        setGroups(g)
      })
      .finally(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        localStorage.setItem('workout-groups-collapsed', JSON.stringify([...next]))
      } catch {
        // a private window can refuse storage -- the toggle still works for this visit
      }
      return next
    })
  }

  // Groups in their configured order, then whatever has no group. An empty
  // group still shows, so a group made in advance is visibly there.
  const sections: Section[] = useMemo(() => {
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

    const out: Section[] = groups.map((g) => ({ id: g.id, name: g.name, workouts: byGroup.get(g.id) ?? [] }))
    if (ungrouped.length > 0) {
      out.push({ id: null, name: groups.length > 0 ? 'Ungrouped' : 'All workouts', workouts: ungrouped })
    }
    return out
  }, [workouts, groups])

  const card = (w: WorkoutListItem) => (
    <Card key={w.id} className="cursor-pointer px-3 py-2.5" onClick={() => navigate(`/workouts/${w.id}/edit`)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold">{w.name}</span>
            <Badge variant="secondary" className="shrink-0">
              {w.mode_name} {w.rep_low}–{w.rep_high}
            </Badge>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">{w.exercise_count} exercises</div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={w.exercise_count === 0}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/track/${w.id}`)
          }}
        >
          Start
        </Button>
      </div>
    </Card>
  )

  return (
    <>
      <PageHeader title="Workouts" subtitle="Your templates" />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && workouts.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No workouts yet</p>}

      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const key = section.id ?? UNGROUPED
          // A single unnamed pile needs no header -- that is just the list.
          if (section.id === null && groups.length === 0) {
            return (
              <div key={key} className="flex flex-col gap-2">
                {section.workouts.map(card)}
              </div>
            )
          }
          const isOpen = !collapsed.has(key)
          return (
            <div key={key}>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 py-1.5 text-left"
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{section.name}</span>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] tabular-nums text-muted-foreground">{section.workouts.length}</span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2">
                  {section.workouts.length === 0 ? (
                    <p className="px-1 py-1 text-[12px] text-muted-foreground">No workouts in this group yet.</p>
                  ) : (
                    section.workouts.map(card)
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mb-10 mt-3 flex gap-2">
        <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={() => navigate('/workouts/new')}>
          + New workout
        </Button>
        <Button type="button" variant="outline" className="border-dashed" onClick={() => navigate('/workout-groups')}>
          Groups
        </Button>
      </div>
    </>
  )
}
