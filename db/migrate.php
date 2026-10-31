<?php
declare(strict_types=1);

// Idempotent migration + seed runner.
//   php db/migrate.php [--password=xxx] [--db=path/to/file.db] [--force]
//
// Safe to run repeatedly: schema uses CREATE TABLE/INDEX IF NOT EXISTS, and
// every seed script checks what's already in the DB before inserting.

require __DIR__ . '/../api/bootstrap.php';

function parseArgs(array $argv): array
{
    $args = ['password' => null, 'db' => null, 'force' => false];
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--password=')) {
            $args['password'] = substr($arg, strlen('--password='));
        } elseif (str_starts_with($arg, '--db=')) {
            $args['db'] = substr($arg, strlen('--db='));
        } elseif ($arg === '--force') {
            $args['force'] = true;
        }
    }
    return $args;
}

$args = parseArgs(array_slice($argv, 1));

if ($args['db'] !== null) {
    Db::setOverrides(['sqlite_path' => $args['db']]);
}

$pdo = Db::connection();

echo "-> applying schema...\n";
$schema = file_get_contents(__DIR__ . '/schema.sql');
foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
    $pdo->exec($statement);
}
echo "   schema OK\n";

// CREATE TABLE IF NOT EXISTS above doesn't add columns to a table that
// already exists from an earlier migrate.php run -- ALTER TABLE ADD COLUMN
// here for additive schema changes on existing installs. Try/catch instead
// of driver-specific "does this column exist" introspection so this stays
// portable across SQLite and MySQL (both raise on a duplicate column name).
try {
    $pdo->exec('ALTER TABLE bia_measurements ADD COLUMN external_id TEXT');
    echo "   added bia_measurements.external_id\n";
} catch (PDOException $e) {
    // already present
}

foreach ([
    'workouts' => [
        'group_id' => 'TEXT',
    ],
    'exercises' => [
        'variant' => 'TEXT',
        'display_alias' => 'TEXT',
        'is_curated' => 'INTEGER DEFAULT 0',
    ],
] as $table => $columns) {
    foreach ($columns as $column => $type) {
        try {
            $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$type}");
            echo "   added {$table}.{$column}\n";
        } catch (PDOException $e) {
            // already present
        }
    }
}

$seedDir = __DIR__ . '/seed';
$seedOrder = ['muscles.php', 'muscle_volume_targets.php', 'training_modes.php', 'settings.php', 'exercises.php', 'exercise_naming.php', 'workouts.php'];
foreach ($seedOrder as $file) {
    $path = $seedDir . '/' . $file;
    if (!is_file($path)) {
        continue;
    }
    $seed = require $path;
    echo "-> seeding {$file}...\n";
    $seed($pdo, $args);
}

// Undoes what the 2026-10-31 migration did (BACKLOG #170): two one-time rules
// that ran on every migration cleared the movement of "Face Pull" and "Sit-Up"
// and moved plateau_sessions off Kay's 4. Runs once, guarded by a marker, so a
// later change to any of these stays.
$repairDone = $pdo->query("SELECT COUNT(*) FROM settings WHERE key = 'repair_20261031_done'")->fetchColumn();
if ((int) $repairDone === 0) {
    $restored = $pdo->exec("UPDATE exercises SET movement = name WHERE name IN ('Face Pull', 'Sit-Up') AND movement IS NULL AND source = 'fedb'");
    $pdo->exec("UPDATE settings SET value = '4' WHERE key = 'plateau_sessions'");
    $pdo->exec("INSERT INTO settings (key, value) VALUES ('repair_20261031_done', '1')");
    echo "-> repair 2026-10-31: {$restored} movement(s) restored, plateau_sessions = 4\n";
}

echo "Done.\n";
