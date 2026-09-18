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

// --- workout groups -----------------------------------------------------
function handleListWorkoutGroups(): void
{
    Auth::require();
    Http::respond((new WorkoutGroupRepository())->list());
}

function handleCreateWorkoutGroup(): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['name']) || trim((string) $body['name']) === '') {
        Http::error('name is required');
    }
    Http::respond((new WorkoutGroupRepository())->create($body), 201);
}

function handleUpdateWorkoutGroup(string $id): void
{
    Auth::require();
    $group = (new WorkoutGroupRepository())->update($id, Http::jsonBody());
    if ($group === null) {
        Http::error('Group not found', 404);
    }
    Http::respond($group);
}

function handleDeleteWorkoutGroup(string $id): void
{
    Auth::require();
    if (!(new WorkoutGroupRepository())->softDelete($id)) {
        Http::error('Group not found', 404);
    }
    Http::respond(['deleted' => true]);
}

// Recently trained workouts, each with its exercises inline in the pickers'
// list shape -- one request for the "browse by workout" path instead of one
// per tapped workout.
function handleRecentWorkouts(): void
{
    Auth::require();
    $days = isset($_GET['days']) ? max(1, min(365, (int) $_GET['days'])) : 90;
    $exRepo = new ExerciseRepository();
    Http::respond(array_map(static function (array $w) use ($exRepo): array {
        $w['exercise_count'] = (int) $w['exercise_count'];
        $w['exercises'] = $exRepo->listForWorkout($w['id']);
        return $w;
    }, (new WorkoutRepository())->recentlyUsed($days)));
}
