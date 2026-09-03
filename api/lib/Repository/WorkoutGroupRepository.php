<?php
declare(strict_types=1);

// Optional grouping for the workout list ("Warm ups", "Full body", ...).
// A workout belongs to at most one group; ungrouped workouts are not an
// error state and are listed on their own.
final class WorkoutGroupRepository extends BaseRepository
{
    public function list(): array
    {
        return $this->fetchAll(
            'SELECT g.id, g.name, g.sort,
                (SELECT COUNT(*) FROM workouts w
                  WHERE w.group_id = g.id AND w.deleted_at IS NULL AND w.archived = 0) AS workout_count
             FROM workout_groups g
             WHERE g.deleted_at IS NULL
             ORDER BY g.sort, g.name'
        );
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne(
            'SELECT id, name, sort, created_at, updated_at FROM workout_groups WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
    }

    public function create(array $data): array
    {
        $id = (string) ($data['id'] ?? Uuid::v4());
        $now = self::nowIso();
        $this->execute(
            'INSERT INTO workout_groups (id, name, sort, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
            [$id, trim((string) $data['name']), (int) ($data['sort'] ?? 0), $now, $now]
        );
        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        $existing = $this->find($id);
        if ($existing === null) {
            return null;
        }
        $this->execute(
            'UPDATE workout_groups SET name = ?, sort = ?, updated_at = ? WHERE id = ?',
            [trim((string) ($data['name'] ?? $existing['name'])), (int) ($data['sort'] ?? $existing['sort']), self::nowIso(), $id]
        );
        return $this->find($id);
    }

    // Deleting a group never deletes workouts -- they just become ungrouped.
    public function softDelete(string $id): bool
    {
        if ($this->find($id) === null) {
            return false;
        }
        $now = self::nowIso();
        $this->execute('UPDATE workouts SET group_id = NULL, updated_at = ? WHERE group_id = ?', [$now, $id]);
        $this->execute('UPDATE workout_groups SET deleted_at = ?, updated_at = ? WHERE id = ?', [$now, $now, $id]);
        return true;
    }
}
