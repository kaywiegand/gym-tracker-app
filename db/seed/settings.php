<?php
declare(strict_types=1);

return function (PDO $pdo, array $args): void {
    $defaults = [
        'unit_system' => 'metric',
        'default_increment_kg' => '2.5',
        'rounding_kg' => '2.5',
        'progression_trigger' => 'all_sets',
        'rest_seconds' => '120',
        'theme' => 'dark',
    ];

    $existingStmt = $pdo->prepare('SELECT value FROM settings WHERE key = ?');
    $insertStmt = $pdo->prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

    foreach ($defaults as $key => $value) {
        $existingStmt->execute([$key]);
        if ($existingStmt->fetch() !== false) {
            continue;
        }
        $insertStmt->execute([$key, $value]);
        echo "   settings.{$key} = {$value}\n";
    }

    $existingStmt->execute(['password_hash']);
    $hasPassword = $existingStmt->fetch() !== false;

    if ($hasPassword && !($args['force'] && $args['password'] !== null)) {
        echo "   password_hash already set, skipping (pass --password=xxx --force to reset)\n";
        return;
    }

    $password = $args['password'] ?? 'changeme';
    $hash = password_hash($password, PASSWORD_BCRYPT);

    if ($hasPassword) {
        $pdo->prepare('UPDATE settings SET value = ? WHERE key = ?')->execute([$hash, 'password_hash']);
        echo "   password_hash reset via --force\n";
        return;
    }

    $insertStmt->execute(['password_hash', $hash]);
    if ($args['password'] === null) {
        echo "   !! no --password given -- using default password 'changeme'.\n";
        echo "   !! change it immediately via Settings once you're logged in.\n";
    } else {
        echo "   password set from --password\n";
    }
};
