<?php
declare(strict_types=1);

// Default config — SQLite, portable across dev + Hetzner shared hosting.
// For MySQL fallback (if PDO_SQLite is unavailable on the host), copy this
// file to config.local.php (gitignored) and set driver to 'mysql' + credentials.
return [
    'driver' => 'sqlite',
    'sqlite_path' => dirname(__DIR__) . '/db/fitness.db',
    'mysql' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => '',
        'username' => '',
        'password' => '',
    ],
];
