<?php
declare(strict_types=1);

// Human-readable CSV export (CLAUDE.md §2: "Export (CSV/PDF), kein
// Lock-in") -- distinct from Stage 5's raw JSON backup, which is a
// disaster-recovery snapshot of every table, not something you'd open in a
// spreadsheet. One row per logged set is the broadly useful shape here.
function handleExportTrainingLog(): void
{
    Auth::require();
    $rows = (new SetRepository())->exportRows();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="training-log.csv"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ['Date', 'Workout', 'Exercise', 'Set', 'Weight (kg)', 'Reps', 'Warmup', 'e1RM (kg)'], ',', '"', '\\');
    foreach ($rows as $row) {
        $isWarmup = (bool) $row['is_warmup'];
        fputcsv($out, [
            substr((string) $row['performed_at'], 0, 10),
            $row['workout_name'] ?? '',
            $row['exercise_name'],
            ((int) $row['set_index']) + 1,
            $row['weight_kg'],
            $row['reps'],
            $isWarmup ? 'yes' : 'no',
            $isWarmup ? '' : round(((float) $row['weight_kg']) * (1 + ((int) $row['reps']) / 30), 1),
        ], ',', '"', '\\');
    }
    fclose($out);
    exit;
}
