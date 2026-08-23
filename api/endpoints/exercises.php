<?php
declare(strict_types=1);

function handleListExercises(): void
{
    Auth::require();
    $repo = new ExerciseRepository();
    Http::respond($repo->list(
        isset($_GET['q']) ? (string) $_GET['q'] : null,
        isset($_GET['region']) ? (string) $_GET['region'] : null,
        isset($_GET['mechanic']) ? (string) $_GET['mechanic'] : null,
    ));
}

function handleGetExercise(string $id): void
{
    Auth::require();
    $exercise = (new ExerciseRepository())->find($id);
    if ($exercise === null) {
        Http::error('Exercise not found', 404);
    }
    Http::respond($exercise);
}

function handleCreateExercise(): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['name']) || trim((string) $body['name']) === '') {
        Http::error('name is required');
    }
    Http::respond((new ExerciseRepository())->create($body), 201);
}

function handleUpdateExercise(string $id): void
{
    Auth::require();
    $exercise = (new ExerciseRepository())->update($id, Http::jsonBody());
    if ($exercise === null) {
        Http::error('Exercise not found', 404);
    }
    Http::respond($exercise);
}

function handleLastSetsForExercise(string $id): void
{
    Auth::require();
    Http::respond((new SetRepository())->lastSetsForExercise($id));
}

function handleExerciseHistory(string $id): void
{
    Auth::require();
    $limit = isset($_GET['limit']) ? max(1, min(200, (int) $_GET['limit'])) : 20;
    $sinceDays = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) * 7 : null;
    Http::respond((new SetRepository())->historyForExercise($id, $limit, $sinceDays));
}

function handleExerciseSessionSummaries(string $id): void
{
    Auth::require();
    $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 6;
    $sinceDays = isset($_GET['weeks']) ? max(1, min(260, (int) $_GET['weeks'])) * 7 : null;
    Http::respond((new SetRepository())->sessionSummariesForExercise($id, $limit, $sinceDays));
}
