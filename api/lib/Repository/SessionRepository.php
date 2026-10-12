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

    // Distinct local calendar days (in $timeZone, an IANA name, UTC if
    // invalid) of counting sessions started in the last $days -- feeds the
    // Sessions/wk KPI and the consistency calendar. A session counts when it
    // has ended_at OR at least one working set (an unfinished one with logged
    // sets is still a training day; an empty open one is not). The day is
    // that of started_at, so a session running past midnight stays on its
    // start day (BACKLOG #79, #90).
    public function recentDates(int $days, string $timeZone = 'UTC'): array
    {
        $tz = self::timeZone($timeZone);
        $cutoffTs = time() - $days * 86400;
        $cutoffDay = (new DateTimeImmutable('@' . $cutoffTs))->setTimezone($tz)->format('Y-m-d');
        // One day of slack on the query; the exact cut is made on the local day.
        $rows = $this->fetchAll(
            'SELECT started_at FROM sessions
             WHERE deleted_at IS NULL AND started_at >= ?
               AND (ended_at IS NOT NULL OR EXISTS (
                 SELECT 1 FROM sets st
                 WHERE st.session_id = sessions.id AND st.is_warmup = 0 AND st.deleted_at IS NULL))',
            [gmdate('Y-m-d\TH:i:s\Z', $cutoffTs - 86400)]
        );

        $dates = [];
        foreach ($rows as $row) {
            try {
                $day = (new DateTimeImmutable($row['started_at']))->setTimezone($tz)->format('Y-m-d');
            } catch (Exception $e) {
                continue;
            }
            if ($day >= $cutoffDay) {
                $dates[$day] = true;
            }
        }
        return array_keys($dates);
    }

    // Counting sessions (same rule and cut as recentDates()), each with its
    // working-set volume (warm-ups excluded, like every other volume figure)
    // -- oldest first. The join on working sets already drops sessions without
    // any: they have no volume to average.
    public function sessionVolumes(int $days, string $timeZone = 'UTC'): array
    {
        $tz = self::timeZone($timeZone);
        $cutoffTs = time() - $days * 86400;
        $cutoffDay = (new DateTimeImmutable('@' . $cutoffTs))->setTimezone($tz)->format('Y-m-d');
        $rows = $this->fetchAll(
            'SELECT s.id, s.started_at, SUM(st.weight_kg * st.reps) AS volume_kg
             FROM sessions s
             JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
             WHERE s.deleted_at IS NULL AND s.started_at >= ?
             GROUP BY s.id, s.started_at
             ORDER BY s.started_at ASC',
            [gmdate('Y-m-d\TH:i:s\Z', $cutoffTs - 86400)]
        );

        $result = [];
        foreach ($rows as $row) {
            try {
                $day = (new DateTimeImmutable($row['started_at']))->setTimezone($tz)->format('Y-m-d');
            } catch (Exception $e) {
                continue;
            }
            if ($day >= $cutoffDay) {
                $result[] = ['session_id' => $row['id'], 'date' => $day, 'volume_kg' => (float) $row['volume_kg']];
            }
        }
        return $result;
    }

    public static function timeZone(string $name): DateTimeZone
    {
        try {
            return new DateTimeZone($name);
        } catch (Exception $e) {
            return new DateTimeZone('UTC');
        }
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
