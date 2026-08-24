<?php
declare(strict_types=1);

// BIA (body composition) import (Stage-5 plan §4.1): the user photographs
// a scan printout, uses an external AI to fill in the downloadable CSV
// template, then uploads it here -- a genuine mobile-friendly workflow,
// not a fixed server-side file path.
function handleBiaTemplate(): void
{
    Auth::require();
    $csv = BiaImport::template();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="bia-template.csv"');
    echo $csv;
    exit;
}

function handleBiaImport(): void
{
    Auth::require();
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        Http::error('No file uploaded');
    }

    $csv = file_get_contents($_FILES['file']['tmp_name']);
    if ($csv === false) {
        Http::error('Could not read uploaded file');
    }

    $parsed = BiaImport::parse($csv);
    $repo = new BiaRepository();
    $existingKeys = $repo->existingKeys();

    $imported = 0;
    $skipped = 0;
    foreach ($parsed['dates'] as $date) {
        $externalId = $parsed['externalId'][$date] ?? null;
        $measuredAt = $parsed['measuredAt'][$date];
        $key = ($externalId ?? '') . '|' . $measuredAt;
        if (isset($existingKeys[$key])) {
            $skipped++;
            continue;
        }

        $entries = array_values(array_filter($parsed['entries'], fn ($e) => $e['date'] === $date));
        $measurement = $repo->createMeasurement($measuredAt, $externalId, 'csv_import');
        $repo->insertValues($measurement['id'], $entries);
        $existingKeys[$key] = true;
        $imported++;
    }

    Http::respond(['imported' => $imported, 'skipped' => $skipped]);
}

function handleListBiaMeasurements(): void
{
    Auth::require();
    $limit = isset($_GET['limit']) ? max(1, min(200, (int) $_GET['limit'])) : 50;
    Http::respond((new BiaRepository())->list($limit));
}

function handleGetBiaMeasurement(string $id): void
{
    Auth::require();
    $repo = new BiaRepository();
    $measurement = $repo->find($id);
    if ($measurement === null) {
        Http::error('Measurement not found', 404);
    }
    Http::respond(['measurement' => $measurement, 'values' => $repo->valuesFor($id)]);
}

function handleDeleteBiaMeasurement(string $id): void
{
    Auth::require();
    if (!(new BiaRepository())->softDelete($id)) {
        Http::error('Measurement not found', 404);
    }
    Http::respond(['ok' => true]);
}

function handleLatestBia(): void
{
    Auth::require();
    Http::respond((new BiaRepository())->latest());
}
