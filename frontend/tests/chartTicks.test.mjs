// Run with: npm test (Node strips the TypeScript types itself).
import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseDateTicks } from '../src/lib/chartTicks.ts'

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T10:00:00Z`

test('few sessions on a wide chart: every index', () => {
  const dates = [iso(2026, 1, 3), iso(2026, 1, 10), iso(2026, 2, 1), iso(2026, 2, 8)]
  assert.deepEqual(chooseDateTicks(dates, 300), { tickIndices: [0, 1, 2, 3], mode: 'session' })
})

test('40 sessions over 10 months in 300px: first-of-month ticks', () => {
  // 4 sessions per month, Jan-Oct
  const dates = Array.from({ length: 40 }, (_, i) => iso(2026, 1 + Math.floor(i / 4), 1 + (i % 4) * 7))
  const r = chooseDateTicks(dates, 300)
  assert.equal(r.mode, 'month')
  assert.deepEqual(r.tickIndices, [0, 4, 8, 12, 16, 20, 24, 28, 32, 36])
})

test('many months in tiny width: months thinned, first kept', () => {
  // 1 session per month over 24 months in 120px -> ~5px per month, needs every 3rd
  const dates = Array.from({ length: 24 }, (_, i) => iso(2025 + Math.floor(i / 12), 1 + (i % 12), 5))
  const r = chooseDateTicks(dates, 120)
  assert.equal(r.mode, 'month')
  assert.equal(r.tickIndices[0], 0)
  assert.ok(r.tickIndices.length < 24)
  const perIdx = 120 / 23
  for (let i = 1; i < r.tickIndices.length; i++) {
    assert.ok((r.tickIndices[i] - r.tickIndices[i - 1]) * perIdx >= 13)
  }
})
