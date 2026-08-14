import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkoutListItem } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get<WorkoutListItem[]>('/workouts')
      .then(setWorkouts)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader title="Workouts" subtitle="Your templates" />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && workouts.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No workouts yet</p>}

      <div className="flex flex-col gap-2">
        {workouts.map((w) => (
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
        ))}
      </div>

      <Button type="button" variant="outline" className="mt-3 w-full border-dashed" onClick={() => navigate('/workouts/new')}>
        + New workout
      </Button>
    </>
  )
}
