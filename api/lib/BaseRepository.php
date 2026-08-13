<?php
declare(strict_types=1);

abstract class BaseRepository
{
    protected PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Db::connection();
    }

    protected function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    protected function execute(string $sql, array $params = []): void
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    protected static function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
