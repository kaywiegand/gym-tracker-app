// Run with: npm test (Node strips the TypeScript types itself).
import test from 'node:test'
import assert from 'node:assert/strict'
import { detectPlateau } from '../src/lib/plateau.ts'

const P = 6
const run = (seq) => detectPlateau(seq.map((best_e1rm) => ({ best_e1rm, top_weight_kg: 50, best_reps: 8 })), P)
const runBodyweight = (reps) => detectPlateau(reps.map((best_reps) => ({ best_e1rm: 0, top_weight_kg: 0, best_reps })), P)

test('rear delt: noisy but rising is no plateau', () => {
  assert.equal(run([125.7, 125.7, 123.3, 120.4, 130.4, 126.7, 130.0, 133.3, 126.7, 143.3, 133.3, 140.0, 136.7, 142.1]).status, 'none')
})

test('incline bench: stalling', () => {
  assert.equal(run([72.0, 80.0, 72.0, 80.0, 81.0, 86.3, 71.5, 77.0, 87.5, 84.0, 87.5, 90.0, 87.5, 86.3, 90.0, 84.0, 84.0]).status, 'stalling')
})

test('triceps overhead: plateau', () => {
  assert.equal(run([45.3, 21.5, 23.0, 21.5, 21.0, 35.8, 50.4, 60.0, 60.0, 66.7, 45.6, 54.5, 40.0, 39.0, 39.0, 39.0, 40.5]).status, 'plateau')
})

test('fewer than 6 sessions: none', () => {
  assert.equal(run([50, 50, 50, 50, 50]).status, 'none')
})

test('bodyweight: rising reps is no plateau', () => {
  const r = runBodyweight([8, 8, 9, 9, 10, 10, 11, 11])
  assert.equal(r.status, 'none')
  assert.equal(r.metric, 'reps')
})

test('bodyweight: flat reps is a plateau', () => {
  const r = runBodyweight([10, 10, 10, 10, 10, 10, 10, 10])
  assert.equal(r.status, 'plateau')
  assert.equal(r.metric, 'reps')
})

test('mixed weighted and 0 kg window stays on e1RM', () => {
  const mixed = [0, 0, 0, 20, 20, 20, 20, 20].map((w) => ({ best_e1rm: w * 1.3, top_weight_kg: w, best_reps: 10 }))
  assert.equal(detectPlateau(mixed, P).metric, 'e1rm')
})
