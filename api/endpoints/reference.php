<?php
declare(strict_types=1);

function handleGetTrainingModes(): void
{
    Auth::require();
    Http::respond((new TrainingModeRepository())->all());
}

function handlePutTrainingMode(string $key): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['rep_low'], $body['rep_high'])) {
        Http::error('rep_low and rep_high are required');
    }
    $repo = new TrainingModeRepository();
    if (!$repo->updateByKey($key, (int) $body['rep_low'], (int) $body['rep_high'])) {
        Http::error('Unknown training mode', 404);
    }
    Http::respond($repo->all());
}

function handleGetMuscles(): void
{
    Auth::require();
    Http::respond((new MuscleRepository())->all());
}
