<?php
declare(strict_types=1);

final class SetRepository extends BaseRepository
{
    public function upsert(array $row): array
    {
        $id = (string) $row['id'];
        $now = self::nowIso();
        $columns = [
            'id' => $id,
            'session_id' => $row['session_id'] ?? null,
            'exercise_id' => $row['exercise_id'] ?? null,
            'workout_exercise_id' => $row['workout_exercise_id'] ?? null,
            'set_index' => $row['set_index'] ?? null,
            'weight_kg' => $row['weight_kg'] ?? null,
            'reps' => $row['reps'] ?? null,
            'is_warmup' => $row['is_warmup'] ?? 0,
            'rpe' => $row['rpe'] ?? null,
            'performed_at' => $row['performed_at'] ?? null,
            'created_at' => $row['created_at'] ?? $now,
            'updated_at' => $row['updated_at'] ?? $now,
            'deleted_at' => $row['deleted_at'] ?? null,
        ];
        $this->upsertRow('sets', $columns, $id);
        return $this->find($id) ?? $columns;
    }

    public function find(string $id): ?array
    {
        return $this->fetchOne('SELECT * FROM sets WHERE id = ?', [$id]);
    }

    // Most recent session's sets for this exercise -- used to pre-fill a
    // new tracking session with last time's actual weight/reps. No
    // computed suggestion here (that's Stage 3's progression engine).
    public function lastSetsForExercise(string $exerciseId): array
    {
        $lastSession = $this->fetchOne(
            'SELECT session_id FROM sets WHERE exercise_id = ? AND deleted_at IS NULL ORDER BY performed_at DESC LIMIT 1',
            [$exerciseId]
        );
        if ($lastSession === null) {
            return [];
        }

        return $this->fetchAll(
            'SELECT * FROM sets WHERE exercise_id = ? AND session_id = ? AND deleted_at IS NULL ORDER BY set_index',
            [$exerciseId, $lastSession['session_id']]
        );
    }

    // Total volume load (Σ weight × reps, CLAUDE.md §8) of the most recent
    // other completed session of this workout -- used to compare a
    // just-finished session against "last time". Warmup sets excluded.
    public function lastSessionVolume(string $workoutId, ?string $excludeSessionId): ?array
    {
        $sql = 'SELECT s.id AS session_id, s.started_at,
                       SUM(st.weight_kg * st.reps) AS volume_kg,
                       COUNT(st.id) AS sets_count
                FROM sessions s
                JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
                WHERE s.workout_id = ? AND s.deleted_at IS NULL';
        $params = [$workoutId];
        if ($excludeSessionId !== null) {
            $sql .= ' AND s.id != ?';
            $params[] = $excludeSessionId;
        }
        $sql .= ' GROUP BY s.id ORDER BY s.started_at DESC LIMIT 1';

        return $this->fetchOne($sql, $params);
    }

    // Per-session e1RM (Epley) and volume trend for one exercise, oldest
    // first -- feeds the exercise-detail chart. Plain arithmetic (no SQLite
    // UDF) so this stays portable to the MySQL fallback (CLAUDE.md §3).
    // Warmup sets excluded, same convention as lastSessionVolume().
    public function historyForExercise(string $exerciseId, int $limit = 20): array
    {
        return $this->fetchAll(
            'SELECT session_id, started_at, best_e1rm, volume_kg FROM (
                SELECT s.id AS session_id, s.started_at,
                       MAX(st.weight_kg * (1 + st.reps / 30.0)) AS best_e1rm,
                       SUM(st.weight_kg * st.reps) AS volume_kg
                FROM sessions s
                JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
                WHERE s.deleted_at IS NULL AND st.exercise_id = ?
                GROUP BY s.id
                ORDER BY s.started_at DESC
                LIMIT ' . (int) $limit . '
             ) ORDER BY started_at ASC',
            [$exerciseId]
        );
    }
}
