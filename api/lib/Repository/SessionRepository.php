<?php
declare(strict_types=1);

final class SessionRepository extends BaseRepository
{
    public function upsert(array $row): array
    {
        $id = (string) $row['id'];
        $now = self::nowIso();
        $columns = [
            'id' => $id,
            'workout_id' => $row['workout_id'] ?? null,
            'started_at' => $row['started_at'] ?? null,
            'ended_at' => $row['ended_at'] ?? null,
            'note' => $row['note'] ?? null,
            'created_at' => $row['created_at'] ?? $now,
            'updated_at' => $row['updated_at'] ?? $now,
            'deleted_at' => $row['deleted_at'] ?? null,
        ];
        $this->upsertRow('sessions', $columns, $id);
        return $this->find($id) ?? $columns;
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne('SELECT * FROM sessions WHERE id = ?', [$id]);
    }

    // Distinct calendar days with at least one started session in the last
    // $days -- feeds the Sessions/wk KPI and the consistency calendar. A
    // started (even if later abandoned) session counts as "showed up".
    public function recentDates(int $days): array
    {
        $cutoff = gmdate('Y-m-d\TH:i:s\Z', time() - $days * 86400);
        $rows = $this->fetchAll(
            'SELECT started_at FROM sessions WHERE deleted_at IS NULL AND started_at >= ?',
            [$cutoff]
        );

        $dates = [];
        foreach ($rows as $row) {
            $dates[substr($row['started_at'], 0, 10)] = true;
        }
        return array_keys($dates);
    }

    // Every finished session's time window, oldest first -- feeds
    // HrImport::matchFromAppleHealthXml()'s forward sweep (CLAUDE.md §8: HR
    // matched by set/session timestamps). A session with no ended_at is
    // still in progress or was abandoned -- no window to match against.
    public function allTimeWindows(): array
    {
        return $this->fetchAll(
            'SELECT id, started_at, ended_at FROM sessions
             WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at ASC'
        );
    }
}
