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

    // List form of volumeTargets() for the Settings editor (BACKLOG #9) --
    // one row per region, ordered like everywhere else region lists appear.
    public function listVolumeTargets(): array
    {
        return $this->fetchAll(
            "SELECT mvt.region, mvt.mev, mvt.mav, mvt.mrv
             FROM muscle_volume_targets mvt
             JOIN (SELECT DISTINCT region, MIN(sort) AS sort FROM muscles GROUP BY region) mu ON mu.region = mvt.region
             ORDER BY mu.sort"
        );
    }

    public function updateVolumeTarget(string $region, int $mev, int $mav, int $mrv): bool
    {
        $stmt = $this->db->prepare('UPDATE muscle_volume_targets SET mev = ?, mav = ?, mrv = ? WHERE region = ?');
        $stmt->execute([$mev, $mav, $mrv, $region]);
        return $stmt->rowCount() > 0;
    }
}
