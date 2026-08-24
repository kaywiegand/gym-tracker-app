<?php
declare(strict_types=1);

// Full backup/restore of every user-generated table (CLAUDE.md §2:
// "Datenhoheit: self-hosted, ... kein Lock-in"). Deliberately distinct
// from Stage 6's future Export/PDF (human-readable reports) -- this is a
// raw JSON disaster-recovery/portability mechanism. Reference/seed tables
// reproducible via `php db/migrate.php` (muscles, training_modes,
// muscle_volume_targets, FEDB exercises) are excluded on purpose.
//
// Restore is an explicit, one-time user action ("bring back what's in this
// file") -- NOT the same thing as live sync's last-write-wins merge. A
// restored row always overwrites whatever is currently in the DB,
// regardless of updated_at. (Real bug this fixed: restoring a backup taken
// before a since-deleted row was deleted used to be silently ignored,
// because the delete's updated_at was newer than the backup's snapshot --
// exactly backwards for a recovery action.) Tables without an id/updated_at
// shape (bia_values, hr_samples, media: immutable child rows) get simple
// insert-if-id-missing handling, and settings (key/value, no id) gets its
// own tiny upsert-by-key.
final class BackupRepository extends BaseRepository
{
    // Parents before children -- matters for readability/restore order
    // even though this schema declares no enforced FK constraints.
    private const UPSERT_ORDER = [
        'exercises', 'workouts', 'workout_exercises', 'sessions', 'sets',
        'bodyweight', 'body_measurements', 'bia_measurements',
    ];

    public function exportAll(): array
    {
        $tables = [];
        $tables['settings'] = $this->fetchAll('SELECT key, value FROM settings');

        $customExercises = $this->fetchAll("SELECT * FROM exercises WHERE source != 'fedb'");
        $tables['exercises'] = $customExercises;
        $customIds = array_column($customExercises, 'id');

        $tables['exercise_muscles'] = $customIds === []
            ? []
            : $this->fetchAll(
                'SELECT * FROM exercise_muscles WHERE exercise_id IN (' . $this->placeholders($customIds) . ')',
                $customIds
            );

        foreach (self::UPSERT_ORDER as $table) {
            if ($table === 'exercises') {
                continue;
            }
            $tables[$table] = $this->fetchAll("SELECT * FROM {$table}");
        }

        $tables['bia_values'] = $this->fetchAll('SELECT * FROM bia_values');
        $tables['hr_samples'] = $this->fetchAll('SELECT * FROM hr_samples');

        $mediaConditions = ['bia_measurement_id IS NOT NULL'];
        $mediaParams = [];
        if ($customIds !== []) {
            $mediaConditions[] = 'exercise_id IN (' . $this->placeholders($customIds) . ')';
            $mediaParams = $customIds;
        }
        $tables['media'] = $this->fetchAll('SELECT * FROM media WHERE ' . implode(' OR ', $mediaConditions), $mediaParams);

        return $tables;
    }

    public function importAll(array $tables): array
    {
        $summary = [];
        $summary['settings'] = $this->importSettings($tables['settings'] ?? []);

        foreach (self::UPSERT_ORDER as $table) {
            $summary[$table] = $this->importUpsertTable($table, $tables[$table] ?? []);
        }

        $summary['exercise_muscles'] = $this->importExerciseMuscles($tables['exercise_muscles'] ?? []);
        $summary['bia_values'] = $this->importInsertOnly('bia_values', $tables['bia_values'] ?? []);
        $summary['hr_samples'] = $this->importInsertOnly('hr_samples', $tables['hr_samples'] ?? []);
        $summary['media'] = $this->importInsertOnly('media', $tables['media'] ?? []);

        return $summary;
    }

    private function placeholders(array $values): string
    {
        return implode(', ', array_fill(0, count($values), '?'));
    }

