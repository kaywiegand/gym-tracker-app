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

    // Shared upsert-by-id with last-write-wins on updated_at (CLAUDE.md §4:
    // client-generated UUID, server upsert per id, conflict = newer
    // updated_at wins). ISO-8601 UTC strings compare correctly with <=.
    // $columns must include 'updated_at' and match $id.
    protected function upsertRow(string $table, array $columns, string $id): void
    {
        $existing = $this->fetchOne("SELECT updated_at FROM {$table} WHERE id = ?", [$id]);
        if ($existing !== null && $columns['updated_at'] <= $existing['updated_at']) {
            return;
        }

        $cols = array_keys($columns);
        if ($existing === null) {
            $placeholders = implode(', ', array_fill(0, count($cols), '?'));
            $colList = implode(', ', $cols);
            $this->execute("INSERT INTO {$table} ({$colList}) VALUES ({$placeholders})", array_values($columns));
            return;
        }

        $updateCols = array_values(array_filter($cols, fn ($c) => $c !== 'id'));
        $assignments = implode(', ', array_map(fn ($c) => "{$c} = ?", $updateCols));
        $params = array_map(fn ($c) => $columns[$c], $updateCols);
        $params[] = $id;
        $this->execute("UPDATE {$table} SET {$assignments} WHERE id = ?", $params);
    }
}
