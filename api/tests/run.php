<?php
declare(strict_types=1);

// Dependency-free smoke tests for the repository layer. No PHPUnit --
// keeps the backend "dependency-frei" per CLAUDE.md §3/§12. Run with:
//   php api/tests/run.php
// Uses a throwaway SQLite file, never touches db/fitness.db.

require __DIR__ . '/../bootstrap.php';

$dbPath = sys_get_temp_dir() . '/gym_tracker_test_' . uniqid() . '.db';
Db::setOverrides(['sqlite_path' => $dbPath]);
$pdo = Db::connection();

$schema = file_get_contents(__DIR__ . '/../../db/schema.sql');
foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
    $pdo->exec($statement);
}

$pdo->exec("INSERT INTO muscles (id, name_en, region, sort) VALUES
    (1, 'Chest', 'chest', 1), (2, 'Triceps', 'arms', 2), (6, 'Shoulders', 'shoulders', 6)");
$pdo->exec("INSERT INTO training_modes (id, key, name, rep_low, rep_high, sort) VALUES
    (1, 'strength', 'Strength', 3, 5, 1), (2, 'hypertrophy', 'Hypertrophy', 6, 10, 2)");

$failures = [];

function check(string $label, bool $cond, array &$failures): void
{
    echo ($cond ? '  ok   ' : '  FAIL ') . $label . "\n";
    if (!$cond) {
        $failures[] = $label;
    }
}

echo "ExerciseRepository\n";
$exRepo = new ExerciseRepository();
$created = $exRepo->create([
    'name' => 'Test Bench Press',
    'equipment' => 'barbell',
    'mechanic' => 'compound',
    'category' => 'strength',
    'muscles' => [
        ['muscle_id' => 1, 'role' => 'primary', 'weight' => 1.0],
        ['muscle_id' => 2, 'role' => 'secondary', 'weight' => 0.5],
    ],
]);
check('create returns exercise with id', isset($created['id']), $failures);
check('create copies muscles', count($created['muscles']) === 2, $failures);

$found = $exRepo->find($created['id']);
check('find returns created exercise', $found !== null && $found['name'] === 'Test Bench Press', $failures);
check('find returns null for unknown id', $exRepo->find('nope') === null, $failures);

check('list finds by search term', count($exRepo->list('Test Bench', null, null)) === 1, $failures);
check('list filters by matching region', count($exRepo->list(null, 'chest', null)) === 1, $failures);
check('list excludes non-matching region', count($exRepo->list(null, 'legs', null)) === 0, $failures);

$updated = $exRepo->update($created['id'], ['name' => 'Renamed Bench']);
check('update changes name', $updated !== null && $updated['name'] === 'Renamed Bench', $failures);
check('update preserves untouched fields', $updated['equipment'] === 'barbell', $failures);
check('update returns null for unknown id', $exRepo->update('nope', ['name' => 'x']) === null, $failures);

echo "WorkoutRepository\n";
$woRepo = new WorkoutRepository();
$wo = $woRepo->create([
    'name' => 'Test Push',
    'mode_id' => 2,
    'exercises' => [
        ['exercise_id' => $created['id'], 'planned_sets' => 3],
    ],
]);
check('create workout returns id', isset($wo['id']), $failures);
check('create workout has 1 exercise', count($wo['exercises']) === 1, $failures);
check('create workout carries mode name', $wo['mode_key'] === 'hypertrophy', $failures);

$woUpdated = $woRepo->update($wo['id'], [
    'name' => 'Test Push Updated',
    'mode_id' => 1,
    'exercises' => [],
]);
check('update replaces exercise list (now empty)', $woUpdated !== null && count($woUpdated['exercises']) === 0, $failures);
check('update switches mode', $woUpdated['mode_key'] === 'strength', $failures);
check('update returns null for unknown id', $woRepo->update('nope', ['name' => 'x', 'mode_id' => 1]) === null, $failures);

check('soft delete returns true once', $woRepo->softDelete($wo['id']) === true, $failures);
check('soft delete returns false on repeat', $woRepo->softDelete($wo['id']) === false, $failures);
check('deleted workout missing from list', !in_array($wo['id'], array_column($woRepo->list(), 'id'), true), $failures);
check('deleted workout not findable', $woRepo->find($wo['id']) === null, $failures);

echo "SessionRepository / SetRepository / BodyweightRepository\n";
$sessionRepo = new SessionRepository();
$sess = $sessionRepo->upsert([
    'id' => 'sess-1',
    'workout_id' => $wo['id'],
    'started_at' => '2026-01-01T10:00:00Z',
    'updated_at' => '2026-01-01T10:00:00Z',
]);
check('session upsert inserts', $sess['id'] === 'sess-1', $failures);

$staleSession = $sessionRepo->upsert([
    'id' => 'sess-1',
    'workout_id' => $wo['id'],
    'started_at' => '2026-01-01T10:00:00Z',
    'note' => 'STALE',
    'updated_at' => '2025-01-01T00:00:00Z',
]);
check('session upsert ignores older updated_at (last-write-wins)', $staleSession['note'] === null, $failures);

$freshSession = $sessionRepo->upsert([
    'id' => 'sess-1',
    'workout_id' => $wo['id'],
    'started_at' => '2026-01-01T10:00:00Z',
    'note' => 'FRESH',
    'ended_at' => '2026-01-01T11:00:00Z',
    'updated_at' => '2026-01-01T11:00:00Z',
]);
check('session upsert applies newer updated_at', $freshSession['note'] === 'FRESH', $failures);

$setRepo = new SetRepository();
$setRepo->upsert([
    'id' => 'set-old', 'session_id' => 'sess-old', 'exercise_id' => $created['id'],
    'set_index' => 0, 'weight_kg' => 55, 'reps' => 10,
    'performed_at' => '2025-06-01T10:00:00Z', 'updated_at' => '2025-06-01T10:00:00Z',
]);
$setRepo->upsert([
    'id' => 'set-1', 'session_id' => 'sess-1', 'exercise_id' => $created['id'],
    'set_index' => 0, 'weight_kg' => 60, 'reps' => 10,
    'performed_at' => '2026-01-01T10:05:00Z', 'updated_at' => '2026-01-01T10:05:00Z',
]);
$setRepo->upsert([
    'id' => 'set-2', 'session_id' => 'sess-1', 'exercise_id' => $created['id'],
    'set_index' => 1, 'weight_kg' => 62.5, 'reps' => 8,
    'performed_at' => '2026-01-01T10:10:00Z', 'updated_at' => '2026-01-01T10:10:00Z',
]);

$lastSets = $setRepo->lastSetsForExercise($created['id']);
check('lastSetsForExercise returns only the most recent session', count($lastSets) === 2, $failures);
check('lastSetsForExercise excludes older session', !in_array('sess-old', array_column($lastSets, 'session_id'), true), $failures);
check('lastSetsForExercise orders by set_index', $lastSets[0]['set_index'] === 0 && $lastSets[1]['set_index'] === 1, $failures);
check('lastSetsForExercise for unknown exercise is empty', $setRepo->lastSetsForExercise('nope') === [], $failures);

$histExercise = $exRepo->create(['name' => 'Test History Exercise', 'muscles' => []]);
$sessionRepo->upsert(['id' => 'sess-hist-1', 'workout_id' => $wo['id'], 'started_at' => '2026-02-01T10:00:00Z', 'updated_at' => '2026-02-01T10:00:00Z']);
$sessionRepo->upsert(['id' => 'sess-hist-2', 'workout_id' => $wo['id'], 'started_at' => '2026-02-08T10:00:00Z', 'updated_at' => '2026-02-08T10:00:00Z']);
$sessionRepo->upsert(['id' => 'sess-hist-3', 'workout_id' => $wo['id'], 'started_at' => '2026-02-15T10:00:00Z', 'updated_at' => '2026-02-15T10:00:00Z']);
$setRepo->upsert([
    'id' => 'set-hist-1', 'session_id' => 'sess-hist-1', 'exercise_id' => $histExercise['id'],
    'set_index' => 0, 'weight_kg' => 100, 'reps' => 5,
    'performed_at' => '2026-02-01T10:05:00Z', 'updated_at' => '2026-02-01T10:05:00Z',
]);
$setRepo->upsert([
    'id' => 'set-hist-2', 'session_id' => 'sess-hist-2', 'exercise_id' => $histExercise['id'],
    'set_index' => 0, 'weight_kg' => 102.5, 'reps' => 5,
    'performed_at' => '2026-02-08T10:05:00Z', 'updated_at' => '2026-02-08T10:05:00Z',
]);
$setRepo->upsert([
    'id' => 'set-hist-3', 'session_id' => 'sess-hist-3', 'exercise_id' => $histExercise['id'],
    'set_index' => 0, 'weight_kg' => 105, 'reps' => 5,
    'performed_at' => '2026-02-15T10:05:00Z', 'updated_at' => '2026-02-15T10:05:00Z',
]);
$setRepo->upsert([
    'id' => 'set-hist-3-warmup', 'session_id' => 'sess-hist-3', 'exercise_id' => $histExercise['id'],
    'set_index' => 1, 'weight_kg' => 40, 'reps' => 10, 'is_warmup' => 1,
    'performed_at' => '2026-02-15T10:00:00Z', 'updated_at' => '2026-02-15T10:00:00Z',
]);

$history = $setRepo->historyForExercise($histExercise['id']);
check('historyForExercise returns one row per session', count($history) === 3, $failures);
check('historyForExercise orders oldest first', array_column($history, 'session_id') === ['sess-hist-1', 'sess-hist-2', 'sess-hist-3'], $failures);
check('historyForExercise excludes warmup sets from volume', abs($history[2]['volume_kg'] - 525.0) < 0.001, $failures);
check('historyForExercise computes Epley e1RM', abs($history[0]['best_e1rm'] - (100 * (1 + 5 / 30))) < 0.001, $failures);
check('historyForExercise volume is Σ weight×reps', abs($history[1]['volume_kg'] - 512.5) < 0.001, $failures);

$limitedHistory = $setRepo->historyForExercise($histExercise['id'], 2);
check('historyForExercise respects limit', count($limitedHistory) === 2, $failures);
check('historyForExercise limit keeps most recent sessions', array_column($limitedHistory, 'session_id') === ['sess-hist-2', 'sess-hist-3'], $failures);
check('historyForExercise for unknown exercise is empty', $setRepo->historyForExercise('nope') === [], $failures);

$bwRepo = new BodyweightRepository();
$bwRepo->upsert(['id' => 'bw-1', 'measured_at' => '2026-01-01', 'weight_kg' => 80.0, 'updated_at' => '2026-01-01T08:00:00Z']);
$bwRepo->upsert(['id' => 'bw-2', 'measured_at' => '2026-01-02', 'weight_kg' => 79.6, 'updated_at' => '2026-01-02T08:00:00Z']);
$recent = $bwRepo->recent(30);
check('bodyweight recent returns both entries', count($recent) === 2, $failures);
check('bodyweight recent orders newest first', $recent[0]['measured_at'] === '2026-01-02', $failures);

@unlink($dbPath);

if ($failures) {
    fwrite(STDERR, "\n" . count($failures) . " failure(s):\n  - " . implode("\n  - ", $failures) . "\n");
    exit(1);
}

echo "\nAll checks passed.\n";
