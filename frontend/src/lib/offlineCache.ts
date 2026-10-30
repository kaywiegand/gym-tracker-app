import { api, ApiError, withTimeout } from '@/lib/api'
import { getCached, replaceCache } from '@/lib/localDb'
import type { SetEntry, Settings, Workout, WorkoutGroup, WorkoutListItem } from '@/types'

// How long a start waits for the network before using the local copy. In a
// gym with one bar of signal requests neither answer nor fail, so without
// this the screen would sit there.
export const NETWORK_WAIT_MS = 4000

interface OfflineSnapshot {
  workouts: WorkoutListItem[]
  workout_groups: WorkoutGroup[]
  workout_details: Record<string, Workout>
  settings: Settings
  last_sets: Record<string, SetEntry[]>
}

export interface WorkoutList {
  workouts: WorkoutListItem[]
  groups: WorkoutGroup[]
  source: 'network' | 'cache'
}

export interface TrackingData {
  workout: Workout
  settings: Settings
  lastSetsByExercise: Record<string, SetEntry[]>
}

const LIST_KEY = 'workouts'
const GROUPS_KEY = 'workout-groups'
const SETTINGS_KEY = 'settings'
const workoutKey = (id: string) => `workout:${id}`
const lastSetsKey = (exerciseId: string) => `last-sets:${exerciseId}`

// Mirrors the server's view for the next offline start. The whole set is
// replaced, so a deleted workout does not linger. A failure changes nothing:
// the previous copy is still the best there is.
export async function refreshOfflineCache(): Promise<void> {
  if (!navigator.onLine) return
  try {
    const snapshot = await api.get<OfflineSnapshot>('/sync/snapshot')
    await replaceCache([
      [LIST_KEY, snapshot.workouts],
      [GROUPS_KEY, snapshot.workout_groups],
      [SETTINGS_KEY, snapshot.settings],
      ...Object.entries(snapshot.workout_details).map(([id, workout]): [string, unknown] => [workoutKey(id), workout]),
      ...Object.entries(snapshot.last_sets).map(([id, sets]): [string, unknown] => [lastSetsKey(id), sets]),
    ])
  } catch (err) {
    console.warn('offline cache not refreshed', err)
  }
}

export async function loadCachedSettings(): Promise<Settings | null> {
  try {
    return (await getCached<Settings>(SETTINGS_KEY)) ?? null
  } catch {
    return null
  }
}

// null: neither the network nor a local copy has it.
export async function loadWorkoutList(timeoutMs = NETWORK_WAIT_MS): Promise<WorkoutList | null> {
  if (navigator.onLine) {
    try {
      const [workouts, groups] = await withTimeout(
        Promise.all([api.get<WorkoutListItem[]>('/workouts'), api.get<WorkoutGroup[]>('/workout-groups')]),
        timeoutMs,
      )
      return { workouts, groups, source: 'network' }
    } catch {
      // the local copy below
    }
  }
  try {
    const workouts = await getCached<WorkoutListItem[]>(LIST_KEY)
    const groups = await getCached<WorkoutGroup[]>(GROUPS_KEY)
    return workouts ? { workouts, groups: groups ?? [], source: 'cache' } : null
  } catch {
    return null
  }
}

// Whatever the network delivers in time, by exercise id. Exercises missing
// from the result are for the caller to fill from what it has.
export async function fetchLastSets(
  workout: Workout,
  excludeSessionId?: string,
  timeoutMs = NETWORK_WAIT_MS,
): Promise<Record<string, SetEntry[]>> {
  if (!navigator.onLine) return {}
  const query = excludeSessionId ? `?exclude_session=${excludeSessionId}` : ''
  const results = await Promise.allSettled(
    workout.exercises.map((we) => withTimeout(api.get<SetEntry[]>(`/exercises/${we.exercise_id}/last-sets${query}`), timeoutMs)),
  )
  const byExercise: Record<string, SetEntry[]> = {}
  workout.exercises.forEach((we, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') byExercise[we.exercise_id] = result.value
  })
  return byExercise
}

async function cachedLastSets(workout: Workout): Promise<Record<string, SetEntry[]>> {
  const byExercise: Record<string, SetEntry[]> = {}
  for (const we of workout.exercises) {
    byExercise[we.exercise_id] = (await getCached<SetEntry[]>(lastSetsKey(we.exercise_id)).catch(() => undefined)) ?? []
  }
  return byExercise
}

// Network first, so an edit from the desktop is there, then the local copy.
// null: the workout is not available, the screen says so instead of hanging.
export async function loadTrackingData(workoutId: string, timeoutMs = NETWORK_WAIT_MS): Promise<TrackingData | null> {
  if (navigator.onLine) {
    try {
      const [workout, settings] = await withTimeout(
        Promise.all([api.get<Workout>(`/workouts/${workoutId}`), api.get<Settings>('/settings')]),
        timeoutMs,
      )
      const fresh = await fetchLastSets(workout, undefined, timeoutMs)
      return { workout, settings, lastSetsByExercise: { ...(await cachedLastSets(workout)), ...fresh } }
    } catch (err) {
      // Deleted on the server: the local copy is the one that is out of date.
      if (err instanceof ApiError && err.status === 404) return null
    }
  }
  try {
    const workout = await getCached<Workout>(workoutKey(workoutId))
    const settings = await getCached<Settings>(SETTINGS_KEY)
    if (!workout || !settings) return null
    return { workout, settings, lastSetsByExercise: await cachedLastSets(workout) }
  } catch {
    return null
  }
}
