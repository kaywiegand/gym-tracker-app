<?php
declare(strict_types=1);

// Weekly working-set targets (MEV/MAV/MRV) per muscle region, derived from
// per-muscle landmarks -- see api/lib/VolumeLandmarks.php and
// docs/volume-landmarks.md for the numbers, their sources and the method.
// Only seeds an empty table: values edited in Settings are never overwritten.
return function (PDO $pdo, array $args): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM muscle_volume_targets')->fetchColumn();
    if ($existing > 0) {
        echo "   muscle_volume_targets already seeded ({$existing}), skipping\n";
        return;
    }

    $muscles = $pdo->query('SELECT name_en, region FROM muscles')->fetchAll(PDO::FETCH_ASSOC);
    $targets = VolumeLandmarks::regionTargets($muscles);

    $stmt = $pdo->prepare('INSERT INTO muscle_volume_targets (region, mev, mav, mrv) VALUES (?, ?, ?, ?)');
    foreach ($targets as $region => $t) {
        $stmt->execute([$region, $t['mev'], $t['mav'], $t['mrv']]);
    }
    echo "   inserted " . count($targets) . " muscle volume targets\n";
};
