<?php
declare(strict_types=1);

// Weekly set landmarks per MUSCLE, and the region targets derived from them
// (BACKLOG #46). Why these numbers, the per-muscle source table and the known
// caveats: docs/volume-landmarks.md -- change the two together.
//
// Each value is the UPPER bound of Renaissance Periodization's range for an
// intermediate lifter training the whole body (not the "*P" columns, which
// apply when one muscle is prioritised). That maps straight onto the app's
// ampel: below mev = not enough yet, up to mav = optimal, up to mrv = near
// the limit, above mrv = over.
final class VolumeLandmarks
{
    // FEDB muscle name => [mev, mav, mrv]. 0/0/0 = no source; the muscle adds
    // nothing to its region's target (see docs for each case).
    public const PER_MUSCLE = [
        'Chest' => [6, 16, 24],
        'Shoulders' => [8, 24, 30],   // RP side delts -- front delts get their volume from pressing
        'Biceps' => [10, 20, 26],
        'Triceps' => [6, 16, 20],
        'Forearms' => [8, 24, 30],
        'Lats' => [10, 22, 25],       // RP treats "back" as one group -- lats and mid back share this figure
        'Middle Back' => [0, 0, 0],
        'Traps' => [4, 12, 20],
        'Lower Back' => [0, 0, 0],
        'Quadriceps' => [6, 14, 18],
        'Hamstrings' => [4, 8, 14],
        'Glutes' => [8, 24, 30],
        'Calves' => [6, 16, 24],
        'Abductors' => [0, 0, 0],
        'Adductors' => [0, 0, 0],
        'Abdominals' => [4, 12, 20],
        'Neck' => [0, 0, 0],
    ];

    // A region's weekly total is the sum of its muscles' (weighted) sets, so
    // its targets are the sum of its muscles' landmarks. Taking one muscle's
    // figures for a whole region -- what the app did before -- had "Legs"
    // at MAV 16 while quads, hamstrings, glutes and calves each want their own.
    //
    // $muscles: rows with name_en and region (the muscles table).
    public static function regionTargets(array $muscles): array
    {
        $targets = [];
        foreach ($muscles as $muscle) {
            [$mev, $mav, $mrv] = self::PER_MUSCLE[$muscle['name_en']] ?? [0, 0, 0];
            $region = $muscle['region'];
            $targets[$region] ??= ['mev' => 0, 'mav' => 0, 'mrv' => 0];
            $targets[$region]['mev'] += $mev;
            $targets[$region]['mav'] += $mav;
            $targets[$region]['mrv'] += $mrv;
        }
        return $targets;
    }
}
