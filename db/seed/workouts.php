<?php
declare(strict_types=1);

// Seeds one ready-to-use demo workout so testing doesn't require setting
// one up by hand first. Full body, 3 compound + 2 isolation exercises.
// Looked up by name (not hardcoded UUIDs) since exercise ids are randomly
// generated fresh on every import.

return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM workouts')->fetchColumn();
    if ($existing > 0) {
        echo "   workouts already seeded ({$existing}), skipping\n";
        return;
    }

    $findExercise = $pdo->prepare('SELECT id FROM exercises WHERE name = ? AND equipment = ? LIMIT 1');
    $plan = [
        ['name' => 'Barbell Squat', 'equipment' => 'barbell', 'sets' => 3],
        ['name' => 'Barbell Bench Press - Medium Grip', 'equipment' => 'barbell', 'sets' => 3],
        ['name' => 'Bent Over Barbell Row', 'equipment' => 'barbell', 'sets' => 3],
        ['name' => 'Barbell Curl', 'equipment' => 'barbell', 'sets' => 3],
        ['name' => 'Triceps Pushdown', 'equipment' => 'cable', 'sets' => 3],
    ];

    $exerciseIds = [];
    foreach ($plan as $row) {
        $findExercise->execute([$row['name'], $row['equipment']]);
        $id = $findExercise->fetchColumn();
        if ($id === false) {
            echo "   skipping demo workout: exercise '{$row['name']}' not found (fedb import missing?)\n";
            return;
        }
        $exerciseIds[] = $id;
    }

    $now = gmdate('Y-m-d\TH:i:s\Z');
    $workoutId = Uuid::v4();

    $pdo->prepare(
        'INSERT INTO workouts (id, name, mode_id, notes, archived, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, NULL)'
    )->execute([
        $workoutId,
        'Full Body Starter',
        2, // hypertrophy
        'Demo workout seeded for testing — 3 compound + 2 isolation exercises.',
        $now,
        $now,
    ]);

    $insertExercise = $pdo->prepare(
        'INSERT INTO workout_exercises (id, workout_id, exercise_id, position, planned_sets, rep_low_override, rep_high_override, increment_override_kg, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL)'
    );
    foreach ($plan as $i => $row) {
        $insertExercise->execute([Uuid::v4(), $workoutId, $exerciseIds[$i], $i + 1, $row['sets'], $now, $now]);
    }

    echo "   inserted demo workout 'Full Body Starter' with " . count($plan) . " exercises\n";
};
