<?php
declare(strict_types=1);

final class SettingsRepository extends BaseRepository
{
    // password_hash is managed exclusively through Auth::changePassword(),
    // never exposed via the generic settings GET/PUT.
    private const HIDDEN_KEYS = ['password_hash'];

    public function getAll(): array
    {
        $rows = $this->fetchAll('SELECT key, value FROM settings ORDER BY key');
        $out = [];
        foreach ($rows as $row) {
            if (in_array($row['key'], self::HIDDEN_KEYS, true)) {
                continue;
            }
            $out[$row['key']] = $row['value'];
        }
        return $out;
    }

    public function setMany(array $values): void
    {
        $stmtUpdate = $this->db->prepare('UPDATE settings SET value = ? WHERE key = ?');
        $stmtInsert = $this->db->prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        foreach ($values as $key => $value) {
            if (in_array($key, self::HIDDEN_KEYS, true)) {
                continue;
            }
            $stmtUpdate->execute([(string) $value, (string) $key]);
            if ($stmtUpdate->rowCount() === 0) {
                $stmtInsert->execute([(string) $key, (string) $value]);
            }
        }
    }

    public function getPasswordHash(): ?string
    {
        $row = $this->fetchOne('SELECT value FROM settings WHERE key = ?', ['password_hash']);
        return $row['value'] ?? null;
    }

    public function setPasswordHash(string $hash): void
    {
        $stmt = $this->db->prepare('UPDATE settings SET value = ? WHERE key = ?');
        $stmt->execute([$hash, 'password_hash']);
    }
}
