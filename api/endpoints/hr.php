<?php
declare(strict_types=1);

// HR import from an Apple Health export.xml (Stage-5 plan §4.2): uploaded
// via Settings like the BIA CSV. The export can be 100+ MB -- PHP's
// upload_max_filesize/post_max_size (php.ini or .user.ini on shared
// hosting, e.g. 200M) must be raised for that on the server; that's a
// hosting config step this endpoint can't bypass at runtime, so a clean
// error is returned instead of crashing if the upload didn't arrive whole.
function handleHrImport(): void
{
    Auth::require();
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $code = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) {
            Http::error('File too large for this server\'s upload limit (see README: raise upload_max_filesize / post_max_size).');
        }
        Http::error('No file uploaded');
    }

    $targetPath = __DIR__ . '/../../uploads/apple-health-export.xml';
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
        Http::error('Could not store uploaded file');
    }

    $sessionWindows = (new SessionRepository())->allTimeWindows();

    try {
        $matched = HrImport::matchFromAppleHealthXml($targetPath, $sessionWindows);
    } catch (Throwable $e) {
        Http::error('Could not parse the uploaded file as an Apple Health export: ' . $e->getMessage());
    }

    $inserted = (new HrRepository())->insertMatched($matched);
    $sessionsTouched = count(array_unique(array_column($matched, 'session_id')));

    Http::respond(['matched' => $inserted, 'sessions_touched' => $sessionsTouched]);
}
