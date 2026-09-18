import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkoutGroup, WorkoutListItem } from '@/types'
import { groupWorkouts, useCollapsedWorkoutGroups, type WorkoutSection } from '@/lib/workoutGrouping'
import { PageHeader } from '@/components/PageHeader'
import { WorkoutGroupList } from '@/components/WorkoutGroupList'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Section = WorkoutSection

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [groups, setGroups] = useState<WorkoutGroup[]>([])
  const { collapsed, toggle } = useCollapsedWorkoutGroups()
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

  const sections: Section[] = useMemo(() => groupWorkouts(workouts, groups), [workouts, groups])

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

      <WorkoutGroupList sections={sections} hasNamedGroups={groups.length > 0} collapsed={collapsed} onToggle={toggle} renderWorkout={card} />

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
