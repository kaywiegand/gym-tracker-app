<?php
declare(strict_types=1);

final class HrRepository extends BaseRepository
{
    // hr_samples has no id/updated_at upsert semantics (immutable imported
    // rows, see schema.sql) -- dedupe on (session_id, ts) instead so
    // re-importing the same export file doesn't duplicate samples.
    public function insertMatched(array $rows): int
    {
        if (empty($rows)) {
            return 0;
        }

        $sessionIds = array_values(array_unique(array_column($rows, 'session_id')));
        $placeholders = implode(', ', array_fill(0, count($sessionIds), '?'));
        $existing = $this->fetchAll(
            "SELECT session_id, ts FROM hr_samples WHERE session_id IN ({$placeholders})",
            $sessionIds
        );
        $existingKeys = [];
        foreach ($existing as $row) {
            $existingKeys[$row['session_id'] . '|' . $row['ts']] = true;
        }

        $stmt = $this->db->prepare('INSERT INTO hr_samples (id, session_id, ts, bpm) VALUES (?, ?, ?, ?)');
        $inserted = 0;
        foreach ($rows as $row) {
            $key = $row['session_id'] . '|' . $row['ts'];
            if (isset($existingKeys[$key])) {
                continue;
            }
            $existingKeys[$key] = true;
            $stmt->execute([Uuid::v4(), $row['session_id'], $row['ts'], $row['bpm']]);
            $inserted++;
        }
        return $inserted;
    }
}
