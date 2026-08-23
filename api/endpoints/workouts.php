<?php
declare(strict_types=1);

function handleListWorkouts(): void
{
    Auth::require();
    Http::respond((new WorkoutRepository())->list());
}

function handleGetWorkout(string $id): void
{
    Auth::require();
    $workout = (new WorkoutRepository())->find($id);
    if ($workout === null) {
        Http::error('Workout not found', 404);
    }
    Http::respond($workout);
}

function handleCreateWorkout(): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['name']) || trim((string) $body['name']) === '' || !isset($body['mode_id'])) {
        Http::error('name and mode_id are required');
    }
    Http::respond((new WorkoutRepository())->create($body), 201);
}

function handleUpdateWorkout(string $id): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['name']) || trim((string) $body['name']) === '' || !isset($body['mode_id'])) {
        Http::error('name and mode_id are required');
    }
    $workout = (new WorkoutRepository())->update($id, $body);
    if ($workout === null) {
        Http::error('Workout not found', 404);
    }
    Http::respond($workout);
}

function handleDeleteWorkout(string $id): void
{
    Auth::require();
    if (!(new WorkoutRepository())->softDelete($id)) {
        Http::error('Workout not found', 404);
    }
    Http::respond(['ok' => true]);
}

function handleLastSessionVolume(string $workoutId): void
{
    Auth::require();
    $exclude = isset($_GET['exclude_session']) ? (string) $_GET['exclude_session'] : null;
    $result = (new SetRepository())->lastSessionVolume($workoutId, $exclude);
    Http::respond($result ?? ['session_id' => null, 'started_at' => null, 'volume_kg' => null, 'sets_count' => 0]);
}

function handleWorkoutMuscleSplit(string $workoutId): void
{
    Auth::require();
    $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 6;
    $sinceDays = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) * 7 : null;
    Http::respond(['sessions' => (new SetRepository())->muscleSplitForWorkout($workoutId, $limit, $sinceDays)]);
}
