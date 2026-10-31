import { create } from 'zustand'
import { getRow, getSetsForSession, putRow, type LocalSession, type LocalSet } from '@/lib/localDb'
import { epley1RM } from '@/lib/metrics'
import { pushPending } from '@/lib/syncService'
import { laterThan, MAX_PLAUSIBLE_SESSION_MIN, nowIso } from '@/lib/time'
import type { ExerciseListItem, SetEntry, Workout } from '@/types'

interface DraftSet {
  weightKg: number
  reps: number
  done: boolean
  setId: string | null
}

interface ExerciseTrack {
  workoutExerciseId: string
  exerciseId: string
  exerciseName: string
  exerciseSubtitle: string
  plannedSets: number
  sets: DraftSet[]
  open: boolean
  // Added during this session (BACKLOG #165): no slot in the workout, the
  // template stays as it is and its sets carry workout_exercise_id = null.
  adHoc: boolean
}

// What an exercise added during the session starts with.
const AD_HOC_PLANNED_SETS = 3

export const adHocKey = (exerciseId: string) => `adhoc:${exerciseId}`

function draftFromHistory(last: SetEntry[], index: number, repLow: number): DraftSet {
  const prior = last[index] ?? last[last.length - 1]
  return { weightKg: prior?.weight_kg ?? 0, reps: prior?.reps ?? repLow, done: false, setId: null }
}

interface FinishResult {
  setsDone: number
  totalSets: number
  volumeKg: number
  // null: no set logged, or start -> last set is no real session length.
  durationSec: number | null
  prExerciseNames: string[]
}

// Shared between a fresh start (no logged sets yet) and resuming an
// abandoned-but-not-finished session (some sets already logged, matched by
// workout_exercise_id + set_index) -- see useTrackingStore.resume().
function buildExercises(
  workout: Workout,
  lastSetsByExercise: Record<string, SetEntry[]>,
  loggedByKey: Map<string, LocalSet>,
): ExerciseTrack[] {
  return workout.exercises.map((we, i) => {
    const last = lastSetsByExercise[we.exercise_id] ?? []
    const sets: DraftSet[] = Array.from({ length: we.planned_sets }, (_, j) => {
      const logged = loggedByKey.get(`${we.id}:${j}`)
      if (logged) {
        return { weightKg: logged.weight_kg, reps: logged.reps, done: true, setId: logged.id }
      }
      return draftFromHistory(last, j, workout.rep_low)
    })
    // Extra sets added mid-session (beyond planned_sets, see addSet) that
    // were already logged before the session was abandoned -- keep them
    // instead of dropping them on resume.
    for (let j = we.planned_sets; loggedByKey.has(`${we.id}:${j}`); j++) {
      const logged = loggedByKey.get(`${we.id}:${j}`)!
      sets.push({ weightKg: logged.weight_kg, reps: logged.reps, done: true, setId: logged.id })
    }
    return {
      workoutExerciseId: we.id,
      exerciseId: we.exercise_id,
      exerciseName: we.exercise_display_name,
      exerciseSubtitle: we.exercise_display_subtitle,
      plannedSets: we.planned_sets,
      sets,
      open: i === 0,
      adHoc: false,
    }
  })
}

// Added exercises come back on resume from their logged sets alone. Gaps and
// the remaining planned sets are filled like a fresh start.
function rebuildAdHoc(
  loggedSets: LocalSet[],
  lastSetsByExercise: Record<string, SetEntry[]>,
  repLow: number,
): ExerciseTrack[] {
  const byExercise = new Map<string, LocalSet[]>()
  for (const set of loggedSets) {
    if (set.workout_exercise_id !== null) continue
    byExercise.set(set.exercise_id, [...(byExercise.get(set.exercise_id) ?? []), set])
  }
  return [...byExercise.entries()].map(([exerciseId, logged]) => {
    const last = lastSetsByExercise[exerciseId] ?? []
    const count = Math.max(AD_HOC_PLANNED_SETS, ...logged.map((s) => s.set_index + 1))
    const sets = Array.from({ length: count }, (_, j): DraftSet => {
      const row = logged.find((s) => s.set_index === j)
      return row ? { weightKg: row.weight_kg, reps: row.reps, done: true, setId: row.id } : draftFromHistory(last, j, repLow)
    })
    return {
      workoutExerciseId: adHocKey(exerciseId),
      exerciseId,
      exerciseName: logged[0].exercise_name ?? exerciseId,
      exerciseSubtitle: logged[0].exercise_subtitle ?? '',
      plannedSets: AD_HOC_PLANNED_SETS,
      sets,
      open: true,
      adHoc: true,
    }
  })
}

interface TrackingState {
  sessionId: string | null
  workoutId: string | null
  workoutName: string
  startedAt: string | null
  // The session row is only written with the first logged set (BACKLOG #69),
  // so merely opening the screen leaves nothing behind.
  sessionPersisted: boolean
  exercises: ExerciseTrack[]
  restEndAt: number | null
  restDurationSec: number
  lastSetsByExercise: Record<string, SetEntry[]>
  repLow: number

