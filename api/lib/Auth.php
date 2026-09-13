<?php
declare(strict_types=1);

final class Auth
{
    // A login has to survive a whole training session and then some. The
    // defaults did not: a browser-session cookie plus the host's 24-minute
    // garbage collection logged the phone out during the rest between sets,
    // and every list the app fetched afterwards came back 401 -- which the
    // screens rendered as an empty library.
    private const SESSION_LIFETIME = 30 * 24 * 60 * 60;

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        // Own session directory: on shared hosting the default save path is
        // swept by other vhosts' garbage collection, whose lifetime we do not
        // control. Kept next to the database, which the web server denies (see
        // db/.htaccess). If it cannot be created, fall back to the host's
        // default rather than failing to start a session at all.
        $sessionDir = dirname(__DIR__, 2) . '/db/sessions';
        if (is_dir($sessionDir) || @mkdir($sessionDir, 0700, true)) {
            session_save_path($sessionDir);
            // Own save path means own cleanup -- some hosts disable PHP's
            // probabilistic GC and sweep by cron instead, which never sees
            // this directory.
            ini_set('session.gc_probability', '1');
            ini_set('session.gc_divisor', '100');
        }
        ini_set('session.gc_maxlifetime', (string) self::SESSION_LIFETIME);

        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        session_set_cookie_params([
            'lifetime' => self::SESSION_LIFETIME,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => $secure,
        ]);
        session_start();

        // PHP only sends the cookie when it creates a session, so the expiry
        // would stay fixed at login + 30 days however often the app is used --
        // and log the phone out mid-workout on day 30. Re-sending it on every
        // request makes it sliding, like the server-side cleanup already is.
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), session_id(), [
                'expires' => time() + self::SESSION_LIFETIME,
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax',
                'secure' => $secure,
            ]);
        }
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
