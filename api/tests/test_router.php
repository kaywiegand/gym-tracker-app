<?php
declare(strict_types=1);

// Router for the HTTP checks in run.php: the real front controller on a
// throwaway database. Lives in tests/, which deploy.sh never uploads.

require __DIR__ . '/../bootstrap.php';
Db::setOverrides(json_decode((string) getenv('GYM_TEST_OVERRIDES'), true));
require __DIR__ . '/../index.php';
