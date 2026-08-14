<?php
declare(strict_types=1);

final class BodyweightRepository extends BaseRepository
{
    public function upsert(array $row): array
    {
        $id = (string) $row['id'];
        $now = self::nowIso();
        $columns = [
            'id' => $id,
            'measured_at' => $row['measured_at'] ?? null,
            'weight_kg' => $row['weight_kg'] ?? null,
            'note' => $row['note'] ?? null,
            'created_at' => $row['created_at'] ?? $now,
            'updated_at' => $row['updated_at'] ?? $now,
            'deleted_at' => $row['deleted_at'] ?? null,
        ];
        $this->upsertRow('bodyweight', $columns, $id);
        return $this->find($id) ?? $columns;
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne('SELECT * FROM bodyweight WHERE id = ?', [$id]);
    }

    public function recent(int $limit = 30): array
    {
        return $this->fetchAll(
            'SELECT * FROM bodyweight WHERE deleted_at IS NULL ORDER BY measured_at DESC LIMIT ' . (int) $limit
        );
    }
}
