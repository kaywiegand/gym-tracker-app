<?php
declare(strict_types=1);

// The second filter level (BACKLOG #169): which parts of a muscle group an
// exercise trains, primary first. Back, arms and legs come from the source's
// own muscles, primary and secondary. Shoulders, chest and abs are a single
// muscle there, so their part is read from the name, and the brachialis is not
// in the source at all. An exercise without a clear part (stretches, mobility,
// throws) shows under the muscle group, not under a part of it.
final class ExerciseFocus
{
    private const BY_MUSCLE = [
        'lats' => 'Lats',
        'middle back' => 'Mid Back',
        'lower back' => 'Lower Back',
        'traps' => 'Traps',
        'biceps' => 'Biceps',
        'triceps' => 'Triceps',
        'forearms' => 'Forearms',
        'quadriceps' => 'Quads',
        'hamstrings' => 'Hamstrings',
        'glutes' => 'Glutes',
        'calves' => 'Calves',
        'adductors' => 'Adductors',
        'abductors' => 'Abductors',
        'neck' => 'Neck',
    ];

    // Order matters: "Bent Over Low-Pulley Side Lateral" is a rear delt
    // exercise, whatever its name says about the side.
    private const SHOULDER_RULES = [
        'Rear' => '/\brear\b|rear-delt|reverse( \w+)? fl|reverse pec|back fl|pull apart|face pull|bent[- ]over/',
        'Side' => '/lateral|upright|deltoid raise/',
        'Front' => '/front|press|arnold|jerk|handstand|thruster/',
    ];

    private const OBLIQUES = '/oblique|twist|side bend|side bridge|side plank|side jackknife|chop|russian|windmill|rotation/';
    private const ABS_LOWER = '/leg raise|leg lift|knee raise|knee\\/hip|reverse crunch|hip raise|flutter|scissor|leg pull-in|leg tuck|toe touch|hanging pike|tuck crunch/';
    private const ABS_UPPER = '/crunch|sit-?up|heel touch|elbow to knee/';
    private const BRACHIALIS = '/hammer|reverse|zottman/';

    // $secondaryMuscles: the source's secondary muscles of this exercise.
    public static function of(array $row, array $secondaryMuscles = []): array
    {
        $parts = [];
        foreach ([...self::primary($row), ...array_map([self::class, 'muscleLabel'], $secondaryMuscles)] as $part) {
            if ($part !== null && !in_array($part, $parts, true)) {
                $parts[] = $part;
            }
        }
        return $parts;
    }

    private static function muscleLabel(string $muscle): ?string
    {
        return self::BY_MUSCLE[strtolower(trim($muscle))] ?? null;
    }

    // What the exercise mainly trains, without its assisting muscles.
    public static function primary(array $row): array
    {
        return array_values(array_filter(self::primaryParts($row), static fn (?string $part) => $part !== null));
    }

    private static function primaryParts(array $row): array
    {
        $muscle = strtolower(trim((string) ($row['primary_muscle'] ?? '')));
        $name = strtolower(trim(($row['name'] ?? '') . ' ' . ($row['display_alias'] ?? '') . ' ' . ($row['variant'] ?? '')));
        $movement = trim((string) ($row['movement'] ?? ''));
        if ($movement === '') {
            $movement = (string) ExerciseNaming::inferMovement($row['name'] ?? null, $row['category'] ?? null);
        }

        if (isset(self::BY_MUSCLE[$muscle])) {
            $isBrachialis = in_array($muscle, ['biceps', 'forearms'], true) && $movement === 'Curl'
                && !str_contains($name, 'wrist') && preg_match(self::BRACHIALIS, $name) === 1;
            return [self::BY_MUSCLE[$muscle], $isBrachialis ? 'Brachialis' : null];
        }

        return [match ($muscle) {
            'shoulders' => self::shoulderHead($name, $movement),
            'chest' => self::chestPart($name, $movement),
            'abdominals' => self::absPart($name, $movement),
            default => null,
        }];
    }

    private static function absPart(string $name, string $movement): ?string
    {
        // Planks, rollouts and the like hold the whole trunk: no single part,
        // so they show under Core only.
        if (str_contains($name, 'stretch')) {
            return null;
        }
        if (preg_match(self::OBLIQUES, $name) === 1) {
            return 'Obliques';
        }
        if (preg_match('/plank|rollout|roller|fallout|dead bug/', $name) === 1) {
            return null;
        }
        foreach (['Lower' => self::ABS_LOWER, 'Upper' => self::ABS_UPPER] as $part => $pattern) {
            if (preg_match($pattern, $name) === 1) {
                return $part;
            }
        }
        return null;
    }

    private static function shoulderHead(string $name, string $movement): ?string
    {
        if ($movement === 'Stretch' || str_contains($name, 'deltoid') && !str_contains($name, 'raise')) {
            return null;
        }
        foreach (self::SHOULDER_RULES as $head => $pattern) {
            if (preg_match($pattern, $name) === 1) {
                return $head;
            }
        }
        return null;
    }

    private static function chestPart(string $name, string $movement): ?string
    {
        if ($movement === 'Stretch') {
            return null;
        }
        // A push-up turns the bench around: hands up (incline) is the easy
        // version on the lower chest, feet up (decline) loads the upper chest.
        if ($movement === 'Push-Up') {
            if (str_contains($name, 'incline')) {
                return 'Lower';
            }
            return preg_match('/decline|feet elevated/', $name) === 1 ? 'Upper' : 'Mid';
        }
        if (preg_match('/incline|low cable|low-pulley/', $name) === 1) {
            return 'Upper';
        }
        return preg_match('/decline|\bdips?\b/', $name) === 1 ? 'Lower' : 'Mid';
    }
}
