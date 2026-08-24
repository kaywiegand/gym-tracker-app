<?php
declare(strict_types=1);

final class BiaRepository extends BaseRepository
{
    // "external_id|measured_at" pairs already in the DB -- used to dedupe
    // imports. Never external_id alone: the real InBody export can reuse
    // the same ID across two different scan dates (see Stage-5 plan §2),
    // so ID-only dedupe would silently drop a genuine second scan.
    public function existingKeys(): array
    {
        $rows = $this->fetchAll('SELECT external_id, measured_at FROM bia_measurements WHERE deleted_at IS NULL');
        $keys = [];
        foreach ($rows as $row) {
            $keys[($row['external_id'] ?? '') . '|' . $row['measured_at']] = true;
        }
        return $keys;
    }

    public function createMeasurement(string $measuredAt, ?string $externalId, string $source): array
    {
        $id = Uuid::v4();
        $now = self::nowIso();
        $this->execute(
            'INSERT INTO bia_measurements (id, measured_at, source, note, external_id, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, NULL, ?, ?, ?, NULL)',
            [$id, $measuredAt, $source, $externalId, $now, $now]
        );
        return $this->find($id);
    }

    public function insertValues(string $measurementId, array $entries): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO bia_values (id, measurement_id, category, subcategory, metric, value_num, value_text, unit, ref_low, ref_high)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)'
        );
        foreach ($entries as $entry) {
            $stmt->execute([
                Uuid::v4(),
                $measurementId,
                $entry['category'],
                $entry['subcategory'],
                $entry['metric'],
                $entry['valueNum'],
                $entry['valueText'],
            ]);
        }
    }

    public function list(int $limit = 50): array
    {
        return $this->fetchAll(
            'SELECT id, measured_at, source, external_id, created_at FROM bia_measurements
             WHERE deleted_at IS NULL ORDER BY measured_at DESC LIMIT ' . (int) $limit
        );
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne(
            'SELECT id, measured_at, source, external_id, created_at FROM bia_measurements WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
    }

    public function valuesFor(string $measurementId): array
    {
        return $this->fetchAll(
            'SELECT id, category, subcategory, metric, value_num, value_text, unit, ref_low, ref_high
             FROM bia_values WHERE measurement_id = ? ORDER BY category, subcategory, metric',
            [$measurementId]
        );
    }

    public function latest(): ?array
    {
        $measurement = $this->fetchOne(
            'SELECT id, measured_at, source, external_id, created_at FROM bia_measurements
             WHERE deleted_at IS NULL ORDER BY measured_at DESC LIMIT 1'
        );
        if ($measurement === null) {
            return ['measurement' => null, 'values' => []];
        }
        return ['measurement' => $measurement, 'values' => $this->valuesFor($measurement['id'])];
    }

    public function softDelete(string $id): bool
    {
        if ($this->find($id) === null) {
            return false;
        }
        $this->execute('UPDATE bia_measurements SET deleted_at = ?, updated_at = ? WHERE id = ?', [self::nowIso(), self::nowIso(), $id]);
        return true;
    }
}
