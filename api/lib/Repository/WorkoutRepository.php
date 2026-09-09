<?php
declare(strict_types=1);

final class WorkoutRepository extends BaseRepository
{
    public function list(): array
    {
        return $this->fetchAll(
            "SELECT w.id, w.name, w.mode_id, w.group_id, g.name AS group_name, g.sort AS group_sort,
                tm.key AS mode_key, tm.name AS mode_name, tm.rep_low, tm.rep_high,
                (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id AND we.deleted_at IS NULL) AS exercise_count,
                w.updated_at
             FROM workouts w
             JOIN training_modes tm ON tm.id = w.mode_id
             LEFT JOIN workout_groups g ON g.id = w.group_id AND g.deleted_at IS NULL
             WHERE w.deleted_at IS NULL AND w.archived = 0
             ORDER BY w.name"
        );
    }

    public function find(string $id): ?array
    {
        $workout = $this->fetchOne(
            'SELECT w.id, w.name, w.mode_id, w.group_id, tm.key AS mode_key, tm.name AS mode_name, tm.rep_low, tm.rep_high,
                w.notes, w.archived, w.created_at, w.updated_at
             FROM workouts w JOIN training_modes tm ON tm.id = w.mode_id
             WHERE w.id = ? AND w.deleted_at IS NULL',
            [$id]
        );
        if ($workout === null) {
            return null;
        }

        // Naming columns, not just e.name: the workout has to call an exercise
        // exactly what the library and the picker call it.
        $workout['exercises'] = ExerciseNaming::decorateAllJoined($this->fetchAll(
            "SELECT we.id, we.exercise_id, " . ExerciseNaming::selectColumns() . ",
                (SELECT mu.region FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                 WHERE em.exercise_id = e.id AND em.role = 'primary' ORDER BY mu.sort LIMIT 1) AS region,
                we.position, we.planned_sets, we.rep_low_override, we.rep_high_override, we.increment_override_kg,
                e.default_increment_kg AS exercise_default_increment_kg
             FROM workout_exercises we
             JOIN exercises e ON e.id = we.exercise_id
             WHERE we.workout_id = ? AND we.deleted_at IS NULL
             ORDER BY we.position",
            [$id]
        ));

        return $workout;
    }

    public function create(array $data): array
    {
        $id = (string) ($data['id'] ?? Uuid::v4());
        $now = self::nowIso();

        $this->db->beginTransaction();
        try {
            $this->execute(
                'INSERT INTO workouts (id, name, mode_id, group_id, notes, archived, created_at, updated_at, deleted_at)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)',
                [$id, $data['name'], (int) $data['mode_id'], self::blankToNull($data['group_id'] ?? null), $data['notes'] ?? null, $now, $now]
            );
            $this->syncExercises($id, $data['exercises'] ?? []);
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
                'UPDATE workouts SET name = ?, mode_id = ?, group_id = ?, notes = ?, updated_at = ? WHERE id = ?',
                [$data['name'], (int) $data['mode_id'], self::blankToNull($data['group_id'] ?? null), $data['notes'] ?? null, $now, $id]
            );
            if (isset($data['exercises'])) {
                $this->syncExercises($id, $data['exercises']);
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

    // "" from a <select> with no group chosen means no group, not a group
    // whose id is the empty string.
    private static function blankToNull(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : $value;
    }

    // Reconciles the list in place instead of deleting it and inserting a
    // fresh one. Logged sets carry the workout_exercise_id of the slot they
    // were performed in, so a delete + reinsert orphaned every set in the
    // workout's history -- and the editor posts the full list on every save,
    // so merely assigning a group was enough to do it.
    //
    // A row is identified by its exercise_id: the picker cannot add the same
    // exercise twice, so that is unique within a workout. A row whose
    // exercise is no longer in the list is soft-deleted rather than dropped,
    // and comes back with its own id if the exercise is added again -- which
    // keeps the sets performed in that slot attached to it.
    private function syncExercises(string $workoutId, array $exercises): void
    {
        $now = self::nowIso();

        $existing = [];
        foreach ($this->fetchAll('SELECT id, exercise_id FROM workout_exercises WHERE workout_id = ?', [$workoutId]) as $row) {
            $existing[$row['exercise_id']] = $row['id'];
        }

        $update = $this->db->prepare(
            'UPDATE workout_exercises
                SET position = ?, planned_sets = ?, rep_low_override = ?, rep_high_override = ?,
                    increment_override_kg = ?, updated_at = ?, deleted_at = NULL
              WHERE id = ?'
        );
        $insert = $this->db->prepare(
            'INSERT INTO workout_exercises (id, workout_id, exercise_id, position, planned_sets, rep_low_override, rep_high_override, increment_override_kg, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)'
        );

        $keep = [];
        foreach (array_values($exercises) as $i => $ex) {
            $exerciseId = (string) $ex['exercise_id'];
            $overrides = [
                $i,
                (int) $ex['planned_sets'],
                $ex['rep_low_override'] ?? null,
                $ex['rep_high_override'] ?? null,
                $ex['increment_override_kg'] ?? null,
                $now,
            ];
            if (isset($existing[$exerciseId])) {
                $id = $existing[$exerciseId];
                $update->execute([...$overrides, $id]);
            } else {
                $id = Uuid::v4();
                $insert->execute([$id, $workoutId, $exerciseId, ...$overrides, $now]);
            }
            $keep[$id] = true;
        }

        foreach ($existing as $id) {
            if (!isset($keep[$id])) {
                $this->execute(
                    'UPDATE workout_exercises SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
                    [$now, $now, $id]
                );
            }
        }
    }
}
