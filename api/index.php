<?php
declare(strict_types=1);

// Front controller / mini router. Works both behind Apache (api/.htaccess
// rewrites everything to this file) and the PHP built-in server (started
// with this file as the router script) -- see README for the exact commands.

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Auth.php';
foreach (glob(__DIR__ . '/endpoints/*.php') as $file) {
    require_once $file;
}

Auth::start();

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
$path = $requestUri;
if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir));
}
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];
$segments = array_values(array_filter(explode('/', $path), fn ($s) => $s !== ''));

try {
    if ($method === 'POST' && $path === '/auth/login') {
        handleLogin();
    } elseif ($method === 'POST' && $path === '/auth/logout') {
        handleLogout();
    } elseif ($method === 'GET' && $path === '/auth/status') {
        handleAuthStatus();
    } elseif ($method === 'POST' && $path === '/auth/change-password') {
        handleChangePassword();
    } elseif ($method === 'GET' && $path === '/settings') {
        handleGetSettings();
    } elseif ($method === 'PUT' && $path === '/settings') {
        handlePutSettings();
    } elseif ($method === 'GET' && $path === '/training-modes') {
        handleGetTrainingModes();
    } elseif ($method === 'PUT' && count($segments) === 2 && $segments[0] === 'training-modes') {
        handlePutTrainingMode($segments[1]);
    } elseif ($method === 'GET' && $path === '/muscles') {
        handleGetMuscles();
    } elseif ($method === 'GET' && $path === '/exercises') {
        handleListExercises();
    } elseif ($method === 'POST' && $path === '/exercises') {
        handleCreateExercise();
    } elseif ($method === 'GET' && count($segments) === 3 && $segments[0] === 'exercises' && $segments[2] === 'last-sets') {
        handleLastSetsForExercise($segments[1]);
    } elseif ($method === 'GET' && count($segments) === 3 && $segments[0] === 'exercises' && $segments[2] === 'history') {
        handleExerciseHistory($segments[1]);
    } elseif ($method === 'GET' && count($segments) === 2 && $segments[0] === 'exercises') {
        handleGetExercise($segments[1]);
    } elseif ($method === 'PUT' && count($segments) === 2 && $segments[0] === 'exercises') {
        handleUpdateExercise($segments[1]);
    } elseif ($method === 'POST' && $path === '/sync/push') {
        handleSyncPush();
    } elseif ($method === 'GET' && $path === '/bodyweight') {
        handleGetBodyweight();
    } elseif ($method === 'GET' && $path === '/workouts') {
        handleListWorkouts();
    } elseif ($method === 'POST' && $path === '/workouts') {
        handleCreateWorkout();
    } elseif ($method === 'GET' && count($segments) === 3 && $segments[0] === 'workouts' && $segments[2] === 'last-session-volume') {
        handleLastSessionVolume($segments[1]);
    } elseif ($method === 'GET' && count($segments) === 2 && $segments[0] === 'workouts') {
        handleGetWorkout($segments[1]);
    } elseif ($method === 'PUT' && count($segments) === 2 && $segments[0] === 'workouts') {
        handleUpdateWorkout($segments[1]);
    } elseif ($method === 'DELETE' && count($segments) === 2 && $segments[0] === 'workouts') {
        handleDeleteWorkout($segments[1]);
    } elseif ($method === 'GET' && $path === '/dashboard/muscle-volume') {
        handleMuscleVolume();
    } elseif ($method === 'GET' && $path === '/dashboard/acwr') {
        handleAcwr();
    } else {
        Http::error('Not found', 404);
    }
} catch (Throwable $e) {
    error_log($e->getMessage());
    Http::error('Server error', 500);
}
