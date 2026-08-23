<?php
declare(strict_types=1);

function handleMuscleVolume(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;

    $setRepo = new SetRepository();
    $rows = $setRepo->rawSetsWithMuscles($weeks * 7 + 7);
    $byRegion = MuscleVolume::weeklyByRegion($rows, $weeks);
    $targets = (new MuscleRepository())->volumeTargets();

    $emptyMetrics = ['sets' => 0.0, 'volume_kg' => 0.0, 'best_e1rm' => 0.0];
    $weekStarts = MuscleVolume::lastWeekStarts(MuscleVolume::isoWeekStart(gmdate('Y-m-d\TH:i:s\Z')), $weeks);

    $regions = [];
    foreach ($targets as $region => $target) {
        $data = $byRegion[$region] ?? [
            'weeks' => array_fill_keys($weekStarts, $emptyMetrics),
            'this_week' => $emptyMetrics,
            'last_week' => $emptyMetrics,
        ];
        $weeklyList = [];
        foreach ($data['weeks'] as $weekStart => $metrics) {
            $weeklyList[] = array_merge(['week_start' => $weekStart], $metrics);
        }
        $regions[] = array_merge(
            ['region' => $region],
            $target,
            ['this_week' => $data['this_week'], 'last_week' => $data['last_week'], 'weeks' => $weeklyList]
        );
    }

    Http::respond(['regions' => $regions]);
}

function handleAcwr(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $rows = (new SetRepository())->dailyVolume($weeks * 7 + 28);
    $daily = MuscleVolume::dailyTotals($rows);

    $result = MuscleVolume::acwr($daily, $now);
    $result['weekly_series'] = MuscleVolume::acwrWeeklySeries($daily, $weeks, $now);
    Http::respond($result);
}

function handleTrainingLoad(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) : 8;
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $rows = (new SetRepository())->dailyVolume($weeks * 7 + 7);
    $daily = MuscleVolume::dailyTotals($rows);

    Http::respond([
        'weekly_volume' => MuscleVolume::weeksFromDaily($daily, $weeks, $now),
        'weekly_sessions' => weeklySessionCounts((new SessionRepository())->recentDates($weeks * 7 + 7), $weeks, $now),
    ]);
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
    $days = isset($_GET['days']) ? max(7, min(365, (int) $_GET['days'])) : 126;
    Http::respond(['dates' => (new SessionRepository())->recentDates($days)]);
}
