// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { groupExercises, isPrimaryMatch } from '../src/lib/exerciseGrouping.ts'

const ex = (id, group_name, variant_name, is_used = 0) => ({ id, group_name, variant_name, display_name: `${group_name} ${variant_name}`, is_used })

test('variants collapse into one group', () => {
  const groups = groupExercises([
    ex('a', 'Triceps Extension', 'Cable Low'),
    ex('b', 'Triceps Extension', 'Barbell Incline'),
    ex('c', 'Triceps Kickback', 'Dumbbell'),
  ])
  assert.deepEqual(groups.map((g) => [g.name, g.items.length]), [['Triceps Extension', 2], ['Triceps Kickback', 1]])
})

test('trained variants come first, the rest alphabetical', () => {
  const [group] = groupExercises([ex('a', 'Curl', 'Barbell'), ex('b', 'Curl', 'Zottman'), ex('c', 'Curl', 'Hammer', 1)])
  assert.deepEqual(group.items.map((i) => i.id), ['c', 'a', 'b'])
  assert.equal(group.isUsed, true)
})

test('groups are alphabetical', () => {
  assert.deepEqual(groupExercises([ex('a', 'Row', 'x'), ex('b', 'Chest Press', 'y')]).map((g) => g.name), ['Chest Press', 'Row'])
})

test('a stale offline copy without group fields lists every exercise alone', () => {
  const groups = groupExercises([{ id: 'a', display_name: 'A', is_used: 0 }, { id: 'b', display_name: 'B', is_used: 0 }])
  assert.equal(groups.length, 2)
})

test('primary match: the main muscle, not an assisting one', () => {
  const press = { region: 'legs', primary_focus: ['Quads'], focus: ['Quads', 'Glutes'] }
  assert.equal(isPrimaryMatch(press, 'legs', 'Quads'), true)
  assert.equal(isPrimaryMatch(press, 'legs', 'Glutes'), false)
  assert.equal(isPrimaryMatch(press, 'chest', null), false)
  assert.equal(isPrimaryMatch(press, null, null), true)
})

test('primary match: hammer curls are real brachialis work', () => {
  assert.equal(isPrimaryMatch({ region: 'arms', primary_focus: ['Biceps', 'Brachialis'] }, 'arms', 'Brachialis'), true)
})

test('primary match: an exercise without a part of its own is assisting', () => {
  assert.equal(isPrimaryMatch({ region: 'core', primary_focus: [], focus: ['Glutes'] }, 'legs', 'Glutes'), false)
})
