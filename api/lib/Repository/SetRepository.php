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
    // $sinceDays (optional) switches from the small display-limit default to
    // a real date window (Stage 4 Exercise-scope range selector) -- when
    // set, the LIMIT is raised to a generous cap instead of the small
    // default so the date filter, not the row cap, decides what's included.
    // Existing callers (ExerciseDetailSheet's ?limit=20, no range) are
    // unaffected.
    public function historyForExercise(string $exerciseId, int $limit = 20, ?int $sinceDays = null): array
    {
        $params = [$exerciseId];
        $sql = 'SELECT s.id AS session_id, s.started_at,
                       MAX(st.weight_kg * (1 + st.reps / 30.0)) AS best_e1rm,
                       SUM(st.weight_kg * st.reps) AS volume_kg
                FROM sessions s
                JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
                WHERE s.deleted_at IS NULL AND st.exercise_id = ?';
        if ($sinceDays !== null) {
            $sql .= ' AND s.started_at >= ?';
            $params[] = gmdate('Y-m-d\TH:i:s\Z', time() - $sinceDays * 86400);
            $limit = max($limit, 500);
        }
        $sql .= ' GROUP BY s.id ORDER BY s.started_at DESC LIMIT ' . (int) $limit;

        return $this->fetchAll("SELECT session_id, started_at, best_e1rm, volume_kg FROM ({$sql}) ORDER BY started_at ASC", $params);
    }

    // Raw rows for the muscle-volume dashboard (Stage 4) -- one row per
    // exercise_muscles mapping a logged set touches (primary AND secondary,
    // unlike ExerciseRepository/WorkoutRepository's role='primary'-only
    // subqueries used for display). Week-bucketing and secondary-muscle
    // weighting happen in MuscleVolume::weeklyByRegion(), not here.
    public function rawSetsWithMuscles(int $sinceDays): array
    {
        $cutoff = gmdate('Y-m-d\TH:i:s\Z', time() - $sinceDays * 86400);
        return $this->fetchAll(
            'SELECT st.performed_at, st.weight_kg, st.reps, em.weight AS muscle_weight, mu.region
             FROM sets st
             JOIN exercise_muscles em ON em.exercise_id = st.exercise_id
             JOIN muscles mu ON mu.id = em.muscle_id
             WHERE st.deleted_at IS NULL AND st.is_warmup = 0 AND st.performed_at >= ?',
            [$cutoff]
        );
    }

    // Whole-body daily training load for ACWR (Stage 4, CLAUDE.md §8) -- no
    // muscle join, every exercise counts once.
    public function dailyVolume(int $days): array
    {
        $cutoff = gmdate('Y-m-d\TH:i:s\Z', time() - $days * 86400);
        return $this->fetchAll(
            'SELECT performed_at, weight_kg, reps FROM sets
             WHERE deleted_at IS NULL AND is_warmup = 0 AND performed_at >= ?',
            [$cutoff]
        );
    }

    // Weighted sets-per-region for the last $limit sessions of one workout
    // (Stage 4 workout-scope muscle split) -- same primary+secondary join as
    // rawSetsWithMuscles(), scoped to a single workout's own history.
    public function muscleSplitForWorkout(string $workoutId, int $limit = 6, ?int $sinceDays = null): array
    {
        $innerParams = [$workoutId];
        $innerSql = 'SELECT id FROM sessions WHERE workout_id = ? AND deleted_at IS NULL';
        if ($sinceDays !== null) {
            $innerSql .= ' AND started_at >= ?';
            $innerParams[] = gmdate('Y-m-d\TH:i:s\Z', time() - $sinceDays * 86400);
            $limit = max($limit, 500);
        }
        $innerSql .= ' ORDER BY started_at DESC LIMIT ' . (int) $limit;

        $rows = $this->fetchAll(
            "SELECT st.session_id, s.started_at, s.ended_at, mu.region, SUM(em.weight) AS sets
             FROM sessions s
             JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
             JOIN exercise_muscles em ON em.exercise_id = st.exercise_id
             JOIN muscles mu ON mu.id = em.muscle_id
             WHERE s.workout_id = ? AND s.deleted_at IS NULL
               AND s.id IN ({$innerSql})
             GROUP BY st.session_id, s.started_at, s.ended_at, mu.region
             ORDER BY s.started_at ASC",
            array_merge([$workoutId], $innerParams)
        );

        $bySession = [];
        foreach ($rows as $row) {
            $sessionId = $row['session_id'];
            $bySession[$sessionId] ??= [
                'session_id' => $sessionId,
                'started_at' => $row['started_at'],
                'ended_at' => $row['ended_at'],
                'by_region' => [],
            ];
            $bySession[$sessionId]['by_region'][$row['region']] = (float) $row['sets'];
        }
        return array_values($bySession);
    }

    // Per-set detail for the last $limit sessions of one exercise, oldest
    // first -- raw material for the Stage 4 "progression ladder" (formatting
    // and up/hold comparisons happen client-side). Unlike historyForExercise
    // (aggregated best_e1rm/volume), this keeps every individual set.
    public function sessionSummariesForExercise(string $exerciseId, int $limit = 6, ?int $sinceDays = null): array
    {
        $params = [$exerciseId];
        $sql = 'SELECT DISTINCT s.id AS session_id, s.started_at
                FROM sessions s
                JOIN sets st ON st.session_id = s.id AND st.deleted_at IS NULL AND st.is_warmup = 0
                WHERE s.deleted_at IS NULL AND st.exercise_id = ?';
        if ($sinceDays !== null) {
            $sql .= ' AND s.started_at >= ?';
            $params[] = gmdate('Y-m-d\TH:i:s\Z', time() - $sinceDays * 86400);
            $limit = max($limit, 500);
        }
        $sql .= ' ORDER BY s.started_at DESC LIMIT ' . (int) $limit;
        $sessionRows = $this->fetchAll($sql, $params);
        if ($sessionRows === []) {
            return [];
        }

        $sessionIds = array_column($sessionRows, 'session_id');
        $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
        $setRows = $this->fetchAll(
            "SELECT session_id, weight_kg, reps FROM sets
             WHERE exercise_id = ? AND deleted_at IS NULL AND is_warmup = 0 AND session_id IN ({$placeholders})
             ORDER BY set_index",
            array_merge([$exerciseId], $sessionIds)
        );

        $setsBySession = [];
        foreach ($setRows as $row) {
            $setsBySession[$row['session_id']][] = ['weight_kg' => (float) $row['weight_kg'], 'reps' => (int) $row['reps']];
        }

        $result = [];
        foreach (array_reverse($sessionRows) as $session) {
            $result[] = [
                'session_id' => $session['session_id'],
                'started_at' => $session['started_at'],
                'sets' => $setsBySession[$session['session_id']] ?? [],
            ];
        }
        return $result;
    }
}
