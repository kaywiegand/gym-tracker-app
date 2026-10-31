import { api, ApiError, withTimeout } from '@/lib/api'
import { getCached, replaceCache } from '@/lib/localDb'
import type { ExerciseListItem, SetEntry, Settings, Workout, WorkoutGroup, WorkoutListItem } from '@/types'

// How long a start waits for the network before using the local copy. In a
// gym with one bar of signal requests neither answer nor fail, so without
// this the screen would sit there.
export const NETWORK_WAIT_MS = 4000

interface OfflineSnapshot {
  workouts: WorkoutListItem[]
  workout_groups: WorkoutGroup[]
  workout_details: Record<string, Workout>
  settings: Settings
  exercises?: ExerciseListItem[]
  last_sets: Record<string, SetEntry[]>
}

export interface ExerciseFilters {
  q?: string
  region?: string
  mechanic?: string
  tracked?: boolean
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
const EXERCISES_KEY = 'exercises'
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
      ...(snapshot.exercises ? ([[EXERCISES_KEY, snapshot.exercises]] as [string, unknown][]) : []),
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

// Same rule as the server: every word has to appear somewhere in the exercise.
function matchesFilters(exercise: ExerciseListItem, filters: ExerciseFilters): boolean {
  if (filters.region && !(exercise.regions ?? [exercise.region]).includes(filters.region)) return false
  if (filters.mechanic && exercise.mechanic !== filters.mechanic) return false
  if (filters.tracked && !exercise.has_sets) return false
  const text = [exercise.display_name, exercise.display_subtitle, exercise.name, exercise.region].join(' ').toLowerCase()
  return (filters.q ?? '').toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word))
}

// The server searches better (muscle shorthand), so it goes first. Throws
// when it is out of reach and the device has no library yet.
export async function searchExercises(filters: ExerciseFilters, timeoutMs = NETWORK_WAIT_MS): Promise<ExerciseListItem[]> {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.region) params.set('region', filters.region)
  if (filters.mechanic) params.set('mechanic', filters.mechanic)
  if (filters.tracked) params.set('tracked', '1')
  const query = params.toString()

  let failure: unknown = new Error('Not available offline')
  if (navigator.onLine) {
    try {
      return await withTimeout(api.get<ExerciseListItem[]>(`/exercises${query ? `?${query}` : ''}`), timeoutMs)
    } catch (err) {
      failure = err
    }
  }
  const library = await getCached<ExerciseListItem[]>(EXERCISES_KEY).catch(() => undefined)
  if (!library) throw failure
  return library.filter((exercise) => matchesFilters(exercise, filters))
}

// Whatever the network delivers in time, by exercise id. Exercises missing
// from the result are for the caller to fill from what it has.
export async function fetchLastSets(
  exerciseIds: string[],
  excludeSessionId?: string,
  timeoutMs = NETWORK_WAIT_MS,
): Promise<Record<string, SetEntry[]>> {
  if (!navigator.onLine) return {}
  const query = excludeSessionId ? `?exclude_session=${excludeSessionId}` : ''
  const results = await Promise.allSettled(
    exerciseIds.map((id) => withTimeout(api.get<SetEntry[]>(`/exercises/${id}/last-sets${query}`), timeoutMs)),
  )
  const byExercise: Record<string, SetEntry[]> = {}
  exerciseIds.forEach((id, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') byExercise[id] = result.value
  })
  return byExercise
}

// Answers at once, also mid-session on a bad connection.
export async function loadCachedLastSets(exerciseIds: string[]): Promise<Record<string, SetEntry[]>> {
  const byExercise: Record<string, SetEntry[]> = {}
  for (const id of exerciseIds) {
    byExercise[id] = (await getCached<SetEntry[]>(lastSetsKey(id)).catch(() => undefined)) ?? []
  }
  return byExercise
}

const exerciseIdsOf = (workout: Workout) => workout.exercises.map((we) => we.exercise_id)

// Network first, so an edit from the desktop is there, then the local copy.
// null: the workout is not available, the screen says so instead of hanging.
export async function loadTrackingData(workoutId: string, timeoutMs = NETWORK_WAIT_MS): Promise<TrackingData | null> {
  if (navigator.onLine) {
    try {
      const [workout, settings] = await withTimeout(
        Promise.all([api.get<Workout>(`/workouts/${workoutId}`), api.get<Settings>('/settings')]),
        timeoutMs,
      )
      const fresh = await fetchLastSets(exerciseIdsOf(workout), undefined, timeoutMs)
      return { workout, settings, lastSetsByExercise: { ...(await loadCachedLastSets(exerciseIdsOf(workout))), ...fresh } }
    } catch (err) {
      // Deleted on the server: the local copy is the one that is out of date.
      if (err instanceof ApiError && err.status === 404) return null
    }
  }
  try {
    const workout = await getCached<Workout>(workoutKey(workoutId))
    const settings = await getCached<Settings>(SETTINGS_KEY)
    if (!workout || !settings) return null
    return { workout, settings, lastSetsByExercise: await loadCachedLastSets(exerciseIdsOf(workout)) }
  } catch {
    return null
  }
}
