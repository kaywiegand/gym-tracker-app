// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAllRows, getUnsynced, putRow } from '../src/lib/localDb.ts'
import { pushPending } from '../src/lib/syncService.ts'
import { useTrackingStore } from '../src/store/useTrackingStore.ts'
import { fakeServer } from './helpers/server.mjs'

const setRow = (id, updatedAt, patch = {}) => ({
  id,
  session_id: 'session-1',
  exercise_id: 'exercise-1',
  workout_exercise_id: 'we-1',
  set_index: 0,
  weight_kg: 50,
  reps: 8,
  is_warmup: 0,
  rpe: null,
  performed_at: updatedAt,
  created_at: updatedAt,
  updated_at: updatedAt,
  deleted_at: null,
  synced: false,
  ...patch,
})

const workout = {
  id: 'workout-1',
  name: 'Push',
  rep_low: 6,
  rep_high: 10,
  exercises: [
    {
      id: 'we-1',
      exercise_id: 'exercise-1',
      exercise_display_name: 'Chest Press Barbell',
      exercise_display_subtitle: 'Bench Press',
      planned_sets: 3,
      rep_low_override: null,
      rep_high_override: null,
      increment_override_kg: null,
    },
  ],
}

async function settled() {
  await pushPending()
  assert.deepEqual(await getUnsynced('sets'), [])
}

test('a synced row is marked synced', async () => {
  const server = fakeServer()
  await putRow('sets', setRow('plain', '2026-10-30T10:00:00Z'))
  await pushPending()
  assert.equal(server.rows.get('plain').updated_at, '2026-10-30T10:00:00Z')
  assert.equal((await getUnsynced('sets')).length, 0)
})

test('a row changed during the push stays dirty and reaches the server', async () => {
  const server = fakeServer()
  await putRow('sets', setRow('changed', '2026-10-30T10:00:00Z'))
  server.hold()
  const running = pushPending()
  await server.pushStarted()

  await putRow('sets', setRow('changed', '2026-10-30T10:00:05Z', { weight_kg: 55 }))
  server.release()
  await running

  const dirty = await getUnsynced('sets')
  assert.deepEqual(dirty.map((r) => r.weight_kg), [55])

  await settled()
  assert.equal(server.rows.get('changed').weight_kg, 55)
})

test('a row taken back during the push reaches the server as deleted', async () => {
  const server = fakeServer()
  await putRow('sets', setRow('taken-back', '2026-10-30T10:00:00Z'))
  server.hold()
  const running = pushPending()
  await server.pushStarted()

  await putRow('sets', setRow('taken-back', '2026-10-30T10:00:05Z', { deleted_at: '2026-10-30T10:00:05Z' }))
  server.release()
  await running

  await settled()
  assert.equal(server.rows.get('taken-back').deleted_at, '2026-10-30T10:00:05Z')
})

test('a trigger during a running push is not lost', async () => {
  const server = fakeServer()
  await putRow('sets', setRow('first', '2026-10-30T10:00:00Z'))
  server.hold()
  const running = pushPending()
  await server.pushStarted()

  await putRow('sets', setRow('second', '2026-10-30T10:00:01Z'))
  pushPending()
  server.release()
  await running

  assert.ok(server.rows.has('second'))
  assert.deepEqual(await getUnsynced('sets'), [])
})

test('a failed push leaves everything queued', async () => {
  const server = fakeServer()
  await putRow('sets', setRow('offline', '2026-10-30T10:00:00Z'))
  server.setDown(true)
  await pushPending()
  assert.equal((await getUnsynced('sets')).filter((r) => r.id === 'offline').length, 1)
  server.setDown(false)
  await settled()
})

test('checking and unchecking a set within one second during a push', async () => {
  const server = fakeServer()
  const store = useTrackingStore.getState()
  store.start(workout, {}, 120)
  server.hold()

  await store.toggleDone(0, 0)
  await server.pushStarted()
  await useTrackingStore.getState().toggleDone(0, 0)
  server.release()
  await pushPending()
  await settled()

  const local = (await getAllRows('sets')).filter((r) => r.session_id === useTrackingStore.getState().sessionId)
  assert.equal(local.length, 1)
  assert.notEqual(server.rows.get(local[0].id).deleted_at, null)
  useTrackingStore.getState().reset()
})
