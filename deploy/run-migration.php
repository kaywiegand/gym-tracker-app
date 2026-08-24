<?php
declare(strict_types=1);

// One-time, token-guarded trigger for db/migrate.php on hosts without SSH
// (CLAUDE.md README mentions "per SSH oder Cronjob-Trigger, falls kein SSH
// verfügbar ist" -- this is that trigger). Upload, visit once with the
// token below plus your chosen app password, then DELETE this file
// immediately from the server. Safe to re-run before deleting it (migrate.php
// is idempotent), but it must never stay live longer than the one visit.

$TOKEN = '7381bbef38127aa57492c0c86a1f9a10'; // one-time use -- delete this file after running, don't reuse the token elsewhere

if (!isset($_GET['token']) || !hash_equals($TOKEN, (string) $_GET['token'])) {
    http_response_code(403);
    echo "Forbidden.\n";
    exit;
}

$password = $_GET['password'] ?? null;
if ($password === null || $password === '') {
    http_response_code(400);
    echo "Missing ?password=<your-chosen-app-password>\n";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
$argv = ['migrate.php', '--password=' . $password];
ob_start();
require __DIR__ . '/../db/migrate.php';
$output = ob_get_clean();
echo $output;
echo "\nDONE. Now delete deploy/run-migration.php from the server via FTP -- do not leave it live.\n";
