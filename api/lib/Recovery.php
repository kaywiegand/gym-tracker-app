<?php
declare(strict_types=1);

// Recovery indicator (BACKLOG #129): do several exercises fall below their
// own recent level at the same time? One exercise stalling is a plateau and
// has its own hint; a drop across many is the fatigue signal.
//
// Deliberately a tendency, not a measurement -- it only sees training
// performance, never sleep, stress or soreness. Pure and DB-free like
// MuscleVolume, so the rule is testable on its own.
final class Recovery
{
    // An exercise needs this many sessions: the latest one plus a baseline.
    public const MIN_SESSIONS = 4;
    private const BASELINE_SESSIONS = 3;
    // Only exercises still in the programme count.
    public const ACTIVE_DAYS = 21;
    // Below this many rated exercises the share is too coarse to mean much.
    public const MIN_EXERCISES = 5;

    public const DEFAULT_DROP_PCT = 2.5;
    public const DEFAULT_WATCH_SHARE_PCT = 35.0;
    public const DEFAULT_DELOAD_SHARE_PCT = 50.0;

    // $rows: one per exercise and session, any order --
    //   exercise_id, started_at (ISO-8601), best_e1rm, plus whatever display
    //   fields the caller wants passed through on the exercise entries.
    // An exercise is "falling" when its latest e1RM is more than $dropPct
    // below the median of the three sessions before it.
    public static function assess(
        array $rows,
        string $nowIso,
        float $dropPct = self::DEFAULT_DROP_PCT,
        float $watchSharePct = self::DEFAULT_WATCH_SHARE_PCT,
        float $deloadSharePct = self::DEFAULT_DELOAD_SHARE_PCT
    ): array {
        $byExercise = [];
        foreach ($rows as $row) {
            $byExercise[$row['exercise_id']][] = $row;
        }
        $activeSince = gmdate('Y-m-d\TH:i:s\Z', strtotime($nowIso) - self::ACTIVE_DAYS * 86400);

        $exercises = [];
        foreach ($byExercise as $sessions) {
            usort($sessions, static fn ($a, $b) => strcmp($a['started_at'], $b['started_at']));
            $latest = $sessions[count($sessions) - 1];
            if (count($sessions) < self::MIN_SESSIONS || $latest['started_at'] < $activeSince) {
                continue;
            }
            $baseline = self::median(array_map(
                static fn ($s) => (float) $s['best_e1rm'],
                array_slice($sessions, -(self::BASELINE_SESSIONS + 1), self::BASELINE_SESSIONS)
            ));
            if ($baseline <= 0) {
                continue;
            }
            $changePct = ((float) $latest['best_e1rm'] / $baseline - 1) * 100;
            $entry = $latest;
            unset($entry['best_e1rm'], $entry['started_at']);
            $entry['last_session_at'] = $latest['started_at'];
            $entry['change_pct'] = round($changePct, 1);
            $entry['trend'] = $changePct < -$dropPct ? 'falling' : ($changePct > $dropPct ? 'rising' : 'steady');
            $exercises[] = $entry;
        }
        usort($exercises, static fn ($a, $b) => $a['change_pct'] <=> $b['change_pct']);

        $total = count($exercises);
        $falling = count(array_filter($exercises, static fn ($e) => $e['trend'] === 'falling'));
        $rising = count(array_filter($exercises, static fn ($e) => $e['trend'] === 'rising'));
        $sharePct = $total > 0 ? $falling / $total * 100 : 0.0;

        if ($total < self::MIN_EXERCISES) {
            $status = 'unknown';
        } elseif ($sharePct > $deloadSharePct) {
            $status = 'deload';
        } elseif ($sharePct >= $watchSharePct) {
            $status = 'watch';
        } else {
            $status = 'on_track';
        }

        return [
            'status' => $status,
            'total' => $total,
            'falling' => $falling,
            'rising' => $rising,
            'falling_share_pct' => round($sharePct, 1),
            'drop_pct' => $dropPct,
            'watch_share_pct' => $watchSharePct,
            'deload_share_pct' => $deloadSharePct,
            'exercises' => $exercises,
        ];
    }

    private static function median(array $values): float
    {
        if ($values === []) {
            return 0.0;
        }
        sort($values);
        $mid = intdiv(count($values), 2);
        return count($values) % 2 === 1 ? $values[$mid] : ($values[$mid - 1] + $values[$mid]) / 2;
    }
}
