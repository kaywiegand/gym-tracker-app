<?php
declare(strict_types=1);

final class Auth
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => $secure,
        ]);
        session_start();
    }

    public static function isLoggedIn(): bool
    {
        return !empty($_SESSION['authenticated']);
    }

    public static function require(): void
    {
        if (!self::isLoggedIn()) {
            Http::error('Unauthorized', 401);
        }
    }

    public static function login(string $password): bool
    {
        $hash = (new SettingsRepository())->getPasswordHash();
        if ($hash === null || !password_verify($password, $hash)) {
            return false;
        }
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        return true;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function changePassword(string $current, string $new): bool
    {
        $repo = new SettingsRepository();
        $hash = $repo->getPasswordHash();
        if ($hash === null || !password_verify($current, $hash)) {
            return false;
        }
        $repo->setPasswordHash(password_hash($new, PASSWORD_BCRYPT));
        return true;
    }
}
