<?php
declare(strict_types=1);

// One-off export for BACKLOG #47 (title review across the whole library):
// a flat list of every exercise with its computed title, subtitle and the
// original source name, so Kay can go through it outside the app.
//
//   php scripts/export-exercise-titles.php <db-path> <out.csv>

require __DIR__ . '/../api/lib/ExerciseNaming.php';

[, $dbPath, $outPath] = $argv + [null, null, null];
if ($dbPath === null || $outPath === null) {
    fwrite(STDERR, "usage: php scripts/export-exercise-titles.php <db-path> <out.csv>\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$sql = "SELECT e.id, e.name, e.movement, e.variant, e.display_alias, e.is_curated,
               e.equipment, e.category,
               (SELECT mu.name_en FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                WHERE em.exercise_id = e.id AND em.role = 'primary' ORDER BY mu.sort LIMIT 1) AS primary_muscle,
               (SELECT mu.region FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                WHERE em.exercise_id = e.id AND em.role = 'primary' ORDER BY mu.sort LIMIT 1) AS region
        FROM exercises e
        WHERE e.deleted_at IS NULL
        ORDER BY region, movement IS NULL, primary_muscle, movement, equipment, variant, name";

$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
$rows = ExerciseNaming::decorateAll($rows);

$out = fopen($outPath, 'w');
fputcsv($out, ['id', 'region', 'primary_muscle', 'title', 'subtitle', 'original_name', 'is_curated'], escape: '\\');
foreach ($rows as $row) {
    fputcsv($out, [
        $row['id'],
        $row['region'] ?? '',
        $row['primary_muscle'] ?? '',
        $row['display_name'],
        $row['display_subtitle'],
        $row['name'],
        $row['is_curated'] ? 'yes' : 'no',
    ], escape: '\\');
}
fclose($out);

fwrite(STDERR, count($rows) . " exercises written to {$outPath}\n");
