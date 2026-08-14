<?php
declare(strict_types=1);

function handleGetSettings(): void
{
    Auth::require();
    Http::respond((new SettingsRepository())->getAll());
}

function handlePutSettings(): void
{
    Auth::require();
    $repo = new SettingsRepository();
    $repo->setMany(Http::jsonBody());
    Http::respond($repo->getAll());
}
