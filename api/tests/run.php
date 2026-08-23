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
$pdo->exec("INSERT INTO muscle_volume_targets (region, mev, mav, mrv) VALUES
    ('chest', 8, 16, 22), ('arms', 6, 14, 22), ('shoulders', 8, 16, 24)");

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

echo "MuscleVolume (pure engine)\n";

check('isoWeekStart on a Monday returns itself', MuscleVolume::isoWeekStart('2026-02-16T00:00:00Z') === '2026-02-16', $failures);
check('isoWeekStart mid-week returns that week\'s Monday', MuscleVolume::isoWeekStart('2026-02-18T10:00:00Z') === '2026-02-16', $failures);
check('isoWeekStart on a Sunday returns the same week\'s Monday', MuscleVolume::isoWeekStart('2026-02-22T23:59:00Z') === '2026-02-16', $failures);

$volumeRows = [
    // this week (2026-02-16..22): chest primary + chest-as-secondary (from a shoulder press), arms primary
    ['performed_at' => '2026-02-17T10:00:00Z', 'weight_kg' => 100, 'reps' => 8, 'muscle_weight' => 1.0, 'region' => 'chest'],
    ['performed_at' => '2026-02-17T10:05:00Z', 'weight_kg' => 50, 'reps' => 10, 'muscle_weight' => 0.5, 'region' => 'chest'],
    ['performed_at' => '2026-02-17T10:10:00Z', 'weight_kg' => 40, 'reps' => 10, 'muscle_weight' => 1.0, 'region' => 'arms'],
    // last week (2026-02-09..15): chest primary only
    ['performed_at' => '2026-02-10T10:00:00Z', 'weight_kg' => 90, 'reps' => 8, 'muscle_weight' => 1.0, 'region' => 'chest'],
];
$byRegion = MuscleVolume::weeklyByRegion($volumeRows, 8, '2026-02-18T12:00:00Z');

check('weeklyByRegion produces 8 week buckets', count($byRegion['chest']['weeks']) === 8, $failures);
check('weeklyByRegion sums weighted sets this week (1.0 + 0.5)', abs($byRegion['chest']['this_week']['sets'] - 1.5) < 0.001, $failures);
check('weeklyByRegion sums weighted volume this week (800 + 250)', abs($byRegion['chest']['this_week']['volume_kg'] - 1050.0) < 0.001, $failures);
check(
    'weeklyByRegion best_e1rm is a max, not weighted/summed',
    abs($byRegion['chest']['this_week']['best_e1rm'] - (100 * (1 + 8 / 30))) < 0.001,
    $failures
);
check('weeklyByRegion carries last week\'s data separately', abs($byRegion['chest']['last_week']['sets'] - 1.0) < 0.001, $failures);
check('weeklyByRegion zero-fills a region\'s week with no sets', $byRegion['arms']['last_week']['sets'] === 0.0, $failures);
check('weeklyByRegion omits a region with no rows at all', !array_key_exists('shoulders', $byRegion), $failures);

$dailyRows = [
    ['performed_at' => '2026-03-01T09:00:00Z', 'weight_kg' => 100, 'reps' => 10],
    ['performed_at' => '2026-03-01T09:10:00Z', 'weight_kg' => 50, 'reps' => 5],
    ['performed_at' => '2026-03-02T09:00:00Z', 'weight_kg' => 80, 'reps' => 8],
];
$daily = MuscleVolume::dailyTotals($dailyRows);
check('dailyTotals sums same-day sets (1000 + 250)', abs($daily['2026-03-01'] - 1250.0) < 0.001, $failures);
check('dailyTotals keeps separate days apart', abs($daily['2026-03-02'] - 640.0) < 0.001, $failures);

$acwrDaily = [];
for ($i = 0; $i < 7; $i++) {
    $acwrDaily[gmdate('Y-m-d', strtotime("2026-03-15 -{$i} days"))] = 200.0; // acute: 7 days × 200 = 1400
}
for ($i = 7; $i < 28; $i++) {
    $acwrDaily[gmdate('Y-m-d', strtotime("2026-03-15 -{$i} days"))] = 100.0; // remaining 21 days × 100 = 2100
}
$acwr = MuscleVolume::acwr($acwrDaily, '2026-03-15T12:00:00Z');
check('acwr sums the acute (last 7 days) window', abs($acwr['acute_kg'] - 1400.0) < 0.001, $failures);
check('acwr chronic is 28-day total / 4', abs($acwr['chronic_kg'] - ((1400 + 2100) / 4)) < 0.001, $failures);
check('acwr ratio divides acute by chronic weekly average', abs($acwr['ratio'] - (1400 / ((1400 + 2100) / 4))) < 0.001, $failures);
check('acwr with no history returns a zero ratio (no division by zero)', MuscleVolume::acwr([], '2026-03-15T12:00:00Z')['ratio'] === 0.0, $failures);

echo "MuscleVolume + repositories (real joins)\n";
$muscleVolExercise = $exRepo->create([
    'name' => 'Test Incline Press',
    'muscles' => [
        ['muscle_id' => 1, 'role' => 'primary', 'weight' => 1.0],
        ['muscle_id' => 6, 'role' => 'secondary', 'weight' => 0.5],
    ],
]);
$recentIso = gmdate('Y-m-d\TH:i:s\Z', time() - 3600);
$setRepo->upsert([
    'id' => 'set-mv-1', 'session_id' => 'sess-mv', 'exercise_id' => $muscleVolExercise['id'],
    'set_index' => 0, 'weight_kg' => 70, 'reps' => 8,
    'performed_at' => $recentIso, 'updated_at' => $recentIso,
]);

$rawRows = $setRepo->rawSetsWithMuscles(7);
$mvRows = array_values(array_filter($rawRows, fn ($r) => $r['weight_kg'] == 70 && $r['reps'] == 8));
check('rawSetsWithMuscles produces one row per muscle mapping', count($mvRows) === 2, $failures);
$byChest = array_values(array_filter($mvRows, fn ($r) => $r['region'] === 'chest'));
$byShoulders = array_values(array_filter($mvRows, fn ($r) => $r['region'] === 'shoulders'));
check('rawSetsWithMuscles: primary chest row weighted 1.0', count($byChest) === 1 && (float) $byChest[0]['muscle_weight'] === 1.0, $failures);
check('rawSetsWithMuscles: secondary shoulders row weighted 0.5', count($byShoulders) === 1 && (float) $byShoulders[0]['muscle_weight'] === 0.5, $failures);

$dailyVolRows = $setRepo->dailyVolume(7);
check('dailyVolume includes the just-logged set', count(array_filter($dailyVolRows, fn ($r) => (float) $r['weight_kg'] === 70.0 && (int) $r['reps'] === 8)) === 1, $failures);
check('dailyVolume(0) excludes it (outside the window)', $setRepo->dailyVolume(0) === [], $failures);

$targets = (new MuscleRepository())->volumeTargets();
check('volumeTargets returns seeded regions', $targets['chest'] === ['mev' => 8, 'mav' => 16, 'mrv' => 22], $failures);
check('volumeTargets covers all three seeded regions', count($targets) === 3, $failures);

echo "MuscleVolume Part 2 (weekly totals, ACWR series) + dashboard repositories\n";

$weeklyDaily = ['2026-04-06' => 100.0, '2026-04-07' => 50.0, '2026-04-13' => 200.0];
$weeklyTotals = MuscleVolume::weeksFromDaily($weeklyDaily, 3, '2026-04-21T10:00:00Z');
check('weeksFromDaily returns requested number of weeks', count($weeklyTotals) === 3, $failures);
check('weeksFromDaily orders oldest first', array_column($weeklyTotals, 'week_start') === ['2026-04-06', '2026-04-13', '2026-04-20'], $failures);
check('weeksFromDaily sums same-week days (100 + 50)', abs($weeklyTotals[0]['volume_kg'] - 150.0) < 0.001, $failures);
check('weeksFromDaily keeps a data-less week at zero', $weeklyTotals[2]['volume_kg'] === 0.0, $failures);

$flatDaily = [];
for ($i = 0; $i < 60; $i++) {
    $flatDaily[gmdate('Y-m-d', strtotime("2026-05-10 -{$i} days"))] = 100.0;
}
$acwrSeries = MuscleVolume::acwrWeeklySeries($flatDaily, 4, '2026-05-10T12:00:00Z');
check('acwrWeeklySeries returns requested number of weeks', count($acwrSeries) === 4, $failures);
check(
    'acwrWeeklySeries ratio is ~1.0 throughout for constant daily volume',
    array_reduce($acwrSeries, fn ($ok, $w) => $ok && abs($w['ratio'] - 1.0) < 0.01, true),
    $failures
);

$splitWorkout = $woRepo->create(['name' => 'Test Split Workout', 'mode_id' => 2, 'exercises' => []]);
$sessionRepo->upsert(['id' => 'sess-split-1', 'workout_id' => $splitWorkout['id'], 'started_at' => '2026-04-01T10:00:00Z', 'ended_at' => '2026-04-01T10:30:00Z', 'updated_at' => '2026-04-01T10:30:00Z']);
$sessionRepo->upsert(['id' => 'sess-split-2', 'workout_id' => $splitWorkout['id'], 'started_at' => '2026-04-08T10:00:00Z', 'ended_at' => '2026-04-08T10:45:00Z', 'updated_at' => '2026-04-08T10:45:00Z']);
$setRepo->upsert(['id' => 'set-split-1', 'session_id' => 'sess-split-1', 'exercise_id' => $muscleVolExercise['id'], 'set_index' => 0, 'weight_kg' => 60, 'reps' => 8, 'performed_at' => '2026-04-01T10:05:00Z', 'updated_at' => '2026-04-01T10:05:00Z']);
$setRepo->upsert(['id' => 'set-split-2', 'session_id' => 'sess-split-2', 'exercise_id' => $muscleVolExercise['id'], 'set_index' => 0, 'weight_kg' => 62, 'reps' => 8, 'performed_at' => '2026-04-08T10:05:00Z', 'updated_at' => '2026-04-08T10:05:00Z']);

$split = $setRepo->muscleSplitForWorkout($splitWorkout['id']);
check('muscleSplitForWorkout returns one entry per session', count($split) === 2, $failures);
check('muscleSplitForWorkout orders oldest first', $split[0]['session_id'] === 'sess-split-1', $failures);
check('muscleSplitForWorkout weights the primary region 1.0', abs($split[0]['by_region']['chest'] - 1.0) < 0.001, $failures);
check('muscleSplitForWorkout weights the secondary region 0.5', abs($split[0]['by_region']['shoulders'] - 0.5) < 0.001, $failures);
check('muscleSplitForWorkout carries ended_at', $split[1]['ended_at'] === '2026-04-08T10:45:00Z', $failures);

$summaries = $setRepo->sessionSummariesForExercise($muscleVolExercise['id']);
check('sessionSummariesForExercise returns one entry per session', count($summaries) === 2, $failures);
check('sessionSummariesForExercise orders oldest first', array_column($summaries, 'session_id') === ['sess-split-1', 'sess-split-2'], $failures);
check('sessionSummariesForExercise keeps per-set weight/reps', $summaries[0]['sets'] === [['weight_kg' => 60.0, 'reps' => 8]], $failures);

$sessionRepo->upsert(['id' => 'sess-recent', 'workout_id' => $wo['id'], 'started_at' => $recentIso, 'updated_at' => $recentIso]);
$recentDates = (new SessionRepository())->recentDates(7);
check('recentDates includes a session started moments ago', in_array(gmdate('Y-m-d'), $recentDates, true), $failures);
check('recentDates excludes sessions outside the window', !in_array('2026-04-01', $recentDates, true), $failures);

@unlink($dbPath);

if ($failures) {
    fwrite(STDERR, "\n" . count($failures) . " failure(s):\n  - " . implode("\n  - ", $failures) . "\n");
    exit(1);
}

echo "\nAll checks passed.\n";
