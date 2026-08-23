<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/Db.php';
require_once __DIR__ . '/lib/Uuid.php';
require_once __DIR__ . '/lib/BaseRepository.php';
require_once __DIR__ . '/lib/MuscleVolume.php';

foreach (glob(__DIR__ . '/lib/Repository/*.php') as $file) {
    require_once $file;
}
