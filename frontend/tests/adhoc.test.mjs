// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAllRows, getSetsForSession } from '../src/lib/localDb.ts'
import { loadCachedLastSets, refreshOfflineCache, searchExercises } from '../src/lib/offlineCache.ts'
import { pushPending } from '../src/lib/syncService.ts'
import { useTrackingStore } from '../src/store/useTrackingStore.ts'
import { fakeServer } from './helpers/server.mjs'

const workout = {
  id: 'workout-1',
  name: 'Push',
  rep_low: 6,
  rep_high: 10,
  exercises: [
    {
      id: 'we-1',
      exercise_id: 'chest',
      exercise_display_name: 'Chest Press Barbell',
      exercise_display_subtitle: 'Bench Press',
      planned_sets: 1,
      rep_low_override: null,
      rep_high_override: null,
      increment_override_kg: null,
    },
  ],
}
const legPress = {
  id: 'legs',
  name: 'Leg Press',
  display_name: 'Quads Press Machine',
  display_subtitle: 'Leg Press',
  region: 'legs',
  mechanic: 'compound',
  has_sets: 1,
  is_watched: 1,
  default_increment_kg: 5,
}
const curl = { ...legPress, id: 'curl', name: 'Curl', display_name: 'Biceps Curl Dumbbell', display_subtitle: 'Curl', region: 'arms', mechanic: 'isolation', has_sets: 0 }
const lastLegSets = [{ weight_kg: 100, reps: 12, is_warmup: 0, session_id: 'old' }]

const track = () => useTrackingStore.getState()

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

test('an added exercise is tracked for this session only', async () => {
  const server = fakeServer()
  track().start(workout, {}, 90)
  track().addExercise(legPress, lastLegSets)

  const added = track().exercises[1]
  assert.equal(added.exerciseName, 'Quads Press Machine')
  assert.equal(added.adHoc, true)
  assert.equal(added.open, true)
  assert.deepEqual(added.sets.map((s) => [s.weightKg, s.reps, s.done]), [[100, 12, false], [100, 12, false], [100, 12, false]])

  await track().toggleDone(1, 0)
  await pushPending()

  const row = (await getSetsForSession(track().sessionId))[0]
  assert.equal(row.exercise_id, 'legs')
  assert.equal(row.workout_exercise_id, null)
  assert.equal(server.rows.get(row.id).exercise_id, 'legs')
  assert.equal(server.pushes.some((p) => 'workouts' in p), false)
  track().reset()
})

test('no last sets: bottom of the rep range, no weight', () => {
  track().start(workout, {}, 90)
  track().addExercise(curl, [])
  assert.deepEqual(track().exercises[1].sets[0], { weightKg: 0, reps: 6, done: false, setId: null })
  track().reset()
})

test('the same exercise cannot be added twice', () => {
  track().start(workout, {}, 90)
  track().addExercise(legPress, [])
  track().addExercise(legPress, [])
  assert.equal(track().exercises.length, 2)
  track().reset()
})

test('it counts for finish and PRs', async () => {
  fakeServer()
  track().start(workout, {}, 90)
  track().addExercise(legPress, lastLegSets)
  track().updateDraft(1, 0, { weightKg: 110 })
  await track().toggleDone(1, 0)
  const result = await track().finish()
  assert.equal(result.totalSets, 4)
  assert.equal(result.volumeKg, 1320)
  assert.deepEqual(result.prExerciseNames, ['Quads Press Machine'])
  track().reset()
})

test('a resumed session gets the added exercise back', async () => {
  fakeServer()
  track().start(workout, {}, 90)
  track().addExercise(legPress, lastLegSets)
  await track().toggleDone(1, 1)
  const sessionId = track().sessionId
  const session = (await getAllRows('sessions')).find((s) => s.id === sessionId)
  const logged = await getSetsForSession(sessionId)
  track().reset()

  track().resume(workout, session, logged, { legs: lastLegSets }, 90)
  const added = track().exercises[1]
  assert.equal(added.exerciseName, 'Quads Press Machine')
  assert.equal(added.exerciseSubtitle, 'Leg Press')
  assert.equal(added.adHoc, true)
  assert.deepEqual(added.sets.map((s) => s.done), [false, true, false])

  await track().toggleDone(1, 1)
  assert.equal((await getSetsForSession(sessionId)).length, 0)
  track().reset()
})

test('an added exercise without a logged set can be removed, with one it cannot', async () => {
  fakeServer()
  track().start(workout, {}, 90)
  track().addExercise(legPress, [])
  track().removeExercise(1)
  assert.equal(track().exercises.length, 1)

  track().addExercise(legPress, [])
  await track().toggleDone(1, 0)
  track().removeExercise(1)
  assert.equal(track().exercises.length, 2)
  track().removeExercise(0)
  assert.equal(track().exercises.length, 2)
  track().reset()
})

test('the library is searchable offline', async () => {
  const server = fakeServer()
  server.onOther = (url) =>
    url.endsWith('/sync/snapshot')
      ? json({ workouts: [], workout_groups: [], workout_details: {}, settings: {}, exercises: [legPress, curl], last_sets: { legs: lastLegSets } })
      : json({}, 404)
  await refreshOfflineCache()
  globalThis.navigator.onLine = false

  const names = async (filters) => (await searchExercises(filters)).map((e) => e.id)
  assert.deepEqual(await names({}), ['legs', 'curl'])
  assert.deepEqual(await names({ q: 'press quads' }), ['legs'])
  assert.deepEqual(await names({ q: 'bench' }), [])
  assert.deepEqual(await names({ region: 'arms' }), ['curl'])
  assert.deepEqual(await names({ mechanic: 'compound' }), ['legs'])
  assert.deepEqual(await names({ tracked: true }), ['legs'])
  assert.equal((await searchExercises({ region: 'legs' }))[0].is_watched, 1)
  assert.equal((await loadCachedLastSets(['legs'])).legs[0].weight_kg, 100)
  globalThis.navigator.onLine = true
})

test('no library on the device: the search fails instead of pretending', async () => {
  const server = fakeServer()
  server.onOther = () => json({ workouts: [], workout_groups: [], workout_details: {}, settings: {}, last_sets: {} })
  await refreshOfflineCache()
  server.setDown(true)
  await assert.rejects(searchExercises({}))
  server.setDown(false)
})
