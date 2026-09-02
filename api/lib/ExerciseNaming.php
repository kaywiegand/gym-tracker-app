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

    // Gym shorthand for the muscle part. The source taxonomy is anatomical
    // ("Abdominals", "Quadriceps"); nobody types that when looking for an
    // exercise. Everything not listed here is already short enough.
    private const MUSCLE_LABELS = [
        'abdominals' => 'Abs',
        'quadriceps' => 'Quads',
        'middle back' => 'Mid Back',
    ];

    public static function muscleLabel(?string $muscle): string
    {
        $muscle = trim((string) ($muscle ?? ''));
        if ($muscle === '') {
            return '';
        }
        return self::MUSCLE_LABELS[strtolower($muscle)] ?? $muscle;
    }

    public static function equipmentLabel(?string $equipment): string
    {
        if ($equipment === null || trim($equipment) === '') {
            return '';
        }
        $key = strtolower(trim($equipment));
        return self::EQUIPMENT_LABELS[$key] ?? ucwords($key);
    }

    // Movement words recognised in a source name, longest/most specific first
    // (a "Face Pull" must not be read as a "Pull", "Push-Up" not as "Press").
    // Only used when nobody has curated the exercise by hand -- it gives every
    // exercise a structured first line instead of falling back to the raw
    // source name, which is what made the library read as a mixed bag.
    private const MOVEMENT_PATTERNS = [
        'Good Morning' => ['good morning'],
        'Face Pull' => ['face pull'],
        'Pull-Through' => ['pull through', 'pull-through'],
        'Upright Row' => ['upright row'],
        'Push-Up' => ['push-up', 'push up', 'pushup', 'pressup', 'press-up'],
        'Pull-Up' => ['pull-up', 'pull up', 'pullup', 'chin-up', 'chin up', 'chinup'],
        'Pulldown' => ['pulldown', 'pull-down', 'pull down'],
        'Pushdown' => ['pushdown', 'push-down', 'push down'],
        'Sit-Up' => ['sit-up', 'sit up', 'situp'],
        'Step-Up' => ['step-up', 'step up', 'step ups'],
        'Rollout' => ['rollout', 'roll-out', 'roll out'],
        'Deadlift' => ['deadlift', 'dead lift'],
        'Kickback' => ['kickback', 'kick-back'],
        'Pullover' => ['pullover', 'pull-over'],
        'Shrug' => ['shrug'],
        'Squat' => ['squat'],
        'Lunge' => ['lunge'],
        'Bridge' => ['bridge'],
        'Thruster' => ['thruster'],
        'Snatch' => ['snatch'],
        'Clean' => ['clean'],
        'Jerk' => ['jerk'],
        'Crunch' => ['crunch'],
        'Twist' => ['twist'],
        'Chop' => ['wood chop', 'chop'],
        'Plank' => ['plank'],
        'Dip' => ['dip'],
        'Fly' => ['flye', 'fly', 'crossover', 'cross-over'],
        'Extension' => ['extension', 'hyperextension', 'skullcrusher', 'skull crusher', 'overhead triceps', 'triceps'],
        'Rotation' => ['rotation', 'pronation', 'supination', 'circles', 'rotations'],
        'Squeeze' => ['pinch', 'squeeze', 'gripper'],
        'Roll' => ['roller', '-smr', 'foam roll'],
        'Curl' => ['curl'],
        'Raise' => ['raise', 'lateral'],
        'Row' => ['row'],
        'Press' => ['press', 'bench'],
        'Stretch' => ['stretch'],
        'Hold' => ['hold', 'isometric'],
        'Carry' => ['carry', 'walk', 'farmer'],
        'Muscle-Up' => ['muscle up', 'muscle-up'],
        'High Pull' => ['high pull'],
        'Side Bend' => ['side bend'],
        'Hip Thrust' => ['hip thrust', 'hip lift'],
        'Rack Pull' => ['rack pull'],
        'Push' => ['sled push', 'push'],
        'Drag' => ['drag', 'sled'],
        'Flip' => ['tire flip', 'flip'],
        'Crawl' => ['crawl'],
        'Climb' => ['climb'],
        'Swing' => ['swing'],
        'Slam' => ['slam'],
        'Pass' => ['pass', 'chest push'],
        'Cycle' => ['bicycl', 'bike', 'elliptical', 'treadmill', 'stairmaster', 'step mill'],
        'Load' => ['load', 'stone'],
        'Throw' => ['throw', 'toss'],
        'Jump' => ['jump', 'hop'],
        'Sprint' => ['sprint', 'run'],
    ];

    // Source names whose movement no keyword catches -- mostly gym slang
    // ("Cocoons", "Otis-Up", "Spell Caster"). Listed by exact name so every
    // exercise in the library ends up with a structured title, which is the
    // whole point of the scheme: an exercise you cannot name you cannot find.
    private const MOVEMENT_BY_NAME = [
        'advanced kettlebell windmill' => 'Windmill',
        'alternate heel touchers' => 'Crunch',
        'around the worlds' => 'Fly',
        'balance board' => 'Hold',
        'band hip adductions' => 'Adduction',
        'band pull apart' => 'Fly',
        'battling ropes' => 'Wave',
        'body-up' => 'Extension',
        'bottoms up' => 'Raise',
        'butt-ups' => 'Crunch',
        'cable hip adduction' => 'Adduction',
        'cable iron cross' => 'Fly',
        'car drivers' => 'Rotation',
        'cocoons' => 'Crunch',
        'cross over - with bands' => 'Fly',
        'dead bug' => 'Hold',
        'double kettlebell windmill' => 'Windmill',
        'downward facing balance' => 'Hold',
        'dumbbell scaption' => 'Raise',
        'elbow to knee' => 'Crunch',
        'exercise ball pull-in' => 'Crunch',
        'flutter kicks' => 'Raise',
        'gironda sternum chins' => 'Pull-Up',
        'hanging pike' => 'Raise',
        'hip flexion with band' => 'Raise',
        'iron cross' => 'Fly',
        'kettlebell figure 8' => 'Pass',
        'kettlebell pirate ships' => 'Press',
        'kettlebell windmill' => 'Windmill',
        "landmine 180's" => 'Rotation',
        'landmine linear jammer' => 'Press',
        'leg lift' => 'Raise',
        'leg pull-in' => 'Crunch',
        'lying face down plate neck resistance' => 'Extension',
        'lying face up plate neck resistance' => 'Extension',
        'mixed grip chin' => 'Pull-Up',
        'otis-up' => 'Sit-Up',
        'platform hamstring slides' => 'Curl',
        'power partials' => 'Raise',
        'prone manual hamstring' => 'Curl',
        'seated head harness neck resistance' => 'Extension',
        'seated leg tucks' => 'Crunch',
        'side jackknife' => 'Crunch',
        'side to side chins' => 'Pull-Up',
        'single-arm linear jammer' => 'Press',
        'spell caster' => 'Rotation',
        'standing cable lift' => 'Chop',
        'suspended fallout' => 'Rollout',
        'skating' => 'Skate',
        'rack delivery' => 'Clean',
        'wide stance stiff legs' => 'Deadlift',
    ];

    // Last resort per source category: a stretch is a Stretch even when its
    // name never says so ("Child's Pose", "Groiners").
    private const MOVEMENT_BY_CATEGORY = [
        'stretching' => 'Stretch',
        'plyometrics' => 'Drill',
        'strongman' => 'Carry',
        'cardio' => 'Cardio',
        'olympic weightlifting' => 'Lift',
    ];

    // Best-effort movement for an exercise nobody curated. Deliberately a
    // guess: the hand-curated value always wins, and this never sets
    // is_curated -- it only stops the display name from falling back to the
    // raw source name.
    public static function inferMovement(?string $sourceName, ?string $category = null): ?string
    {
        $name = strtolower(trim((string) $sourceName));
        if ($name === '') {
            return null;
        }
        if (isset(self::MOVEMENT_BY_NAME[$name])) {
            return self::MOVEMENT_BY_NAME[$name];
        }
        foreach (self::MOVEMENT_PATTERNS as $movement => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($name, $needle)) {
                    return $movement;
                }
            }
        }
        $category = strtolower(trim((string) $category));
        return self::MOVEMENT_BY_CATEGORY[$category] ?? null;
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
            // Not curated -- guess the movement so this still reads as a
            // structured name. Only a name we truly cannot structure keeps
            // the raw source name.
            $movement = (string) (self::inferMovement($row['name'] ?? null, $row['category'] ?? null) ?? '');
        }
        if ($movement === '') {
            return (string) ($row['name'] ?? '');
        }

        $muscle = self::muscleLabel($row['primary_muscle'] ?? null);
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

    // SQL for the columns a joined query needs so its rows can be decorated.
    // Used wherever an exercise is read through a JOIN (workout contents,
    // export) -- selecting e.name alone there was what made the same exercise
    // show up under two different names in two different screens.
    public static function selectColumns(string $alias = 'e', string $prefix = 'exercise_'): string
    {
        return "{$alias}.name AS {$prefix}name,
                {$alias}.movement AS {$prefix}movement,
                {$alias}.variant AS {$prefix}variant,
                {$alias}.display_alias AS {$prefix}display_alias,
                {$alias}.is_curated AS {$prefix}is_curated,
                {$alias}.equipment AS {$prefix}equipment,
                {$alias}.category AS {$prefix}category,
                (SELECT mu.name_en FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                 WHERE em.exercise_id = {$alias}.id AND em.role = 'primary'
                 ORDER BY mu.sort LIMIT 1) AS {$prefix}primary_muscle";
    }

    // Decorates a joined row whose exercise columns carry a prefix, adding
    // <prefix>display_name and <prefix>display_subtitle.
    public static function decorateJoined(array $row, string $prefix = 'exercise_'): array
    {
        $inner = [];
        foreach (['name', 'movement', 'variant', 'display_alias', 'is_curated', 'equipment', 'category', 'primary_muscle'] as $key) {
            $inner[$key] = $row[$prefix . $key] ?? null;
        }
        $row[$prefix . 'display_name'] = self::displayName($inner);
        $row[$prefix . 'display_subtitle'] = self::displayAlias($inner);
        return $row;
    }

    public static function decorateAllJoined(array $rows, string $prefix = 'exercise_'): array
    {
        return array_map(static fn ($r) => self::decorateJoined($r, $prefix), $rows);
    }
}
