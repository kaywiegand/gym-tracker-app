<?php
declare(strict_types=1);

// PDO factory. Driver is chosen by api/config.php ('sqlite' default, 'mysql'
// fallback) so the repository layer above it never touches driver-specific
// syntax — see BaseRepository / *Repository for the portable-SQL contract.
final class Db
{
    private static ?PDO $instance = null;
    private static array $overrides = [];

    public static function setOverrides(array $overrides): void
    {
        self::$overrides = $overrides;
        self::$instance = null;
    }

    public static function connection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $config = self::loadConfig();
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];

        if ($config['driver'] === 'mysql') {
            $m = $config['mysql'];
            $dsn = "mysql:host={$m['host']};port={$m['port']};dbname={$m['database']};charset=utf8mb4";
            $pdo = new PDO($dsn, $m['username'], $m['password'], $options);
        } else {
            $dir = dirname($config['sqlite_path']);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            $pdo = new PDO('sqlite:' . $config['sqlite_path'], null, null, $options);
            $pdo->exec('PRAGMA foreign_keys = ON');
        }

        self::$instance = $pdo;
        return $pdo;
    }

    private static function loadConfig(): array
    {
        $config = require __DIR__ . '/../config.php';
        $localFile = __DIR__ . '/../config.local.php';
        if (is_file($localFile)) {
            $config = array_replace_recursive($config, require $localFile);
        }
        if (self::$overrides) {
            $config = array_replace_recursive($config, self::$overrides);
        }
        return $config;
    }
}
