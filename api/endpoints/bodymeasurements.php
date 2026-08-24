<?php
declare(strict_types=1);

function handleGetBodyMeasurements(): void
{
    Auth::require();
    $site = isset($_GET['site']) ? (string) $_GET['site'] : null;
    $limit = isset($_GET['limit']) ? max(1, min(200, (int) $_GET['limit'])) : 30;
    Http::respond((new BodyMeasurementRepository())->recent($site, $limit));
}
