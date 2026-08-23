<?php
declare(strict_types=1);

function handleMuscleVolume(): void
{
    Auth::require();
    $weeks = isset($_GET['weeks']) ? max(1, min(52, (int) $_GET['weeks'])) : 8;

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
    $rows = (new SetRepository())->dailyVolume(35);
    $daily = MuscleVolume::dailyTotals($rows);
    Http::respond(MuscleVolume::acwr($daily, gmdate('Y-m-d\TH:i:s\Z')));
}
