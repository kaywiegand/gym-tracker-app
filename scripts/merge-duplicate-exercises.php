<?php
declare(strict_types=1);

// Merge exercises that resolve to the same nomenclature title.
//
//   php scripts/merge-duplicate-exercises.php <source.db> <out.json>
//
// The title is muscle + movement + equipment + variant. Two rows landing on
// the same one are the same exercise as far as this app is concerned, so they
// are folded into a single row instead of sitting next to each other in the
// picker looking identical.
//
// Emits a backup-restore file rather than writing to the database: that is
// the only channel to the live server, and it is a tested one. The file
//   * repoints every set and workout_exercise onto the surviving row, and
//   * soft-deletes the rows that were folded away.
// Ids are untouched, so the restore updates in place and a second run is a
// no-op rather than a duplicate.
//
// Survivor per group, in order: a curated row wins (its title was checked by
// hand), then the one with the most logged sets, then the oldest.

require __DIR__ . '/../api/bootstrap.php';

[$script, $dbPath, $outPath] = $argv + [null, null, null];
if ($dbPath === null || $outPath === null) {
    fwrite(STDERR, "usage: php scripts/merge-duplicate-exercises.php <source.db> <out.json>\n");
    exit(1);
}

Db::setOverrides(['sqlite_path' => $dbPath]);
$db = Db::connection();
$now = gmdate('Y-m-d\TH:i:s\Z');

$setCounts = [];
foreach ($db->query('SELECT exercise_id, COUNT(*) c FROM sets WHERE deleted_at IS NULL GROUP BY exercise_id') as $row) {
    $setCounts[$row['exercise_id']] = (int) $row['c'];
}

// Grouped on a normalised title, not the literal one: "Wide-Grip" and
// "Wide Grip" are the same variant written two ways, and an exact-string
// group would leave them side by side looking like two exercises.
$normalise = static function (string $title): string {
    return preg_replace('/\s+/', ' ', trim(strtolower((string) preg_replace('/[^a-z0-9]+/i', ' ', $title))));
};

$byTitle = [];
foreach ((new ExerciseRepository())->list(null, null, null) as $e) {
    $byTitle[$normalise($e['display_name'])][] = $e;
}

$exerciseRows = [];
$remap = [];   // folded id => surviving id
$groups = 0;

foreach ($byTitle as $title => $rows) {
    if (count($rows) < 2) {
        continue;
    }
    usort($rows, static function (array $a, array $b) use ($setCounts): int {
        return [(int) $b['is_curated'], $setCounts[$b['id']] ?? 0, $a['created_at'] ?? '']
            <=> [(int) $a['is_curated'], $setCounts[$a['id']] ?? 0, $b['created_at'] ?? ''];
    });

    $keep = array_shift($rows);
    $groups++;
    foreach ($rows as $drop) {
        $remap[$drop['id']] = $keep['id'];
        $full = (new ExerciseRepository())->find($drop['id']);
        $exerciseRows[] = [
            'id' => $drop['id'],
            'name' => $full['name'],
            'movement' => $full['movement'],
            'variant' => $full['variant'],
            'display_alias' => $full['display_alias'],
            'is_curated' => 0,
            'equipment' => $full['equipment'],
            'mechanic' => $full['mechanic'],
            'category' => $full['category'],
            'default_increment_kg' => $full['default_increment_kg'],
            'source' => $full['source'],
            'external_id' => $full['external_id'],
            'created_at' => $full['created_at'],
            'updated_at' => $now,
            'deleted_at' => $now,
        ];
    }
}

function repoint(PDO $db, string $table, array $remap, string $now): array
{
    if ($remap === []) {
        return [];
    }
    $out = [];
    $in = implode(',', array_fill(0, count($remap), '?'));
    $stmt = $db->prepare("SELECT * FROM {$table} WHERE exercise_id IN ({$in}) AND deleted_at IS NULL");
    $stmt->execute(array_keys($remap));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $row['exercise_id'] = $remap[$row['exercise_id']];
        $row['updated_at'] = $now;
        $out[] = $row;
    }
    return $out;
}

$sets = repoint($db, 'sets', $remap, $now);
$workoutExercises = repoint($db, 'workout_exercises', $remap, $now);

file_put_contents($outPath, json_encode([
    'exported_at' => $now,
    'source' => 'merge-duplicate-exercises',
    'tables' => [
        'exercises' => $exerciseRows,
        'workout_exercises' => $workoutExercises,
        'sets' => $sets,
    ],
], JSON_UNESCAPED_UNICODE));

printf("groups merged     %d\n", $groups);
printf("exercises folded  %d\n", count($exerciseRows));
printf("sets repointed    %d\n", count($sets));
printf("workout_exercises %d\n", count($workoutExercises));