  start: (workout: Workout, lastSetsByExercise: Record<string, SetEntry[]>, restSeconds: number) => void
  resume: (
    workout: Workout,
    session: LocalSession,
    loggedSets: LocalSet[],
    lastSetsByExercise: Record<string, SetEntry[]>,
    restSeconds: number,
  ) => void
  toggleOpen: (exIndex: number) => void
  setAllOpen: (open: boolean) => void
  updateDraft: (exIndex: number, setIndex: number, patch: Partial<Pick<DraftSet, 'weightKg' | 'reps'>>) => void
  applySuggestion: (exIndex: number, weightKg: number, reps: number) => void
  addSet: (exIndex: number) => void
  addExercise: (exercise: ExerciseListItem, lastSets: SetEntry[]) => void
  removeExercise: (exIndex: number) => void
  toggleDone: (exIndex: number, setIndex: number) => Promise<void>
  skipRest: () => void
  finish: () => Promise<FinishResult>
  reset: () => void
}

const initialState = {
  sessionId: null as string | null,
  workoutId: null as string | null,
  workoutName: '',
  startedAt: null as string | null,
  sessionPersisted: false,
  exercises: [] as ExerciseTrack[],
  restEndAt: null as number | null,
  restDurationSec: 120,
  lastSetsByExercise: {} as Record<string, SetEntry[]>,
  repLow: 0,
}

// Draft weight/reps for a not-yet-done set are pure UI state -- nothing is
// written to IndexedDB until "done" is tapped, matching the schema (a
// `sets` row IS the marker that a set was actually performed, see
// db/schema.sql -- there's no separate "done" boolean column).
// Shared by concurrent first taps so the session row is written exactly once
// and always before the first set row.
let persistingSession: Promise<void> | null = null

