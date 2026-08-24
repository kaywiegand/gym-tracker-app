<?php
declare(strict_types=1);

// Manual full backup/restore of all user-generated data (Stage-5 plan
// §4.3), motivated by CLAUDE.md §2 ("Datenhoheit ... kein Lock-in") --
// distinct from Stage 6's future presentation-oriented Export/PDF.
function handleBackupExport(): void
{
    Auth::require();
    $tables = (new BackupRepository())->exportAll();
    $payload = [
        'exported_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'app' => 'gym-tracker',
        'version' => 1,
        'tables' => $tables,
    ];

    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="gym-tracker-backup-' . gmdate('Y-m-d') . '.json"');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function handleBackupImport(): void
{
    Auth::require();
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        Http::error('No file uploaded');
    }

    $raw = file_get_contents($_FILES['file']['tmp_name']);
    $data = $raw === false ? null : json_decode($raw, true);
    if (!is_array($data) || !isset($data['tables']) || !is_array($data['tables'])) {
        Http::error('Not a valid gym-tracker backup file');
    }

    $summary = (new BackupRepository())->importAll($data['tables']);
    Http::respond(['tables' => $summary]);
}
