<?php
declare(strict_types=1);

// Mirrors BodyweightRepository -- same offline-first sync pattern
// (CLAUDE.md §4), just a different metric (tape-measure site + cm instead
// of scale weight).
final class BodyMeasurementRepository extends BaseRepository
{
    public function upsert(array $row): array
    {
        $id = (string) $row['id'];
        $now = self::nowIso();
        $columns = [
            'id' => $id,
            'measured_at' => $row['measured_at'] ?? null,
            'site' => $row['site'] ?? null,
            'value_cm' => $row['value_cm'] ?? null,
            'note' => $row['note'] ?? null,
            'created_at' => $row['created_at'] ?? $now,
            'updated_at' => $row['updated_at'] ?? $now,
            'deleted_at' => $row['deleted_at'] ?? null,
        ];
        $this->upsertRow('body_measurements', $columns, $id);
        return $this->find($id) ?? $columns;
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne('SELECT * FROM body_measurements WHERE id = ?', [$id]);
    }

    public function recent(?string $site, int $limit = 30): array
    {
        if ($site !== null) {
            return $this->fetchAll(
                'SELECT * FROM body_measurements WHERE deleted_at IS NULL AND site = ? ORDER BY measured_at DESC LIMIT ' . (int) $limit,
                [$site]
            );
        }
        return $this->fetchAll(
            'SELECT * FROM body_measurements WHERE deleted_at IS NULL ORDER BY measured_at DESC LIMIT ' . (int) $limit
        );
    }
}
