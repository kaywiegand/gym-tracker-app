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

@unlink($dbPath);

if ($failures) {
    fwrite(STDERR, "\n" . count($failures) . " failure(s):\n  - " . implode("\n  - ", $failures) . "\n");
    exit(1);
}

echo "\nAll checks passed.\n";
