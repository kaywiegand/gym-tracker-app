<?php
declare(strict_types=1);

function handleLogin(): void
{
    $body = Http::jsonBody();
    if (!isset($body['password']) || !Auth::login((string) $body['password'])) {
        Http::error('Invalid password', 401);
    }
    Http::respond(['authenticated' => true]);
}

function handleLogout(): void
{
    Auth::logout();
    Http::respond(['authenticated' => false]);
}

function handleAuthStatus(): void
{
    Http::respond(['authenticated' => Auth::isLoggedIn()]);
}

function handleChangePassword(): void
{
    Auth::require();
    $body = Http::jsonBody();
    if (!isset($body['current_password'], $body['new_password']) || $body['new_password'] === '') {
        Http::error('current_password and new_password are required');
    }
    if (!Auth::changePassword((string) $body['current_password'], (string) $body['new_password'])) {
        Http::error('Current password is incorrect', 401);
    }
    Http::respond(['ok' => true]);
}
