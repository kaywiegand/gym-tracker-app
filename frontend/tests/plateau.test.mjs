// Run with: npm test (Node strips the TypeScript types itself).
import test from 'node:test'
import assert from 'node:assert/strict'
import { detectPlateau } from '../src/lib/plateau.ts'

const P = 6
const run = (seq) => detectPlateau(seq.map((best_e1rm) => ({ best_e1rm })), P)

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
