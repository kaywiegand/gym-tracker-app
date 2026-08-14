<?php
declare(strict_types=1);

// Imports the vendored Free Exercise DB snapshot (public domain,
// https://github.com/yuhonas/free-exercise-db) into exercises,
// exercise_muscles and media. Vendored rather than fetched at migrate time
// so this works without outbound internet on shared hosting.

return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query("SELECT COUNT(*) FROM exercises WHERE source = 'fedb'")->fetchColumn();
    if ($existing > 0 && !$args['force']) {
        echo "   exercises already seeded ({$existing} from fedb), skipping (pass --force to re-import)\n";
        return;
    }

    if ($existing > 0 && $args['force']) {
        echo "   --force: removing previous fedb import ({$existing} exercises)...\n";
        $pdo->exec("DELETE FROM media WHERE exercise_id IN (SELECT id FROM exercises WHERE source = 'fedb')");
        $pdo->exec("DELETE FROM exercise_muscles WHERE exercise_id IN (SELECT id FROM exercises WHERE source = 'fedb')");
        $pdo->exec("DELETE FROM exercises WHERE source = 'fedb'");
    }

    $jsonPath = __DIR__ . '/fedb-exercises.json';
    $data = json_decode((string) file_get_contents($jsonPath), true, flags: JSON_THROW_ON_ERROR);

    $taxonomy = require __DIR__ . '/muscle_taxonomy.php';
    $muscleIdByKey = [];
    foreach ($taxonomy as $row) {
        $muscleIdByKey[$row['key']] = $row['sort'];
    }

    $insertExercise = $pdo->prepare(
        'INSERT INTO exercises (id, name, movement, equipment, mechanic, category, default_increment_kg, source, external_id, created_at, updated_at, deleted_at)
         VALUES (:id, :name, :movement, :equipment, :mechanic, :category, NULL, :source, :external_id, :created_at, :updated_at, NULL)'
    );
    $insertMuscle = $pdo->prepare(
        'INSERT INTO exercise_muscles (exercise_id, muscle_id, role, weight) VALUES (?, ?, ?, ?)'
    );
    $insertMedia = $pdo->prepare(
        'INSERT INTO media (id, kind, exercise_id, bia_measurement_id, path, mime, sort, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)'
    );

    $now = gmdate('Y-m-d\TH:i:s\Z');
    $imported = 0;
    $skippedMuscles = [];

    $pdo->beginTransaction();
    try {
        foreach ($data as $e) {
            $id = Uuid::v4();
            $insertExercise->execute([
                ':id' => $id,
                ':name' => $e['name'],
                ':movement' => $e['name'],
                ':equipment' => $e['equipment'] ?? null,
                ':mechanic' => $e['mechanic'] ?? null,
                ':category' => $e['category'] ?? null,
                ':source' => 'fedb',
                ':external_id' => $e['id'],
                ':created_at' => $now,
                ':updated_at' => $now,
            ]);

            // A muscle can appear in both FEDB lists for the same exercise (e.g.
            // "quadriceps" as both primary and secondary) -- (exercise_id, muscle_id)
            // is a PK, so dedupe per exercise and let primary win.
            $usedMuscleIds = [];
            foreach (array_unique($e['primaryMuscles'] ?? []) as $key) {
                if (!isset($muscleIdByKey[$key])) {
                    $skippedMuscles[$key] = true;
                    continue;
                }
                $muscleId = $muscleIdByKey[$key];
                $insertMuscle->execute([$id, $muscleId, 'primary', 1.0]);
                $usedMuscleIds[$muscleId] = true;
            }
            foreach (array_unique($e['secondaryMuscles'] ?? []) as $key) {
                if (!isset($muscleIdByKey[$key])) {
                    $skippedMuscles[$key] = true;
                    continue;
                }
                $muscleId = $muscleIdByKey[$key];
                if (isset($usedMuscleIds[$muscleId])) {
                    continue;
                }
                $insertMuscle->execute([$id, $muscleId, 'secondary', 0.5]);
                $usedMuscleIds[$muscleId] = true;
            }

            foreach (($e['images'] ?? []) as $i => $relPath) {
                $mime = str_ends_with($relPath, '.png') ? 'image/png' : 'image/jpeg';
                $insertMedia->execute([
                    Uuid::v4(),
                    'exercise_photo',
                    $id,
                    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' . $relPath,
                    $mime,
                    $i,
                    $now,
                ]);
            }

            $imported++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    echo "   imported {$imported} exercises\n";
    if ($skippedMuscles) {
        echo "   !! unmapped muscle keys skipped: " . implode(', ', array_keys($skippedMuscles)) . "\n";
    }
};
