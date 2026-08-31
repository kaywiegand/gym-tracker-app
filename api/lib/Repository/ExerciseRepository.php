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

    public function list(?string $q, ?string $region, ?string $mechanic, bool $curatedOnly = false): array
    {
        $sql = 'SELECT * FROM (
            SELECT e.id, e.name, e.movement, e.variant, e.display_alias, e.is_curated,
              e.equipment, e.mechanic, e.category, e.default_increment_kg,
              ' . self::PRIMARY_REGION_SUBQUERY . ' AS region,
              ' . self::PRIMARY_MUSCLE_SUBQUERY . ' AS primary_muscle
            FROM exercises e
            WHERE e.deleted_at IS NULL
        ) t WHERE 1=1';
        $params = [];

        if ($curatedOnly) {
            $sql .= ' AND t.is_curated = 1';
        }
        if ($region !== null && strtolower($region) !== 'all') {
            $sql .= ' AND t.region = :region';
            $params['region'] = strtolower($region);
        }
        if ($mechanic !== null && strtolower($mechanic) !== 'all') {
            $sql .= ' AND t.mechanic = :mechanic';
            $params['mechanic'] = strtolower($mechanic);
        }
        // NOTE: `q` is deliberately NOT filtered here. The display name is
        // assembled in PHP (and its muscle/equipment words are relabelled on
        // the way), so SQL cannot match what the user actually sees -- a
        // search for "abs rotation cable" has to hit "Abs Rotation Cable"
        // even though no column contains that string. Filtering happens
        // below, after decoration.
        // Sort in the display name's own reading order: muscle -> movement ->
        // equipment -> variant. Sorting by movement first would scatter one
        // muscle's exercises across the group even though every row starts
        // with that muscle. Uncurated rows sort last, by their source name.
        $sql .= ' ORDER BY t.region, t.movement IS NULL, t.primary_muscle, t.movement, t.equipment, t.variant, t.name';

        $rows = ExerciseNaming::decorateAll($this->fetchAll($sql, $params));

        return $q === null || trim($q) === '' ? $rows : self::filterByQuery($rows, $q);
    }

    // Every word of the query must appear somewhere in the exercise: the
    // structured display name, the common name, or the original source name.
    // Word-wise rather than as one substring, so the parts can be typed in
    // any order -- "cable abs rotation" finds the same thing as
    // "abs rotation cable".
    private static function filterByQuery(array $rows, string $q): array
    {
        $terms = preg_split('/\s+/', mb_strtolower(trim($q)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if ($terms === []) {
            return $rows;
        }

        $matched = array_values(array_filter($rows, static function (array $row) use ($terms): bool {
            $haystack = mb_strtolower(implode(' ', array_filter([
                $row['display_name'] ?? '',
                $row['display_subtitle'] ?? '',
                $row['name'] ?? '',
                $row['equipment'] ?? '',
            ])));
            foreach ($terms as $term) {
                // Word START, not any substring: "rdl" must find "RDL" but
                // not "Hurdle Hops". Hyphens count as boundaries so "grip"
                // still finds "Close-Grip".
                if (preg_match('/(?:^|[^\p{L}\p{N}])' . preg_quote($term, '/') . '/u', $haystack) !== 1) {
                    return false;
                }
            }
            return true;
        }));

        // Curated exercises first -- their names were checked by hand, so
        // they are the ones worth offering before an inferred guess.
        usort($matched, static fn ($a, $b) => ((int) ($b['is_curated'] ?? 0)) <=> ((int) ($a['is_curated'] ?? 0)));

        return $matched;
    }

    // Distinct movement values already in use -- feeds the editor's combobox
    // so a second spelling of an existing movement never gets created.
    public function movements(): array
    {
        $rows = $this->fetchAll(
            "SELECT DISTINCT movement FROM exercises
             WHERE deleted_at IS NULL AND movement IS NOT NULL AND movement <> ''
             ORDER BY movement"
        );
        return array_column($rows, 'movement');
    }

    public function variants(): array
    {
        $rows = $this->fetchAll(
            "SELECT DISTINCT variant FROM exercises
             WHERE deleted_at IS NULL AND variant IS NOT NULL AND variant <> ''
             ORDER BY variant"
        );
        return array_column($rows, 'variant');
    }

    public function find(string $id): ?array
    {
        $exercise = $this->fetchOne(
            'SELECT e.id, e.name, e.movement, e.variant, e.display_alias, e.is_curated,
                    e.equipment, e.mechanic, e.category, e.default_increment_kg, e.source, e.external_id,
                    e.created_at, e.updated_at,
                    ' . self::PRIMARY_MUSCLE_SUBQUERY . ' AS primary_muscle
             FROM exercises e WHERE e.id = ? AND e.deleted_at IS NULL',
            [$id]
        );
        if ($exercise === null) {
            return null;
        }
        $exercise = ExerciseNaming::decorate($exercise);

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
            'INSERT INTO exercises (id, name, movement, variant, display_alias, is_curated, equipment, mechanic, category, default_increment_kg, source, external_id, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
            [
                $id,
                $data['name'],
                self::blankToNull($data['movement'] ?? null),
                self::blankToNull($data['variant'] ?? null),
                self::blankToNull($data['display_alias'] ?? null),
                self::curatedFlag($data),
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
        // Raw row on purpose: find() runs the row through ExerciseNaming,
        // which resolves a missing alias to the source name. Falling back to
        // that decorated value would silently persist the FEDB name into
        // display_alias on any update that doesn't send the field.
        $existing = $this->fetchOne(
            'SELECT name, movement, variant, display_alias, is_curated, equipment, mechanic, category, default_increment_kg
             FROM exercises WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
        if ($existing === null) {
            return null;
        }

        $this->execute(
            'UPDATE exercises SET name = ?, movement = ?, variant = ?, display_alias = ?, is_curated = ?, equipment = ?, mechanic = ?, category = ?, default_increment_kg = ?, updated_at = ?
             WHERE id = ?',
            [
                $data['name'] ?? $existing['name'],
                self::blankToNull($data['movement'] ?? $existing['movement']),
                self::blankToNull($data['variant'] ?? $existing['variant']),
                self::blankToNull($data['display_alias'] ?? $existing['display_alias']),
                self::curatedFlag($data + ['movement' => $existing['movement'], 'is_curated' => $existing['is_curated']]),
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

    // Empty strings from the editor mean "not set", not "set to nothing" --
    // storing '' would make an exercise look curated with a blank movement.
    private static function blankToNull(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : $value;
    }

    // Curated is derived, not freely settable: an exercise without a movement
    // has no structured name, so it can never count as curated. An explicit
    // is_curated = 0 still wins (hide it without losing the naming work).
    private static function curatedFlag(array $data): int
    {
        if (self::blankToNull($data['movement'] ?? null) === null) {
            return 0;
        }
        return array_key_exists('is_curated', $data) ? (int) (bool) $data['is_curated'] : 1;
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
