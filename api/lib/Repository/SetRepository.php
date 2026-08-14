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
}
