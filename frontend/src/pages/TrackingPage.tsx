import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useTrackingStore } from '@/store/useTrackingStore'
import type { Settings, SetEntry, Workout } from '@/types'
import { TrackShell } from '@/components/TrackShell'
import { NumberField } from '@/components/NumberField'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Summary {
  setsDone: number
  totalSets: number
  durationSec: number
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TrackingPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const store = useTrackingStore()
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [finishOpen, setFinishOpen] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    if (!workoutId) return
    let cancelled = false

    async function load() {
      const [workout, settings] = await Promise.all([
        api.get<Workout>(`/workouts/${workoutId}`),
        api.get<Settings>('/settings'),
      ])
      const lastSetsResults = await Promise.allSettled(
        workout.exercises.map((we) => api.get<SetEntry[]>(`/exercises/${we.exercise_id}/last-sets`)),
      )
      const lastSetsByExercise: Record<string, SetEntry[]> = {}
      workout.exercises.forEach((we, i) => {
        const result = lastSetsResults[i]
        lastSetsByExercise[we.exercise_id] = result.status === 'fulfilled' ? result.value : []
      })
      if (!cancelled) {
        useTrackingStore.getState().start(workout, lastSetsByExercise, parseInt(settings.rest_seconds, 10))
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workoutId])

  useEffect(() => {
    return () => {
      useTrackingStore.getState().reset()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (loading || !store.sessionId) {
    return (
      <TrackShell title="Loading…" onBack={() => navigate('/workouts')}>
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </TrackShell>
    )
  }

  const totalSets = store.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = store.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const elapsedSec = store.startedAt ? Math.max(0, Math.round((now - new Date(store.startedAt).getTime()) / 1000)) : 0
  const restRemaining = store.restEndAt ? Math.max(0, Math.ceil((store.restEndAt - now) / 1000)) : 0

  async function handleFinish() {
    const result = await store.finish()
    setSummary(result)
    setFinishOpen(true)
  }

  return (
    <TrackShell title={store.workoutName} subtitle={formatClock(elapsedSec)} onBack={() => navigate('/workouts')}>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-brand-accent transition-all"
          style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
        />
      </div>
      <p className="mb-3 mt-1.5 text-[11px] text-muted-foreground">
        {doneSets}/{totalSets} sets done
      </p>

      <div className="flex flex-col gap-2">
        {store.exercises.map((ex, exIndex) => {
          const doneCount = ex.sets.filter((s) => s.done).length
          const allDone = ex.sets.length > 0 && doneCount === ex.sets.length

          return (
            <Card key={ex.workoutExerciseId} className={allDone ? 'border-status-good/40' : undefined}>
              <div className="flex cursor-pointer items-center gap-2.5 px-3" onClick={() => store.toggleOpen(exIndex)}>
                <div className="min-w-0 flex-1 py-2.5">
                  <div className="truncate text-[14.5px] font-bold">{ex.exerciseName}</div>
                </div>
                {allDone ? (
                  <Badge className="bg-status-good/15 text-status-good" variant="secondary">
                    done
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {doneCount}/{ex.sets.length}
                  </Badge>
                )}
              </div>

              {ex.open && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-[20px_1fr_1fr_40px] gap-1.5 px-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span />
                    <span className="text-center">kg</span>
                    <span className="text-center">reps</span>
                    <span />
                  </div>
                  {ex.sets.map((s, setIndex) => (
                    <div
                      key={setIndex}
                      className={`mt-1.5 grid grid-cols-[20px_1fr_1fr_40px] items-center gap-1.5 ${s.done ? 'opacity-60' : ''}`}
                    >
                      <div className="text-center text-[12px] font-bold text-muted-foreground">{setIndex + 1}</div>
                      <NumberField
                        width="100%"
                        step={0.5}
                        value={s.weightKg}
                        onChange={(v) => store.updateDraft(exIndex, setIndex, { weightKg: v })}
                        aria-label={`${ex.exerciseName} set ${setIndex + 1} weight`}
                      />
                      <NumberField
                        width="100%"
                        value={s.reps}
                        onChange={(v) => store.updateDraft(exIndex, setIndex, { reps: v })}
                        aria-label={`${ex.exerciseName} set ${setIndex + 1} reps`}
                      />
                      <button
                        type="button"
                        className={`flex size-10 items-center justify-center rounded-lg border ${
                          s.done ? 'border-status-good bg-status-good text-white' : 'border-border bg-secondary text-muted-foreground'
                        }`}
                        onClick={() => store.toggleDone(exIndex, setIndex)}
                        aria-label={`Mark set ${setIndex + 1} done`}
                      >
                        <Check className="size-[17px]" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-dashed"
                    onClick={() => store.addSet(exIndex)}
                  >
                    + Add set (this session)
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {store.restEndAt !== null && restRemaining > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[calc(100%-1.5rem)] max-w-[420px] items-center gap-2.5 rounded-xl bg-primary px-3.5 py-2.5 text-primary-foreground shadow-lg">
          <span className="min-w-[52px] text-[20px] font-bold tabular-nums">{formatClock(restRemaining)}</span>
          <span className="flex-1 text-[12px] font-semibold">Rest</span>
          <button
            type="button"
            className="rounded-md bg-primary-foreground/15 px-2.5 py-1.5 text-[12.5px] font-bold"
            onClick={() => store.extendRest(15)}
          >
            +15s
          </button>
          <button
            type="button"
            className="rounded-md bg-primary-foreground/15 px-2.5 py-1.5 text-[12.5px] font-bold"
            onClick={() => store.skipRest()}
          >
            Skip
          </button>
        </div>
      )}

      <Button type="button" className="mb-10 mt-4 w-full bg-status-good text-white hover:bg-status-good/90" onClick={handleFinish}>
        Finish workout
      </Button>

      <Sheet open={finishOpen} onOpenChange={setFinishOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-center text-[18px]">Workout complete</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4">
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10.5px] font-semibold text-muted-foreground">Sets</div>
              <div className="text-[21px] font-bold">{summary?.setsDone ?? 0}</div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10.5px] font-semibold text-muted-foreground">Duration</div>
              <div className="text-[21px] font-bold">{summary ? `${Math.max(1, Math.round(summary.durationSec / 60))} min` : '—'}</div>
            </div>
          </div>
          <div className="p-4 pt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setFinishOpen(false)
                navigate('/workouts')
              }}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TrackShell>
  )
}
