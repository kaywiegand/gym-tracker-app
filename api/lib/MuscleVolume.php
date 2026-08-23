<?php
declare(strict_types=1);

// Pure aggregation engine for the muscle-volume dashboard (CLAUDE.md §8/§10,
// Stage 4). No DB access here -- repositories fetch raw joined rows,
// everything else (week bucketing, secondary-muscle weighting, ACWR) lives
// here so it's directly unit-testable (CLAUDE.md §12 calls out "Volumen"
// explicitly as engine logic to test).
final class MuscleVolume
{
    // Monday (UTC) of the ISO week containing $iso8601, as Y-m-d.
    public static function isoWeekStart(string $iso8601): string
    {
        $dt = new DateTimeImmutable($iso8601, new DateTimeZone('UTC'));
        $dayOfWeek = (int) $dt->format('N'); // 1 (Mon) .. 7 (Sun)
        return $dt->modify('-' . ($dayOfWeek - 1) . ' days')->format('Y-m-d');
    }

    // $rows: [{performed_at, weight_kg, reps, muscle_weight, region}, ...]
    // -- one row per exercise_muscles mapping a logged set touches (a set
    // with one secondary muscle produces two rows, weighted 1.0/0.5, see
    // SetRepository::rawSetsWithMuscles()). Returns, per region that has at
    // least one row:
    //   ['weeks' => [weekStart => ['sets','volume_kg','best_e1rm']], 'this_week' => [...], 'last_week' => [...]]
    // for exactly $weeks week-buckets ending at the current week. Sets and
    // volume are weighted by muscle_weight (secondary ×0.5); best_e1rm is a
    // peak, never weighted or summed (adding e1RM across exercises is
    // meaningless -- CLAUDE.md §8).
    public static function weeklyByRegion(array $rows, int $weeks, ?string $nowIso = null): array
    {
        $currentWeekStart = self::isoWeekStart($nowIso ?? gmdate('Y-m-d\TH:i:s\Z'));
        $weekStarts = self::lastWeekStarts($currentWeekStart, $weeks);
        $earliestWeekStart = $weekStarts[0];
        $emptyWeek = ['sets' => 0.0, 'volume_kg' => 0.0, 'best_e1rm' => 0.0];

        $byRegion = [];
        foreach ($rows as $row) {
            $weekStart = self::isoWeekStart($row['performed_at']);
            if ($weekStart < $earliestWeekStart) {
                continue;
            }
            $region = $row['region'];
            $weight = (float) $row['weight_kg'];
            $reps = (float) $row['reps'];
            $muscleWeight = (float) $row['muscle_weight'];
            $e1rm = $weight * (1 + $reps / 30);

            $byRegion[$region] ??= array_fill_keys($weekStarts, $emptyWeek);
            $byRegion[$region][$weekStart]['sets'] += $muscleWeight;
            $byRegion[$region][$weekStart]['volume_kg'] += $weight * $reps * $muscleWeight;
            $byRegion[$region][$weekStart]['best_e1rm'] = max($byRegion[$region][$weekStart]['best_e1rm'], $e1rm);
        }

        $lastWeekStart = $weekStarts[count($weekStarts) - 2] ?? $currentWeekStart;

        $result = [];
        foreach ($byRegion as $region => $weeksData) {
            $result[$region] = [
                'weeks' => $weeksData,
                'this_week' => $weeksData[$currentWeekStart],
                'last_week' => $weeksData[$lastWeekStart] ?? $emptyWeek,
            ];
        }
        return $result;
    }

    // Oldest-first list of $count Monday-dates ending at $currentWeekStart.
    // Public so callers (e.g. the dashboard endpoint) can zero-fill a region
    // that has no logged sets at all within the window.
    public static function lastWeekStarts(string $currentWeekStart, int $count): array
    {
        $dt = new DateTimeImmutable($currentWeekStart, new DateTimeZone('UTC'));
        $starts = [];
        for ($i = $count - 1; $i >= 0; $i--) {
            $starts[] = $dt->modify("-{$i} weeks")->format('Y-m-d');
        }
        return $starts;
    }

    // $rows: [{performed_at, weight_kg, reps}, ...] -- no muscle join, ACWR
    // is whole-body training load, not per muscle (CLAUDE.md §8). Returns
    // [date => volume_kg] for every calendar day a set occurred.
    public static function dailyTotals(array $rows): array
    {
        $byDay = [];
        foreach ($rows as $row) {
            $day = (new DateTimeImmutable($row['performed_at'], new DateTimeZone('UTC')))->format('Y-m-d');
            $byDay[$day] = ($byDay[$day] ?? 0.0) + (float) $row['weight_kg'] * (float) $row['reps'];
        }
        return $byDay;
    }

    // Acute:Chronic Workload Ratio -- last 7 days total vs. last 28 days
    // total/4 (standard ACWR formulation; CLAUDE.md §8: green 0.8-1.3).
    public static function acwr(array $dailyTotals, string $todayIso): array
    {
        $today = new DateTimeImmutable($todayIso, new DateTimeZone('UTC'));
        $acute = 0.0;
        $chronic = 0.0;
        for ($i = 0; $i < 28; $i++) {
            $day = $today->modify("-{$i} days")->format('Y-m-d');
            $value = $dailyTotals[$day] ?? 0.0;
            $chronic += $value;
            if ($i < 7) {
                $acute += $value;
            }
        }
        $chronicWeekly = $chronic / 4;
        $ratio = $chronicWeekly > 0 ? $acute / $chronicWeekly : 0.0;

        return ['acute_kg' => $acute, 'chronic_kg' => $chronicWeekly, 'ratio' => $ratio];
    }
}