    private function importSettings(array $rows): array
    {
        $inserted = 0;
        $updated = 0;
        foreach ($rows as $row) {
            if (!isset($row['key'])) {
                continue;
            }
            $existing = $this->fetchOne('SELECT value FROM settings WHERE key = ?', [$row['key']]);
            if ($existing === null) {
                $this->execute('INSERT INTO settings (key, value) VALUES (?, ?)', [$row['key'], $row['value'] ?? null]);
                $inserted++;
            } else {
                $this->execute('UPDATE settings SET value = ? WHERE key = ?', [$row['value'] ?? null, $row['key']]);
                $updated++;
            }
        }
        return ['inserted' => $inserted, 'updated' => $updated, 'skipped' => 0];
    }

    // $row's keys already match the table's columns exactly (it came from
    // SELECT * in exportAll(), round-tripped through JSON, which preserves
    // key order). Unconditional overwrite -- see class doc comment for why
    // this can't reuse BaseRepository::upsertRow()'s timestamp guard.
    private function importUpsertTable(string $table, array $rows): array
    {
        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        foreach ($rows as $row) {
            if (!isset($row['id'])) {
                $skipped++;
                continue;
            }
            if ($this->forceUpsertRow($table, $row)) {
                $inserted++;
            } else {
                $updated++;
            }
        }
        return ['inserted' => $inserted, 'updated' => $updated, 'skipped' => $skipped];
    }

    // Insert-or-overwrite by id, no updated_at comparison. Returns true if
    // the row was newly inserted, false if an existing row was overwritten.
    private function forceUpsertRow(string $table, array $columns): bool
    {
        $id = (string) $columns['id'];
        $existing = $this->fetchOne("SELECT id FROM {$table} WHERE id = ?", [$id]);
        $cols = array_keys($columns);

        if ($existing === null) {
            $this->execute(
                "INSERT INTO {$table} (" . implode(', ', $cols) . ') VALUES (' . $this->placeholders($cols) . ')',
                array_values($columns)
            );
            return true;
        }

        $updateCols = array_values(array_filter($cols, fn ($c) => $c !== 'id'));
        $assignments = implode(', ', array_map(fn ($c) => "{$c} = ?", $updateCols));
        $params = array_map(fn ($c) => $columns[$c], $updateCols);
        $params[] = $id;
        $this->execute("UPDATE {$table} SET {$assignments} WHERE id = ?", $params);
        return false;
    }

    private function importExerciseMuscles(array $rows): array
    {
        $inserted = 0;
        $skipped = 0;
        $stmt = $this->db->prepare('INSERT INTO exercise_muscles (exercise_id, muscle_id, role, weight) VALUES (?, ?, ?, ?)');
        foreach ($rows as $row) {
            if (!isset($row['exercise_id'], $row['muscle_id'])) {
                continue;
            }
            $existing = $this->fetchOne(
                'SELECT 1 FROM exercise_muscles WHERE exercise_id = ? AND muscle_id = ?',
                [$row['exercise_id'], $row['muscle_id']]
            );
            if ($existing !== null) {
                $skipped++;
                continue;
            }
            $stmt->execute([$row['exercise_id'], $row['muscle_id'], $row['role'] ?? null, $row['weight'] ?? null]);
            $inserted++;
        }
        return ['inserted' => $inserted, 'updated' => 0, 'skipped' => $skipped];
    }

    private function importInsertOnly(string $table, array $rows): array
    {
        $inserted = 0;
        $skipped = 0;
        foreach ($rows as $row) {
            if (!isset($row['id'])) {
                continue;
            }
            $existing = $this->fetchOne("SELECT id FROM {$table} WHERE id = ?", [$row['id']]);
            if ($existing !== null) {
                $skipped++;
                continue;
            }
            $cols = array_keys($row);
            $this->execute(
                "INSERT INTO {$table} (" . implode(', ', $cols) . ') VALUES (' . $this->placeholders($cols) . ')',
                array_values($row)
            );
            $inserted++;
        }
        return ['inserted' => $inserted, 'updated' => 0, 'skipped' => $skipped];
    }
}
