<?php
declare(strict_types=1);

// Weekly working-set volume landmarks (MEV/MAV/MRV) per muscle region --
// approximate, widely-cited starting points (evidence-based hypertrophy
// literature), not a hard science fact. Adjustable later via a settings UI
// (BACKLOG.md), not part of this stage.
return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM muscle_volume_targets')->fetchColumn();
    if ($existing > 0) {
        echo "   muscle_volume_targets already seeded ({$existing}), skipping\n";
        return;
    }

    $targets = [
        ['region' => 'chest', 'mev' => 8, 'mav' => 16, 'mrv' => 22],
        ['region' => 'back', 'mev' => 10, 'mav' => 18, 'mrv' => 25],
        ['region' => 'shoulders', 'mev' => 8, 'mav' => 16, 'mrv' => 24],
        ['region' => 'arms', 'mev' => 6, 'mav' => 14, 'mrv' => 22],
        ['region' => 'legs', 'mev' => 8, 'mav' => 16, 'mrv' => 22],
        ['region' => 'core', 'mev' => 6, 'mav' => 12, 'mrv' => 18],
    ];

    $stmt = $pdo->prepare('INSERT INTO muscle_volume_targets (region, mev, mav, mrv) VALUES (?, ?, ?, ?)');
    foreach ($targets as $t) {
        $stmt->execute([$t['region'], $t['mev'], $t['mav'], $t['mrv']]);
    }
    echo "   inserted " . count($targets) . " muscle volume targets\n";
};
