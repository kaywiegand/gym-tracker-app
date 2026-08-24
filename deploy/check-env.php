<?php
declare(strict_types=1);

// One-time deploy diagnostic (CLAUDE.md §3: "Vor dem ersten Deploy PDO_SQLite
// prüfen"). Upload this single file to the docroot BEFORE the rest of the
// app, visit it once in a browser, then delete it -- read-only, no state
// changes, but no reason to leave a system-info endpoint public longer than
// needed.

header('Content-Type: application/json; charset=utf-8');

$checks = [
    'php_version' => PHP_VERSION,
    'php_version_ok' => version_compare(PHP_VERSION, '8.1.0', '>='),
    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'docroot' => __DIR__,
    'docroot_writable' => is_writable(__DIR__),
    'mod_rewrite_hint' => function_exists('apache_get_modules') ? in_array('mod_rewrite', apache_get_modules(), true) : 'unknown (not mod_php or function disabled -- test /api/settings after full deploy instead)',
];

$checks['recommended_driver'] = $checks['pdo_sqlite'] ? 'sqlite (default, no config.local.php needed)' : ($checks['pdo_mysql'] ? 'mysql (needs api/config.local.php)' : 'NEITHER AVAILABLE -- contact hosting support');

echo json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
