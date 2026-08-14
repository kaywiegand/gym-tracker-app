<?php
declare(strict_types=1);

function handleGetBodyweight(): void
{
    Auth::require();
    $limit = isset($_GET['limit']) ? max(1, min(200, (int) $_GET['limit'])) : 30;
    Http::respond((new BodyweightRepository())->recent($limit));
}
