<?php
declare(strict_types=1);

final class MuscleRepository extends BaseRepository
{
    public function all(): array
    {
        return $this->fetchAll('SELECT id, name_en, region, sort FROM muscles ORDER BY sort');
    }

    // Weekly working-set volume landmarks per region (CLAUDE.md §8), keyed
    // by region for easy lookup while merging with computed volume data.
    public function volumeTargets(): array
    {
        $rows = $this->fetchAll('SELECT region, mev, mav, mrv FROM muscle_volume_targets');
        $byRegion = [];
        foreach ($rows as $row) {
            $byRegion[$row['region']] = ['mev' => (int) $row['mev'], 'mav' => (int) $row['mav'], 'mrv' => (int) $row['mrv']];
        }
        return $byRegion;
    }
}
