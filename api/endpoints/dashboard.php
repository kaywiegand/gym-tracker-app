<?php
declare(strict_types=1);

function handleMuscleVolume(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    // The selected dashboard range (BACKLOG #82): window_current/
    // window_previous cover the last $days local days and the same length
    // before. Defaults to 7, i.e. the same data as last_7_days/prev_7_days.
    $days = isset($_GET['days']) ? max(1, min(1820, (int) $_GET['days'])) : 7;
    $tz = SessionRepository::timeZone((string) ($_GET['tz'] ?? 'UTC'));

    $setRepo = new SetRepository();
    // At least 14 days regardless of $weeks -- the rolling last_7_days/
    // prev_7_days windows need that much history even when only one week
    // was requested (BACKLOG #31). +2 days of slack for the local-day edge.
    $rows = $setRepo->rawSetsWithMuscles(max($weeks * 7 + 7, 14, 2 * $days + 2));
    $byRegion = MuscleVolume::weeklyByRegion($rows, $weeks, null, $days, $tz);
    $targets = (new MuscleRepository())->volumeTargets();

    $emptyMetrics = ['sets' => 0.0, 'volume_kg' => 0.0, 'best_e1rm' => 0.0];
    $weekStarts = MuscleVolume::lastWeekStarts(MuscleVolume::isoWeekStart(gmdate('Y-m-d\TH:i:s\Z')), $weeks);

    $regions = [];
    foreach ($targets as $region => $target) {
        $data = $byRegion[$region] ?? [
            'weeks' => array_fill_keys($weekStarts, $emptyMetrics),
            'this_week' => $emptyMetrics,
            'last_week' => $emptyMetrics,
            'last_7_days' => $emptyMetrics,
            'prev_7_days' => $emptyMetrics,
            'window_current' => $emptyMetrics,
            'window_previous' => $emptyMetrics,
        ];
        $weeklyList = [];
        foreach ($data['weeks'] as $weekStart => $metrics) {
            $weeklyList[] = array_merge(['week_start' => $weekStart], $metrics);
        }
        $regions[] = array_merge(
            ['region' => $region],
            $target,
            [
                'this_week' => $data['this_week'],
                'last_week' => $data['last_week'],
                'last_7_days' => $data['last_7_days'],
                'prev_7_days' => $data['prev_7_days'],
                'window_current' => $data['window_current'],
                'window_previous' => $data['window_previous'],
                'weeks' => $weeklyList,
            ]
        );
    }

    Http::respond(['regions' => $regions]);
}

function handleAcwr(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    // daily_series covers `days` days (default weeks * 7) ending today; the
    // 28 days before its start are loaded too so its first value is a real
    // 7d-vs-28d ratio (BACKLOG #83).
    $days = isset($_GET['days']) ? max(1, min(1820, (int) $_GET['days'])) : $weeks * 7;
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $rows = (new SetRepository())->dailyVolume(max($weeks * 7, $days) + 28);
    $daily = MuscleVolume::dailyTotals($rows);

    $result = MuscleVolume::acwr($daily, $now);
    $result['weekly_series'] = MuscleVolume::acwrWeeklySeries($daily, $weeks, $now);
    $result['daily_series'] = MuscleVolume::acwrDailySeries($daily, $days, $now);
    Http::respond($result);
}

function handleTrainingLoad(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    $now = gmdate('Y-m-d\TH:i:s\Z');
    $tz = SessionRepository::timeZone((string) ($_GET['tz'] ?? 'UTC'));
    // "Now" as the client's wall clock, so the current week starts on the
    // client's Monday for the session counts (UTC "now" only for volume).
    $localNow = (new DateTimeImmutable('now', $tz))->format('Y-m-d\TH:i:s\Z');

    $rows = (new SetRepository())->dailyVolume($weeks * 7 + 7);
    $daily = MuscleVolume::dailyTotals($rows);

    Http::respond([
        'weekly_volume' => MuscleVolume::weeksFromDaily($daily, $weeks, $now),
        'weekly_sessions' => weeklySessionCounts((new SessionRepository())->recentDates($weeks * 7 + 7, $tz->getName()), $weeks, $localNow),
    ]);
}

// One entry per finished session in the last `days` days (local start day in
// `tz`) with its total working-set volume -- the per-session line behind the
// "Volume/session" KPI (BACKLOG #82).
function handleSessionVolumes(): void
{
    Auth::require();
    $days = isset($_GET['days']) ? max(1, min(1820, (int) $_GET['days'])) : 28;
    $tz = (string) ($_GET['tz'] ?? 'UTC');
    Http::respond(['sessions' => (new SessionRepository())->sessionVolumes($days, $tz)]);
}

function weeklySessionCounts(array $dates, int $weeks, string $nowIso): array
{
    $counts = [];
    foreach ($dates as $date) {
        $counts[$date] = 1.0;
    }
    return array_map(
        fn (array $week) => ['week_start' => $week['week_start'], 'count' => (int) $week['volume_kg']],
        MuscleVolume::weeksFromDaily($counts, $weeks, $nowIso)
    );
}

function handleConsistency(): void
{
    Auth::require();
    // 1820 = 260 weeks, the longest range ("All") the dashboard asks for.
    $days = isset($_GET['days']) ? max(7, min(1820, (int) $_GET['days'])) : 126;
    $tz = (string) ($_GET['tz'] ?? 'UTC');
    Http::respond(['dates' => (new SessionRepository())->recentDates($days, $tz)]);
}

// Most-used exercises over the selected window -- the "what do I actually
// train" list every other tracker puts on its analytics tab.
function handleTopExercises(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 10;
    Http::respond((new SetRepository())->topExercises($weeks * 7, $limit));
}
