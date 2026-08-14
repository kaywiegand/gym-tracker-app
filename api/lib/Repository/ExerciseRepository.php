<?php
declare(strict_types=1);

final class ExerciseRepository extends BaseRepository
{
    // An exercise's "region" (for list grouping/filtering) is its primary
    // muscle with the lowest muscles.sort -- deterministic, and portable to
    // MySQL without window functions (correlated subquery + derived table).
    private const PRIMARY_REGION_SUBQUERY = "(SELECT mu.region FROM exercise_muscles em
        JOIN muscles mu ON mu.id = em.muscle_id
        WHERE em.exercise_id = e.id AND em.role = 'primary'
        ORDER BY mu.sort LIMIT 1)";
    private const PRIMARY_MUSCLE_SUBQUERY = "(SELECT mu.name_en FROM exercise_muscles em
        JOIN muscles mu ON mu.id = em.muscle_id
        WHERE em.exercise_id = e.id AND em.role = 'primary'
        ORDER BY mu.sort LIMIT 1)";

    public function list(?string $q, ?string $region, ?string $mechanic): array
    {
        $sql = 'SELECT * FROM (
            SELECT e.id, e.name, e.movement, e.equipment, e.mechanic, e.category, e.default_increment_kg,
              ' . self::PRIMARY_REGION_SUBQUERY . ' AS region,
              ' . self::PRIMARY_MUSCLE_SUBQUERY . ' AS primary_muscle
            FROM exercises e
            WHERE e.deleted_at IS NULL
        ) t WHERE 1=1';
        $params = [];

        if ($region !== null && strtolower($region) !== 'all') {
            $sql .= ' AND t.region = :region';
            $params['region'] = strtolower($region);
        }
        if ($mechanic !== null && strtolower($mechanic) !== 'all') {
            $sql .= ' AND t.mechanic = :mechanic';
            $params['mechanic'] = strtolower($mechanic);
        }
        if ($q !== null && trim($q) !== '') {
            $sql .= ' AND (t.name LIKE :q OR t.primary_muscle LIKE :q)';
            $params['q'] = '%' . $q . '%';
        }
        $sql .= ' ORDER BY t.region, t.name';

        return $this->fetchAll($sql, $params);
    }

    public function find(string $id): ?array
    {
        $exercise = $this->fetchOne(
            'SELECT id, name, movement, equipment, mechanic, category, default_increment_kg, source, external_id, created_at, updated_at
             FROM exercises WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
        if ($exercise === null) {
            return null;
        }

        $exercise['muscles'] = $this->fetchAll(
            'SELECT mu.id AS muscle_id, mu.name_en, mu.region, em.role, em.weight
             FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
             WHERE em.exercise_id = ?
             ORDER BY CASE WHEN em.role = \'primary\' THEN 0 ELSE 1 END, mu.sort',
            [$id]
        );
        $exercise['media'] = $this->fetchAll(
            'SELECT id, path, mime, sort FROM media WHERE exercise_id = ? ORDER BY sort',
            [$id]
        );

        return $exercise;
    }

    public function create(array $data): array
    {
        $id = (string) ($data['id'] ?? Uuid::v4());
        $now = self::nowIso();

        $this->execute(
            'INSERT INTO exercises (id, name, movement, equipment, mechanic, category, default_increment_kg, source, external_id, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
            [
                $id,
                $data['name'],
                $data['movement'] ?? $data['name'],
                $data['equipment'] ?? null,
                $data['mechanic'] ?? null,
                $data['category'] ?? null,
                $data['default_increment_kg'] ?? null,
                $data['source'] ?? 'custom',
                $data['external_id'] ?? null,
                $now,
                $now,
            ]
        );

        if (!empty($data['muscles'])) {
            $this->replaceMuscles($id, $data['muscles']);
        }

        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        $existing = $this->find($id);
        if ($existing === null) {
            return null;
        }

        $this->execute(
            'UPDATE exercises SET name = ?, movement = ?, equipment = ?, mechanic = ?, category = ?, default_increment_kg = ?, updated_at = ?
             WHERE id = ?',
            [
                $data['name'] ?? $existing['name'],
                $data['movement'] ?? $existing['movement'],
                $data['equipment'] ?? $existing['equipment'],
                $data['mechanic'] ?? $existing['mechanic'],
                $data['category'] ?? $existing['category'],
                $data['default_increment_kg'] ?? $existing['default_increment_kg'],
                self::nowIso(),
                $id,
            ]
        );

        if (isset($data['muscles'])) {
            $this->replaceMuscles($id, $data['muscles']);
        }

        return $this->find($id);
    }

    private function replaceMuscles(string $exerciseId, array $muscles): void
    {
        $this->execute('DELETE FROM exercise_muscles WHERE exercise_id = ?', [$exerciseId]);
        $stmt = $this->db->prepare('INSERT INTO exercise_muscles (exercise_id, muscle_id, role, weight) VALUES (?, ?, ?, ?)');
        foreach ($muscles as $m) {
            $stmt->execute([$exerciseId, (int) $m['muscle_id'], $m['role'], (float) $m['weight']]);
        }
    }
}
