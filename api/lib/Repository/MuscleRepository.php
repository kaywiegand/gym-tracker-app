<?php
declare(strict_types=1);

final class MuscleRepository extends BaseRepository
{
    public function all(): array
    {
        return $this->fetchAll('SELECT id, name_en, region, sort FROM muscles ORDER BY sort');
    }
}
