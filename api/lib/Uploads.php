<?php
declare(strict_types=1);

// Private file storage (R-05): health exports today, meal photos later. The
// directory sits outside the docroot, so the only way to a file is through
// PHP and its login check (GET /media/:id). Paths stored in the database are
// relative to this root, so the directory can move without touching rows.
final class Uploads
{
    // Only types a browser renders as plain images. SVG stays out, it can
    // carry scripts. Everything else is handed over as a download.
    private const INLINE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

    public static function root(): string
    {
        $root = rtrim((string) (Db::config()['uploads_path'] ?? ''), '/');
        if ($root === '') {
            throw new RuntimeException('uploads_path is not configured');
        }
        if (self::isInsideApp($root)) {
            throw new RuntimeException('uploads_path must be outside the docroot');
        }
        if (!is_dir($root) && !@mkdir($root, 0700, true) && !is_dir($root)) {
            throw new RuntimeException('uploads_path cannot be created');
        }
        return $root;
    }

    public static function path(string $relative): string
    {
        $segments = explode('/', $relative);
        $unsafe = $relative === '' || str_contains($relative, "\0") || str_contains($relative, '://');
        foreach ($segments as $segment) {
            $unsafe = $unsafe || in_array($segment, ['', '.', '..'], true);
        }
        if ($unsafe) {
            throw new InvalidArgumentException('Invalid upload path');
        }
        return self::root() . '/' . $relative;
    }

    // Returns the absolute path of the stored file.
    public static function storeUploaded(string $tmpPath, string $relative): string
    {
        $target = self::path($relative);
        $dir = dirname($target);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new RuntimeException('Upload directory cannot be created');
        }
        if (!move_uploaded_file($tmpPath, $target)) {
            throw new RuntimeException('Upload could not be moved');
        }
        return $target;
    }

    public static function remove(string $relative): void
    {
        $target = self::path($relative);
        if (is_file($target)) {
            unlink($target);
        }
    }

    public static function exists(string $relative): bool
    {
        return is_file(self::path($relative));
    }

    public static function deliveryHeaders(string $mime): array
    {
        $inline = in_array($mime, self::INLINE_MIMES, true);
        return [
            'Content-Type' => $inline ? $mime : 'application/octet-stream',
            'Content-Disposition' => $inline ? 'inline' : 'attachment',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ];
    }

    public static function send(string $relative, string $mime): never
    {
        $target = self::path($relative);
        // A slow download must not hold the session lock against the app.
        session_write_close();
        foreach (self::deliveryHeaders($mime) as $name => $value) {
            header("{$name}: {$value}");
        }
        header('Content-Length: ' . filesize($target));
        readfile($target);
        exit;
    }

    // For the deploy check. Deliberately without the path itself.
    public static function status(): array
    {
        $configured = (string) (Db::config()['uploads_path'] ?? '');
        try {
            return ['writable' => is_writable(self::root()), 'outside_docroot' => true];
        } catch (RuntimeException $e) {
            return ['writable' => false, 'outside_docroot' => $configured !== '' && !self::isInsideApp($configured)];
        }
    }

    // The target may not exist yet, so the check runs on its nearest existing
    // parent. realpath() resolves symlinks and any ".." on the way.
    private static function isInsideApp(string $path): bool
    {
        $existing = $path;
        while (realpath($existing) === false && dirname($existing) !== $existing) {
            $existing = dirname($existing);
        }
        $resolved = (string) realpath($existing);
        $appRoot = (string) realpath(dirname(__DIR__, 2));
        return $resolved === $appRoot || str_starts_with($resolved . '/', $appRoot . '/');
    }
}
