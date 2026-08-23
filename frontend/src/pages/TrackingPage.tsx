import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { api } from '@/lib/api'
import { findOpenSession, getSetsForSession, putRow, type LocalSession, type LocalSet } from '@/lib/localDb'
import { suggestNext, type Suggestion } from '@/lib/progression'
import { playRestDoneSound } from '@/lib/sound'
import { pushPending } from '@/lib/syncService'
import { nowIso } from '@/lib/time'
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
  volumeKg: number
  durationSec: number
  prExerciseNames: string[]
}

interface PendingResumeChoice {
  workout: Workout
  restSeconds: number
  lastSetsByExercise: Record<string, SetEntry[]>
  openSession: LocalSession
  loggedSets: LocalSet[]
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
  const [previousVolume, setPreviousVolume] = useState<number | null>(null)
  const [comparingVolume, setComparingVolume] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<PendingResumeChoice | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({})

  useEffect(() => {
    if (!workoutId) return
    const wid = workoutId
    let cancelled = false

    async function load() {
      const [workout, settings] = await Promise.all([
        api.get<Workout>(`/workouts/${wid}`),
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
      const restSeconds = parseInt(settings.rest_seconds, 10)

      const suggestionsByWorkoutExerciseId: Record<string, Suggestion> = {}
      workout.exercises.forEach((we) => {
        suggestionsByWorkoutExerciseId[we.id] = suggestNext({
          lastSets: lastSetsByExercise[we.exercise_id] ?? [],
          repLow: we.rep_low_override ?? workout.rep_low,
          repHigh: we.rep_high_override ?? workout.rep_high,
          incrementKg: we.increment_override_kg ?? we.exercise_default_increment_kg ?? parseFloat(settings.default_increment_kg),
          roundingKg: parseFloat(settings.rounding_kg),
          trigger: settings.progression_trigger,
        })
      })
      if (cancelled) return
      setSuggestions(suggestionsByWorkoutExerciseId)

      // A session left ended_at:null means it was abandoned (browser
      // closed / navigated away without "Finish workout") -- its sets are
      // already safe in IndexedDB, but starting fresh here would orphan it
      // under a new session id instead of letting the user continue it.
      const openSession = await findOpenSession(wid)
      if (cancelled) return

      if (openSession) {
        const loggedSets = await getSetsForSession(openSession.id)
        if (cancelled) return
        setPendingChoice({ workout, restSeconds, lastSetsByExercise, openSession, loggedSets })
      } else {
        useTrackingStore.getState().start(workout, lastSetsByExercise, restSeconds)
      }
      setLoading(false)
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

  const playedRestEndRef = useRef<number | null>(null)
  useEffect(() => {
    const restEndAt = store.restEndAt
    if (restEndAt !== null && restEndAt <= now && playedRestEndRef.current !== restEndAt) {
      playedRestEndRef.current = restEndAt
      playRestDoneSound()
    }
  }, [store.restEndAt, now])

  function handleResume() {
    if (!pendingChoice) return
    const { workout, restSeconds, lastSetsByExercise, openSession, loggedSets } = pendingChoice
    useTrackingStore.getState().resume(workout, openSession, loggedSets, lastSetsByExercise, restSeconds)
    setPendingChoice(null)
  }

  async function handleStartNew() {
    if (!pendingChoice) return
    const { workout, restSeconds, lastSetsByExercise, openSession } = pendingChoice
    // Close the abandoned session out honestly (it has real logged sets)
    // instead of leaving it stuck open forever.
    await putRow('sessions', { ...openSession, ended_at: openSession.updated_at, updated_at: nowIso(), synced: false })
    pushPending()
    useTrackingStore.getState().start(workout, lastSetsByExercise, restSeconds)
    setPendingChoice(null)
  }

  if (loading) {
    return (
      <TrackShell title="Loading…" onBack={() => navigate('/workouts')}>
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </TrackShell>
    )
  }

  if (pendingChoice) {
    const loggedCount = pendingChoice.loggedSets.length
    const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(pendingChoice.openSession.started_at).getTime()) / 60000))
    return (
      <TrackShell title={pendingChoice.workout.name} onBack={() => navigate('/workouts')}>
        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="text-[14.5px] font-bold">Unfinished session found</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Started {minutesAgo} min ago · {loggedCount} set{loggedCount === 1 ? '' : 's'} already logged. Nothing was lost —
            resume where you left off, or start a new session.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" className="w-full" onClick={handleResume}>
              Resume
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleStartNew}>
              Start new
            </Button>
          </div>
        </div>
      </TrackShell>
    )
  }

  if (!store.sessionId) {
    return (
      <TrackShell title="Loading…" onBack={() => navigate('/workouts')}>
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </TrackShell>
    )
  }

  const totalSets = store.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = store.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const restRemaining = store.restEndAt ? Math.max(0, Math.ceil((store.restEndAt - now) / 1000)) : 0
  const restExpired = store.restEndAt !== null && restRemaining <= 0
  const volumeDelta = summary && previousVolume !== null ? summary.volumeKg - previousVolume : null
  const volumeDeltaPct = volumeDelta !== null && previousVolume ? Math.round((volumeDelta / previousVolume) * 100) : null

  async function handleFinish() {
    const workoutIdForCompare = store.workoutId
    const sessionIdForCompare = store.sessionId
    const result = await store.finish()
    setSummary(result)
    setPreviousVolume(null)
    setFinishOpen(true)

    if (workoutIdForCompare && sessionIdForCompare) {
      setComparingVolume(true)
      try {
        const prev = await api.get<{ volume_kg: number | null }>(
          `/workouts/${workoutIdForCompare}/last-session-volume?exclude_session=${sessionIdForCompare}`,
        )
        setPreviousVolume(prev.volume_kg)
      } catch {
        setPreviousVolume(null)
      } finally {
        setComparingVolume(false)
      }
    }
  }

  return (
    <TrackShell title={store.workoutName} onBack={() => navigate('/workouts')}>
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
                  {suggestions[ex.workoutExerciseId] && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold">
                          {suggestions[ex.workoutExerciseId].weightKg !== null
                            ? `${suggestions[ex.workoutExerciseId].weightKg} kg × ${suggestions[ex.workoutExerciseId].reps}`
                            : `${suggestions[ex.workoutExerciseId].reps} reps`}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">{suggestions[ex.workoutExerciseId].reason}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          store.applySuggestion(
                            exIndex,
                            suggestions[ex.workoutExerciseId].weightKg ?? 0,
                            suggestions[ex.workoutExerciseId].reps,
                          )
                        }
                      >
                        Use suggestion
                      </Button>
                    </div>
                  )}
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

      {store.restEndAt !== null && (
        <div
          className={`fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[calc(100%-1.5rem)] max-w-[420px] items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-primary-foreground shadow-lg ${
            restExpired ? 'animate-pulse bg-status-good' : 'bg-primary'
          }`}
        >
          <span className="min-w-[52px] text-[20px] font-bold tabular-nums">{formatClock(restRemaining)}</span>
          <span className="flex-1 text-[12px] font-semibold">{restExpired ? 'Rest done — keep going' : 'Rest'}</span>
          <button
            type="button"
            className="rounded-md bg-primary-foreground/15 px-2.5 py-1.5 text-[12.5px] font-bold"
            onClick={() => store.skipRest()}
          >
            {restExpired ? 'Dismiss' : 'Skip'}
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
              <div className="text-[10.5px] font-semibold text-muted-foreground">Volume</div>
              <div className="text-[21px] font-bold">{summary ? `${Math.round(summary.volumeKg)} kg` : '—'}</div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10.5px] font-semibold text-muted-foreground">Duration</div>
              <div className="text-[21px] font-bold">{summary ? `${Math.max(1, Math.round(summary.durationSec / 60))} min` : '—'}</div>
            </div>
          </div>
          <div className="px-4 pt-2">
            {comparingVolume ? (
              <p className="text-[12px] text-muted-foreground">Comparing to last time…</p>
            ) : previousVolume === null ? (
              <p className="text-[12px] text-muted-foreground">No previous session to compare</p>
            ) : (
              volumeDelta !== null && (
                <p
                  className={`text-[12.5px] font-semibold ${
                    volumeDelta > 0 ? 'text-status-good' : volumeDelta < 0 ? 'text-status-crit' : 'text-muted-foreground'
                  }`}
                >
                  {volumeDelta > 0 ? '+' : ''}
                  {Math.round(volumeDelta)} kg{volumeDeltaPct !== null ? ` (${volumeDelta > 0 ? '+' : ''}${volumeDeltaPct}%)` : ''} vs
                  last time
                </p>
              )
            )}
          </div>
          {summary && summary.prExerciseNames.length > 0 && (
            <div className="flex flex-col gap-1.5 px-4 pt-3">
              {summary.prExerciseNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-status-good/30 bg-status-good/10 px-3 py-1.5"
                >
                  <span className="text-[12.5px] font-semibold">{name}</span>
                  <Badge className="bg-status-good/15 text-status-good" variant="secondary">
                    PR
                  </Badge>
                </div>
              ))}
            </div>
          )}
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
