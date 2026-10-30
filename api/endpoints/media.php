<?php
declare(strict_types=1);

// The only way to a stored file: the upload directory is outside the docroot.
// Rows pointing at a URL (exercise photos on GitHub) load directly in the
// browser and never come through here.
function handleGetMedia(string $id): void
{
    Auth::require();
    $media = (new MediaRepository())->find($id);
    if ($media === null) {
        Http::error('Media not found', 404);
    }
    try {
        if (!Uploads::exists((string) $media['path'])) {
            Http::error('Media not found', 404);
        }
    } catch (InvalidArgumentException $e) {
        Http::error('Media not found', 404);
    }
    Uploads::send((string) $media['path'], (string) $media['mime']);
}

function handleUploadsStatus(): void
{
    Auth::require();
    Http::respond(Uploads::status());
}
