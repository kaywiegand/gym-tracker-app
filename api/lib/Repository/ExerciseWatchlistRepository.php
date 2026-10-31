<?php
declare(strict_types=1);

// Exercises saved for later (BACKLOG #166). A row stays after removal, so
// saving again revives it and created_at keeps saying when it was first saved.
final class ExerciseWatchlistRepository extends BaseRepository
{
    // false: no such exercise.
    public function set(string $exerciseId, bool $watched): bool
    {
        if ($this->fetchOne('SELECT id FROM exercises WHERE id = ? AND deleted_at IS NULL', [$exerciseId]) === null) {
            return false;
        }

        $now = self::nowIso();
        $existing = $this->fetchOne('SELECT id FROM exercise_watchlist WHERE exercise_id = ?', [$exerciseId]);
        if ($existing !== null) {
            $this->execute(
                'UPDATE exercise_watchlist SET deleted_at = ?, updated_at = ? WHERE id = ?',
                [$watched ? null : $now, $now, $existing['id']]
            );
        } elseif ($watched) {
            $this->execute(
                'INSERT INTO exercise_watchlist (id, exercise_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, NULL)',
                [Uuid::v4(), $exerciseId, $now, $now]
            );
        }
        return true;
    }
}
