<?php
declare(strict_types=1);

// Push-only sync per CLAUDE.md §4: client pushes queued rows (sessions,
// sets, bodyweight), each upserted by client-generated id with
// last-write-wins on updated_at. Parents before children (sessions before
// their sets) -- harmless here since there are no FK constraints, but kept
// for correctness per the brief.
function handleSyncPush(): void
{
    Auth::require();
    $body = Http::jsonBody();

    $sessionRepo = new SessionRepository();
    foreach (($body['sessions'] ?? []) as $row) {
        if (isset($row['id'])) {
            $sessionRepo->upsert($row);
        }
    }

    $setRepo = new SetRepository();
    foreach (($body['sets'] ?? []) as $row) {
        if (isset($row['id'])) {
            $setRepo->upsert($row);
        }
    }

    $bodyweightRepo = new BodyweightRepository();
    foreach (($body['bodyweight'] ?? []) as $row) {
        if (isset($row['id'])) {
            $bodyweightRepo->upsert($row);
        }
    }

    $bodyMeasurementRepo = new BodyMeasurementRepository();
    foreach (($body['body_measurements'] ?? []) as $row) {
        if (isset($row['id'])) {
            $bodyMeasurementRepo->upsert($row);
        }
    }

    Http::respond(['ok' => true]);
}
