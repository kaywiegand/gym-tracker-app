<?php
declare(strict_types=1);

return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM training_modes')->fetchColumn();
    if ($existing > 0) {
        echo "   training_modes already seeded ({$existing}), skipping\n";
        return;
    }

    $modes = [
        ['id' => 1, 'key' => 'strength', 'name' => 'Strength', 'rep_low' => 3, 'rep_high' => 5],
        ['id' => 2, 'key' => 'hypertrophy', 'name' => 'Hypertrophy', 'rep_low' => 6, 'rep_high' => 10],
        ['id' => 3, 'key' => 'endurance', 'name' => 'Endurance', 'rep_low' => 10, 'rep_high' => 12],
    ];

    $stmt = $pdo->prepare('INSERT INTO training_modes (id, key, name, rep_low, rep_high, sort) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($modes as $m) {
        $stmt->execute([$m['id'], $m['key'], $m['name'], $m['rep_low'], $m['rep_high'], $m['id']]);
    }
    echo "   inserted " . count($modes) . " training modes\n";
};
