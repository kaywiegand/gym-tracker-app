<?php
declare(strict_types=1);

// One-time, token-guarded trigger for a backup restore on hosts without SSH,
// the same shape as run-migration.php next to it. It applies the JSON file
// named by ?file= from this directory and prints the per-table counts.
//
// Upload together with the JSON, call once with the token, then DELETE BOTH
// from the server immediately -- this writes to the live database, so it must
// never sit there. deploy/restore.sh does all of that in one run.
//
// Restores are idempotent: every row carries its id, so a second call updates
// the same rows instead of duplicating them.

$TOKEN = '0000000000000000000000000000000000'; // replaced with a fresh one at upload time

if (!isset($_GET['token']) || !hash_equals($TOKEN, (string) $_GET['token'])) {
    http_response_code(403);
    echo "Forbidden.\n";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

// basename() so ?file= cannot walk out of this directory.
$file = basename((string) ($_GET['file'] ?? ''));
if ($file === '' || !str_ends_with($file, '.json')) {
    http_response_code(400);
    echo "Call with ?file=<name>.json\n";
    exit;
}

$path = __DIR__ . '/' . $file;
if (!is_file($path)) {
    http_response_code(404);
    echo "Not found: {$file}\n";
    exit;
}

// Read before bootstrapping: the include runs in this scope, so a global of
// its own named $file or $path would quietly take these over.
$payload = json_decode((string) file_get_contents($path), true);
$restored = $file;

require_once __DIR__ . '/../api/bootstrap.php';

if (!is_array($payload) || !isset($payload['tables']) || !is_array($payload['tables'])) {
    http_response_code(400);
    echo "Not a backup file: {$restored}\n";
    exit;
}

try {
    $result = (new BackupRepository())->importAll($payload['tables']);
} catch (Throwable $e) {
    http_response_code(500);
    echo "Restore failed: " . $e->getMessage() . "\n";
    exit;
}

echo "Restored {$restored}\n";
$total = 0;
foreach ($result as $table => $counts) {
    if ($counts['inserted'] || $counts['updated'] || $counts['skipped']) {
        printf("  %-20s inserted=%d updated=%d skipped=%d\n",
            $table, $counts['inserted'], $counts['updated'], $counts['skipped']);
        $total += $counts['inserted'] + $counts['updated'];
    }
}
echo "OK {$total} row(s)\n";