export const useTrackingStore = create<TrackingState>((set, get) => ({
  ...initialState,

  start: (workout, lastSetsByExercise, restSeconds) => {
    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()
    persistingSession = null

    set({
      sessionId,
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt,
      sessionPersisted: false,
      exercises: buildExercises(workout, lastSetsByExercise, new Map()),
      restEndAt: null,
      restDurationSec: restSeconds,
      lastSetsByExercise,
      repLow: workout.rep_low,
    })
  },

  resume: (workout, session, loggedSets, lastSetsByExercise, restSeconds) => {
    const loggedByKey = new Map<string, LocalSet>()
    for (const s of loggedSets) {
      if (s.workout_exercise_id === null) continue
      loggedByKey.set(`${s.workout_exercise_id}:${s.set_index}`, s)
    }

    set({
      sessionId: session.id,
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: session.started_at,
      sessionPersisted: true,
      exercises: [
        ...buildExercises(workout, lastSetsByExercise, loggedByKey),
        ...rebuildAdHoc(loggedSets, lastSetsByExercise, workout.rep_low),
      ],
      restEndAt: null,
      restDurationSec: restSeconds,
      lastSetsByExercise,
      repLow: workout.rep_low,
    })
  },

  // Each card opens and closes on its own. This used to behave like an
  // accordion (open one = close the rest, and an open one could not be
  // closed at all), which made it impossible to either see everything at
  // once or collapse everything for an overview.
  toggleOpen: (exIndex) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) => (i === exIndex ? { ...e, open: !e.open } : e)),
    }))
  },

  setAllOpen: (open) => {
    set((state) => ({ exercises: state.exercises.map((e) => ({ ...e, open })) }))
  },

  updateDraft: (exIndex, setIndex, patch) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) =>
        i !== exIndex ? e : { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) },
      ),
    }))
  },

  applySuggestion: (exIndex, weightKg, reps) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) =>
        i !== exIndex ? e : { ...e, sets: e.sets.map((s) => (s.done ? s : { ...s, weightKg, reps })) },
      ),
    }))
  },

  addSet: (exIndex) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) => {
        if (i !== exIndex) return e
        const last = e.sets[e.sets.length - 1]
        return { ...e, sets: [...e.sets, { weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 0, done: false, setId: null }] }
      }),
    }))
  },

  addExercise: (exercise, lastSets) => {
    set((state) => {
      if (state.exercises.some((e) => e.exerciseId === exercise.id)) return state
      return {
        lastSetsByExercise: { ...state.lastSetsByExercise, [exercise.id]: lastSets },
        exercises: [
          ...state.exercises,
          {
            workoutExerciseId: adHocKey(exercise.id),
            exerciseId: exercise.id,
            exerciseName: exercise.display_name,
            exerciseSubtitle: exercise.display_subtitle,
            plannedSets: AD_HOC_PLANNED_SETS,
            sets: Array.from({ length: AD_HOC_PLANNED_SETS }, (_, j) => draftFromHistory(lastSets, j, state.repLow)),
            open: true,
            adHoc: true,
          },
        ],
      }
    })
  },

  // For a mistaken pick. A logged set stays: it was really performed.
  removeExercise: (exIndex) => {
    set((state) => {
      const ex = state.exercises[exIndex]
      if (!ex?.adHoc || ex.sets.some((s) => s.done)) return state
      return { exercises: state.exercises.filter((_, i) => i !== exIndex) }
    })
  },

  toggleDone: async (exIndex, setIndex) => {
    const state = get()
    if (!state.sessionId) return
    const ex = state.exercises[exIndex]
    const draft = ex.sets[setIndex]
    const now = nowIso()
    const setId = draft.setId ?? crypto.randomUUID()
    const willBeDone = !draft.done

    if (!state.sessionPersisted) {
      if (!persistingSession) {
        const startedAt = state.startedAt ?? now
        persistingSession = putRow('sessions', {
          id: state.sessionId,
          workout_id: state.workoutId,
          started_at: startedAt,
          ended_at: null,
          note: null,
          created_at: startedAt,
          updated_at: startedAt,
          deleted_at: null,
          synced: false,
        } satisfies LocalSession).then(() => set({ sessionPersisted: true }))
      }
      await persistingSession
    }

    const previous = draft.setId ? await getRow<LocalSet>('sets', draft.setId) : undefined
    const row: LocalSet = {
      id: setId,
      session_id: state.sessionId,
      exercise_id: ex.exerciseId,
      workout_exercise_id: ex.adHoc ? null : ex.workoutExerciseId,
      ...(ex.adHoc ? { exercise_name: ex.exerciseName, exercise_subtitle: ex.exerciseSubtitle } : {}),
      set_index: setIndex,
      weight_kg: draft.weightKg,
      reps: draft.reps,
      is_warmup: 0,
      rpe: null,
      performed_at: now,
      created_at: now,
      updated_at: laterThan(previous?.updated_at),
      // Toggling a done set back off soft-deletes its row rather than
      // removing it -- consistent with how every other syncable table
      // handles "undo" (CLAUDE.md §6).
      deleted_at: willBeDone ? null : now,
      synced: false,
    }
    await putRow('sets', row)

    set((s) => ({
      exercises: s.exercises.map((e, i) =>
        i !== exIndex ? e : { ...e, sets: e.sets.map((st, j) => (j === setIndex ? { ...st, done: willBeDone, setId } : st)) },
      ),
      restEndAt: willBeDone ? Date.now() + s.restDurationSec * 1000 : s.restEndAt,
    }))

    pushPending()
  },

  skipRest: () => set({ restEndAt: null }),

  finish: async () => {
    const state = get()
    const now = nowIso()

    // No session row without a logged set -- nothing to finish then.
    if (state.sessionId && state.sessionPersisted) {
      const session: LocalSession = {
        id: state.sessionId,
        workout_id: state.workoutId,
        started_at: state.startedAt ?? now,
        ended_at: now,
        note: null,
        created_at: state.startedAt ?? now,
        updated_at: now,
        deleted_at: null,
        synced: false,
      }
      // A failed write leaves the session open -- it is offered for resume
      // next time, nothing is lost -- and must not block the summary.
      try {
        await putRow('sessions', session)
      } catch (err) {
        console.error('could not store finished session', err)
      }
    }

    const totalSets = state.exercises.reduce((a, e) => a + e.sets.length, 0)
    const setsDone = state.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
    const volumeKg = state.exercises.reduce(
      (a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.weightKg * s.reps, 0),
      0,
    )
    // started_at -> last logged set, as on the dashboard (BACKLOG #86).
    let durationSec: number | null = null
    if (state.sessionId && state.startedAt) {
      const lastSetAt = await getSetsForSession(state.sessionId)
        .then((sets) => sets.reduce<string | null>((a, s) => (a === null || s.performed_at > a ? s.performed_at : a), null))
        .catch(() => null)
      if (lastSetAt) {
        const sec = Math.round((new Date(lastSetAt).getTime() - new Date(state.startedAt).getTime()) / 1000)
        if (sec > 0 && sec <= MAX_PLAUSIBLE_SESSION_MIN * 60) durationSec = sec
      }
    }

    // PR = better e1RM than last time for this exercise (CLAUDE.md §8). No
    // baseline (first time doing it) never counts as a PR.
    const prExerciseNames: string[] = []
    for (const e of state.exercises) {
      const doneSets = e.sets.filter((s) => s.done)
      if (doneSets.length === 0) continue
      const previous = (state.lastSetsByExercise[e.exerciseId] ?? []).filter((s) => !s.is_warmup)
      if (previous.length === 0) continue
      const currentBest = Math.max(...doneSets.map((s) => epley1RM(s.weightKg, s.reps)))
      const previousBest = Math.max(...previous.map((s) => epley1RM(s.weight_kg, s.reps)))
      if (currentBest > previousBest) {
        prExerciseNames.push(e.exerciseName)
      }
    }

    pushPending()

    return { setsDone, totalSets, volumeKg, durationSec, prExerciseNames }
  },

  reset: () => set(initialState),
}))
