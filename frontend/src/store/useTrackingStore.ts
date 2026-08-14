import { create } from 'zustand'
import { putRow, type LocalSession, type LocalSet } from '@/lib/localDb'
import { pushPending } from '@/lib/syncService'
import { nowIso } from '@/lib/time'
import type { SetEntry, Workout } from '@/types'

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
  plannedSets: number
  sets: DraftSet[]
  open: boolean
}

interface FinishResult {
  setsDone: number
  totalSets: number
  durationSec: number
}

interface TrackingState {
  sessionId: string | null
  workoutId: string | null
  workoutName: string
  startedAt: string | null
  exercises: ExerciseTrack[]
  restEndAt: number | null
  restDurationSec: number

  start: (workout: Workout, lastSetsByExercise: Record<string, SetEntry[]>, restSeconds: number) => void
  toggleOpen: (exIndex: number) => void
  updateDraft: (exIndex: number, setIndex: number, patch: Partial<Pick<DraftSet, 'weightKg' | 'reps'>>) => void
  addSet: (exIndex: number) => void
  toggleDone: (exIndex: number, setIndex: number) => Promise<void>
  extendRest: (seconds: number) => void
  skipRest: () => void
  finish: () => Promise<FinishResult>
  reset: () => void
}

const initialState = {
  sessionId: null as string | null,
  workoutId: null as string | null,
  workoutName: '',
  startedAt: null as string | null,
  exercises: [] as ExerciseTrack[],
  restEndAt: null as number | null,
  restDurationSec: 120,
}

// Draft weight/reps for a not-yet-done set are pure UI state -- nothing is
// written to IndexedDB until "done" is tapped, matching the schema (a
// `sets` row IS the marker that a set was actually performed, see
// db/schema.sql -- there's no separate "done" boolean column).
export const useTrackingStore = create<TrackingState>((set, get) => ({
  ...initialState,

  start: (workout, lastSetsByExercise, restSeconds) => {
    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()

    const session: LocalSession = {
      id: sessionId,
      workout_id: workout.id,
      started_at: startedAt,
      ended_at: null,
      note: null,
      created_at: startedAt,
      updated_at: startedAt,
      deleted_at: null,
      synced: false,
    }
    void putRow('sessions', session)

    const exercises: ExerciseTrack[] = workout.exercises.map((we, i) => {
      const last = lastSetsByExercise[we.exercise_id] ?? []
      const sets: DraftSet[] = Array.from({ length: we.planned_sets }, (_, j) => {
        const prior = last[j] ?? last[last.length - 1]
        return {
          weightKg: prior?.weight_kg ?? 0,
          reps: prior?.reps ?? workout.rep_low,
          done: false,
          setId: null,
        }
      })
      return {
        workoutExerciseId: we.id,
        exerciseId: we.exercise_id,
        exerciseName: we.exercise_name,
        plannedSets: we.planned_sets,
        sets,
        open: i === 0,
      }
    })

    set({
      sessionId,
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt,
      exercises,
      restEndAt: null,
      restDurationSec: restSeconds,
    })
  },

  toggleOpen: (exIndex) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) => ({ ...e, open: i === exIndex })),
    }))
  },

  updateDraft: (exIndex, setIndex, patch) => {
    set((state) => ({
      exercises: state.exercises.map((e, i) =>
        i !== exIndex ? e : { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) },
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

  toggleDone: async (exIndex, setIndex) => {
    const state = get()
    if (!state.sessionId) return
    const ex = state.exercises[exIndex]
    const draft = ex.sets[setIndex]
    const now = nowIso()
    const setId = draft.setId ?? crypto.randomUUID()
    const willBeDone = !draft.done

    const row: LocalSet = {
      id: setId,
      session_id: state.sessionId,
      exercise_id: ex.exerciseId,
      workout_exercise_id: ex.workoutExerciseId,
      set_index: setIndex,
      weight_kg: draft.weightKg,
      reps: draft.reps,
      is_warmup: 0,
      rpe: null,
      performed_at: now,
      created_at: now,
      updated_at: now,
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

  extendRest: (seconds) => {
    set((state) => ({ restEndAt: (state.restEndAt ?? Date.now()) + seconds * 1000 }))
  },

  skipRest: () => set({ restEndAt: null }),

  finish: async () => {
    const state = get()
    const now = nowIso()

    if (state.sessionId) {
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
      await putRow('sessions', session)
    }

    const totalSets = state.exercises.reduce((a, e) => a + e.sets.length, 0)
    const setsDone = state.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
    const durationSec = state.startedAt ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000) : 0

    pushPending()

    return { setsDone, totalSets, durationSec }
  },

  reset: () => set(initialState),
}))
