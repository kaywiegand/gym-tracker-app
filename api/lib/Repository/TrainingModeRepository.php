<?php
declare(strict_types=1);

final class TrainingModeRepository extends BaseRepository
{
    public function all(): array
    {
        return $this->fetchAll('SELECT id, key, name, rep_low, rep_high, sort FROM training_modes ORDER BY sort');
    }

    public function updateByKey(string $key, int $repLow, int $repHigh): bool
    {
        $stmt = $this->db->prepare('UPDATE training_modes SET rep_low = ?, rep_high = ? WHERE key = ?');
        $stmt->execute([$repLow, $repHigh, $key]);
        return $stmt->rowCount() > 0;
    }
}
