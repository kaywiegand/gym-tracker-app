<?php
declare(strict_types=1);

return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM muscles')->fetchColumn();
    if ($existing > 0) {
        echo "   muscles already seeded ({$existing}), skipping\n";
        return;
    }

    $taxonomy = require __DIR__ . '/muscle_taxonomy.php';
    $stmt = $pdo->prepare('INSERT INTO muscles (id, name_en, region, sort) VALUES (?, ?, ?, ?)');
    foreach ($taxonomy as $row) {
        $stmt->execute([$row['sort'], $row['name_en'], $row['region'], $row['sort']]);
    }
    echo "   inserted " . count($taxonomy) . " muscles\n";
};
