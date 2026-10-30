// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAllRows, getUnsynced } from '../src/lib/localDb.ts'
import { loadCachedSettings, loadTrackingData, loadWorkoutList, refreshOfflineCache } from '../src/lib/offlineCache.ts'
import { initSyncListeners, syncNow } from '../src/lib/syncService.ts'
import { useAuthStore } from '../src/store/useAuthStore.ts'
import { useTrackingStore } from '../src/store/useTrackingStore.ts'
import { fakeServer } from './helpers/server.mjs'

const stored = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (k) => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: (k) => stored.delete(k) },
})

const workout = {
  id: 'workout-1',
  name: 'Push',
  mode_id: 2,
  rep_low: 6,
  rep_high: 10,
  exercises: [
    {
      id: 'we-1',
      exercise_id: 'exercise-1',
      exercise_display_name: 'Chest Press Barbell',
      exercise_display_subtitle: 'Bench Press',
      planned_sets: 2,
      rep_low_override: null,
      rep_high_override: null,
      increment_override_kg: null,
    },
  ],
}
const snapshot = {
  workouts: [{ id: 'workout-1', name: 'Push', exercise_count: 1, group_id: null, mode_name: 'Hypertrophy', rep_low: 6, rep_high: 10 }],
  workout_groups: [{ id: 'group-1', name: 'Main', sort: 0 }],
  workout_details: { 'workout-1': workout },
  settings: { rest_seconds: '90', default_increment_kg: '2.5', rounding_kg: '2.5', progression_trigger: 'all_sets', theme: 'dark' },
  last_sets: { 'exercise-1': [{ weight_kg: 60, reps: 10, is_warmup: 0 }] },
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function online(server) {
  globalThis.navigator.onLine = true
  server.setDown(false)
}

function offline(server) {
  globalThis.navigator.onLine = false
  server.setDown(true)
}

function serverWithData() {
  const server = fakeServer()
  server.onOther = (url) => (url.endsWith('/sync/snapshot') ? json(snapshot) : json({ error: 'Not found' }, 404))
  return server
}

test('the snapshot makes the workout list available offline', async () => {
  const server = serverWithData()
  await refreshOfflineCache()
  offline(server)

  const list = await loadWorkoutList()
  assert.equal(list.source, 'cache')
  assert.deepEqual(list.workouts.map((w) => w.name), ['Push'])
  assert.deepEqual(list.groups.map((g) => g.name), ['Main'])
  assert.equal((await loadCachedSettings()).rest_seconds, '90')
  online(server)
})

test('a workout starts offline, the session stays local, then syncs after reconnect', async () => {
  const server = serverWithData()
  initSyncListeners()
  await refreshOfflineCache()
  offline(server)

  const data = await loadTrackingData('workout-1')
  assert.equal(data.workout.name, 'Push')
  assert.equal(data.settings.rest_seconds, '90')
  assert.equal(data.lastSetsByExercise['exercise-1'][0].weight_kg, 60)

  useTrackingStore.getState().start(data.workout, data.lastSetsByExercise, 90)
  await useTrackingStore.getState().toggleDone(0, 0)
  const sessionId = useTrackingStore.getState().sessionId
  assert.ok(sessionId)

  const localSession = (await getAllRows('sessions')).find((s) => s.id === sessionId)
  assert.equal(localSession.workout_id, 'workout-1')
  assert.equal(localSession.synced, false)
  assert.equal((await getUnsynced('sets')).length, 1)
  assert.equal(server.pushes.length, 0)

  online(server)
  window.dispatchEvent(new Event('online'))
  await syncNow()

  assert.equal(server.rows.get(sessionId).workout_id, 'workout-1')
  assert.equal([...server.rows.values()].filter((r) => r.session_id === sessionId).length, 1)
  assert.deepEqual(await getUnsynced('sessions'), [])
  assert.deepEqual(await getUnsynced('sets'), [])
  useTrackingStore.getState().reset()
})

test('a network that never answers falls back to the cache', async () => {
  const server = serverWithData()
  await refreshOfflineCache()
  globalThis.fetch = () => new Promise(() => {})

  const list = await loadWorkoutList(10)
  assert.equal(list.source, 'cache')
  const data = await loadTrackingData('workout-1', 10)
  assert.equal(data.workout.id, 'workout-1')
  online(server)
})

test('a workout that was never cached ends in null, not in a hang', async () => {
  const server = serverWithData()
  offline(server)
  assert.equal(await loadTrackingData('never-seen'), null)
  online(server)
})

test('fresh data wins while online', async () => {
  const server = serverWithData()
  await refreshOfflineCache()
  server.onOther = (url) => {
    if (url.endsWith('/workouts/workout-1')) return json({ ...workout, name: 'Push v2' })
    if (url.endsWith('/settings')) return json(snapshot.settings)
    if (url.includes('/last-sets')) return json([{ weight_kg: 65, reps: 8, is_warmup: 0 }])
    return json({}, 404)
  }
  const data = await loadTrackingData('workout-1')
  assert.equal(data.workout.name, 'Push v2')
  assert.equal(data.lastSetsByExercise['exercise-1'][0].weight_kg, 65)
})

test('a workout deleted on the server does not come back from the cache', async () => {
  const server = serverWithData()
  await refreshOfflineCache()
  offline(server)
  assert.equal((await loadTrackingData('workout-1')).workout.id, 'workout-1')
  online(server)
  server.onOther = () => json({ error: 'Workout not found' }, 404)
  assert.equal(await loadTrackingData('workout-1'), null)
})

test('a known login survives an offline start, an unknown one does not', async () => {
  const server = serverWithData()
  server.onOther = (url) => (url.endsWith('/auth/status') ? json({ authenticated: true }) : json({}, 404))
  await useAuthStore.getState().checkStatus()
  assert.equal(useAuthStore.getState().status, 'authenticated')

  offline(server)
  useAuthStore.setState({ status: 'loading' })
  await useAuthStore.getState().checkStatus()
  assert.equal(useAuthStore.getState().status, 'authenticated')

  online(server)
  server.onOther = (url) => (url.endsWith('/auth/status') ? json({ authenticated: false }) : json({}, 404))
  await useAuthStore.getState().checkStatus()
  assert.equal(useAuthStore.getState().status, 'unauthenticated')

  offline(server)
  await useAuthStore.getState().checkStatus()
  assert.equal(useAuthStore.getState().status, 'unauthenticated')
  online(server)
})
