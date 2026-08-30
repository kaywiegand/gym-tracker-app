<?php
declare(strict_types=1);

// Builds the structured display name: <Muscle> <Movement> <Equipment> <Variant>
//   "Chest Press Barbell Incline", "Back Row Cable Seated"
//
// The name is COMPUTED, never typed. Two exercises with the same four parts
// collide visibly at once, and nobody can produce a typo variant of a name
// that already exists. The source's original name (exercises.name) stays
// untouched as the alias fallback -- swapping the seed data source later
// only needs the same four inputs, not the same strings.
//
// An exercise counts as curated once it has a movement. Without one there is
// nothing to build a structured name from, so the original name is used.
final class ExerciseNaming
{
    // Source equipment values -> how they read in a name. '' drops the part
    // ("other" and a missing value carry no information worth showing).
    private const EQUIPMENT_LABELS = [
        'barbell' => 'Barbell',
        'dumbbell' => 'Dumbbell',
        'cable' => 'Cable',
        'machine' => 'Machine',
        'body only' => 'Bodyweight',
        'kettlebells' => 'Kettlebell',
        'bands' => 'Band',
        'e-z curl bar' => 'EZ-Bar',
        'medicine ball' => 'Medicine Ball',
        'exercise ball' => 'Exercise Ball',
        'foam roll' => 'Foam Roller',
        'other' => '',
    ];

    public static function equipmentLabel(?string $equipment): string
    {
        if ($equipment === null || trim($equipment) === '') {
            return '';
        }
        $key = strtolower(trim($equipment));
        return self::EQUIPMENT_LABELS[$key] ?? ucwords($key);
    }

    public static function isCurated(array $row): bool
    {
        return trim((string) ($row['movement'] ?? '')) !== '';
    }

    // $row needs: movement, variant, equipment, primary_muscle, name.
    public static function displayName(array $row): string
    {
        $movement = trim((string) ($row['movement'] ?? ''));
        if ($movement === '') {
            return (string) ($row['name'] ?? '');
        }

        $muscle = trim((string) ($row['primary_muscle'] ?? ''));
        $equipment = self::equipmentLabel($row['equipment'] ?? null);
        $variant = trim((string) ($row['variant'] ?? ''));

        // A variant that only repeats a part already in the name reads as a
        // stutter ("Lats Row Machine Machine", "Abdominals Crunch Cable Cable").
        // Drop it -- the part it duplicates already says the same thing.
        if (strcasecmp($variant, $equipment) === 0 || strcasecmp($variant, $muscle) === 0) {
            $variant = '';
        }

        $parts = [$muscle, $movement, $equipment, $variant];

        $name = implode(' ', array_filter($parts, static fn ($p) => $p !== ''));
        return $name !== '' ? $name : (string) ($row['name'] ?? '');
    }

    // The common gym name shown as the small second line. Falls back to the
    // source's original name, which is exactly what a common name is for an
    // exercise nobody has curated yet.
    public static function displayAlias(array $row): string
    {
        $alias = trim((string) ($row['display_alias'] ?? ''));
        return $alias !== '' ? $alias : (string) ($row['name'] ?? '');
    }

    // Adds the two rendered fields, in place of doing it in SQL (keeps the
    // string logic in one testable place, and portable to MySQL).
    //
    // display_alias is deliberately left ALONE: it is the raw stored value and
    // the editor has to show it as the user typed it (empty = nothing typed).
    // The resolved fallback goes to display_subtitle, which is display-only.
    public static function decorate(array $row): array
    {
        $row['display_name'] = self::displayName($row);
        $row['display_subtitle'] = self::displayAlias($row);
        $row['is_curated'] = (int) (!empty($row['is_curated']) || self::isCurated($row));
        return $row;
    }

    public static function decorateAll(array $rows): array
    {
        return array_map([self::class, 'decorate'], $rows);
    }
}
