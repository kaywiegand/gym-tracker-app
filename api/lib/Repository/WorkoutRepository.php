<?php
declare(strict_types=1);

final class WorkoutRepository extends BaseRepository
{
    public function list(): array
    {
        return $this->fetchAll(
            "SELECT w.id, w.name, w.mode_id, tm.key AS mode_key, tm.name AS mode_name, tm.rep_low, tm.rep_high,
                (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id AND we.deleted_at IS NULL) AS exercise_count,
                w.updated_at
             FROM workouts w
             JOIN training_modes tm ON tm.id = w.mode_id
             WHERE w.deleted_at IS NULL AND w.archived = 0
             ORDER BY w.name"
        );
    }

    public function find(string $id): ?array
    {
        $workout = $this->fetchOne(
            'SELECT w.id, w.name, w.mode_id, tm.key AS mode_key, tm.name AS mode_name, tm.rep_low, tm.rep_high,
                w.notes, w.archived, w.created_at, w.updated_at
             FROM workouts w JOIN training_modes tm ON tm.id = w.mode_id
             WHERE w.id = ? AND w.deleted_at IS NULL',
            [$id]
        );
        if ($workout === null) {
            return null;
        }

        $workout['exercises'] = $this->fetchAll(
            "SELECT we.id, we.exercise_id, e.name AS exercise_name,
                (SELECT mu.region FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                 WHERE em.exercise_id = e.id AND em.role = 'primary' ORDER BY mu.sort LIMIT 1) AS region,
                we.position, we.planned_sets, we.rep_low_override, we.rep_high_override, we.increment_override_kg
             FROM workout_exercises we
             JOIN exercises e ON e.id = we.exercise_id
             WHERE we.workout_id = ? AND we.deleted_at IS NULL
             ORDER BY we.position",
            [$id]
        );

        return $workout;
    }

    public function create(array $data): array
    {
        $id = (string) ($data['id'] ?? Uuid::v4());
        $now = self::nowIso();

        $this->db->beginTransaction();
        try {
            $this->execute(
                'INSERT INTO workouts (id, name, mode_id, notes, archived, created_at, updated_at, deleted_at)
                 VALUES (?, ?, ?, ?, 0, ?, ?, NULL)',
                [$id, $data['name'], (int) $data['mode_id'], $data['notes'] ?? null, $now, $now]
            );
            $this->replaceExercises($id, $data['exercises'] ?? []);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        $existing = $this->fetchOne('SELECT id FROM workouts WHERE id = ? AND deleted_at IS NULL', [$id]);
        if ($existing === null) {
            return null;
        }

        $now = self::nowIso();
        $this->db->beginTransaction();
        try {
            $this->execute(
                'UPDATE workouts SET name = ?, mode_id = ?, notes = ?, updated_at = ? WHERE id = ?',
                [$data['name'], (int) $data['mode_id'], $data['notes'] ?? null, $now, $id]
            );
            if (isset($data['exercises'])) {
                $this->replaceExercises($id, $data['exercises']);
            }
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return $this->find($id);
    }

    public function softDelete(string $id): bool
    {
        $now = self::nowIso();
        $stmt = $this->db->prepare('UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$now, $now, $id]);
        return $stmt->rowCount() > 0;
    }

    // Stage 1 keeps this simple: every save replaces the whole exercise list
    // (delete + reinsert in the same transaction) instead of diffing
    // individual workout_exercise rows -- there's no offline sync yet to
    // make that diffing worthwhile.
    private function replaceExercises(string $workoutId, array $exercises): void
    {
        $now = self::nowIso();
        $this->execute('DELETE FROM workout_exercises WHERE workout_id = ?', [$workoutId]);
        $stmt = $this->db->prepare(
            'INSERT INTO workout_exercises (id, workout_id, exercise_id, position, planned_sets, rep_low_override, rep_high_override, increment_override_kg, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)'
        );
        foreach (array_values($exercises) as $i => $ex) {
            $stmt->execute([
                Uuid::v4(),
                $workoutId,
                $ex['exercise_id'],
                $i,
                (int) $ex['planned_sets'],
                $ex['rep_low_override'] ?? null,
                $ex['rep_high_override'] ?? null,
                $ex['increment_override_kg'] ?? null,
                $now,
                $now,
            ]);
        }
    }
}
