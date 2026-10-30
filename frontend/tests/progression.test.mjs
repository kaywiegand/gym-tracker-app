// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestNext } from '../src/lib/progression.ts'

const sets = (...entries) => entries.map(([weight_kg, reps, is_warmup = 0]) => ({ weight_kg, reps, is_warmup }))
const hypertrophy = { repLow: 6, repHigh: 10, incrementKg: 2.5, roundingKg: 2.5, trigger: 'all_sets' }
const suggest = (lastSets, overrides = {}) => suggestNext({ ...hypertrophy, lastSets, ...overrides })

test('no history: no weight, bottom of the range', () => {
  const r = suggest([])
  assert.equal(r.weightKg, null)
  assert.equal(r.reps, 6)
})

test('only warm-ups count as no history', () => {
  assert.equal(suggest(sets([20, 10, 1], [30, 8, 1])).weightKg, null)
})

test('all_sets: every set at the top adds the step and drops to the bottom', () => {
  const r = suggest(sets([60, 10], [60, 10], [60, 12]))
  assert.equal(r.weightKg, 62.5)
  assert.equal(r.reps, 6)
  assert.match(r.reason, /10, 10, 12 reps/)
})

test('all_sets: one set short keeps the weight and works the reps up', () => {
  const r = suggest(sets([60, 10], [60, 10], [60, 9]))
  assert.equal(r.weightKg, 60)
  assert.equal(r.reps, 10)
  assert.match(r.reason, /same weight/)
})

test('last_set: only the last working set decides', () => {
  assert.equal(suggest(sets([60, 8], [60, 8], [60, 10]), { trigger: 'last_set' }).weightKg, 62.5)
  assert.equal(suggest(sets([60, 10], [60, 10], [60, 9]), { trigger: 'last_set' }).weightKg, 60)
})

test('warm-ups do not block the step', () => {
  assert.equal(suggest(sets([20, 5, 1], [60, 10], [60, 10])).weightKg, 62.5)
})

test('the last working set sets the base weight', () => {
  assert.equal(suggest(sets([70, 10], [60, 10])).weightKg, 62.5)
})

test('the mode decides the ceiling', () => {
  assert.equal(suggest(sets([100, 5], [100, 5]), { repLow: 3, repHigh: 5 }).weightKg, 102.5)
})

test('without rounding the step is exact', () => {
  assert.equal(suggest(sets([20, 10]), { incrementKg: 1.25, roundingKg: 0 }).weightKg, 21.25)
})

test('rounding lands on the configured grid', () => {
  assert.equal(suggest(sets([21, 10]), { incrementKg: 2.5, roundingKg: 2.5 }).weightKg, 22.5)
})
