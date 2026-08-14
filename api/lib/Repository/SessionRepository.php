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
}
