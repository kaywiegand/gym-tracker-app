<?php
declare(strict_types=1);

// FEDB primary/secondary muscle keys -> canonical display name + region.
// Region mapping per CLAUDE.md §7 (fixed muscle-group colors): chest, back,
// shoulders, arms, legs, core. Shared by muscles.php and exercises.php so
// the FEDB import and the muscles table always agree on ids.
return [
    ['key' => 'chest', 'name_en' => 'Chest', 'region' => 'chest', 'sort' => 1],
    ['key' => 'lats', 'name_en' => 'Lats', 'region' => 'back', 'sort' => 2],
    ['key' => 'middle back', 'name_en' => 'Middle Back', 'region' => 'back', 'sort' => 3],
    ['key' => 'lower back', 'name_en' => 'Lower Back', 'region' => 'back', 'sort' => 4],
    ['key' => 'traps', 'name_en' => 'Traps', 'region' => 'back', 'sort' => 5],
    ['key' => 'shoulders', 'name_en' => 'Shoulders', 'region' => 'shoulders', 'sort' => 6],
    ['key' => 'biceps', 'name_en' => 'Biceps', 'region' => 'arms', 'sort' => 7],
    ['key' => 'triceps', 'name_en' => 'Triceps', 'region' => 'arms', 'sort' => 8],
    ['key' => 'forearms', 'name_en' => 'Forearms', 'region' => 'arms', 'sort' => 9],
    ['key' => 'quadriceps', 'name_en' => 'Quadriceps', 'region' => 'legs', 'sort' => 10],
    ['key' => 'hamstrings', 'name_en' => 'Hamstrings', 'region' => 'legs', 'sort' => 11],
    ['key' => 'glutes', 'name_en' => 'Glutes', 'region' => 'legs', 'sort' => 12],
    ['key' => 'calves', 'name_en' => 'Calves', 'region' => 'legs', 'sort' => 13],
    ['key' => 'abductors', 'name_en' => 'Abductors', 'region' => 'legs', 'sort' => 14],
    ['key' => 'adductors', 'name_en' => 'Adductors', 'region' => 'legs', 'sort' => 15],
    ['key' => 'abdominals', 'name_en' => 'Abdominals', 'region' => 'core', 'sort' => 16],
    ['key' => 'neck', 'name_en' => 'Neck', 'region' => 'core', 'sort' => 17],
];
