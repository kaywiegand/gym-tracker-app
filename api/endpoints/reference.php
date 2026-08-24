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

function handleGetMuscleVolumeTargets(): void
{
    Auth::require();
    Http::respond((new MuscleRepository())->listVolumeTargets());
}

function handlePutMuscleVolumeTarget(string $region): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['mev'], $body['mav'], $body['mrv'])) {
        Http::error('mev, mav and mrv are required');
    }
    $repo = new MuscleRepository();
    if (!$repo->updateVolumeTarget($region, (int) $body['mev'], (int) $body['mav'], (int) $body['mrv'])) {
        Http::error('Unknown region', 404);
    }
    Http::respond($repo->listVolumeTargets());
}
