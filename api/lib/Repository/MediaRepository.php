<?php
declare(strict_types=1);

final class MediaRepository extends BaseRepository
{
    public function find(string $id): ?array
    {
        return $this->fetchOne('SELECT id, kind, path, mime FROM media WHERE id = ?', [$id]);
    }
}
