<?php
declare(strict_types=1);

// Everything the phone needs to start a workout without a connection (R-01),
// in one request: GET /sync/snapshot replaces one call per workout and
// exercise, which on every app start would add up to a hundred.
final class OfflineSnapshot
{
    public static function build(): array
    {
        $workoutRepo = new WorkoutRepository();
        $setRepo = new SetRepository();

        $workouts = $workoutRepo->list();
        $details = [];
        $lastSets = [];
        foreach ($workouts as $workout) {
            $detail = $workoutRepo->find($workout['id']);
            if ($detail === null) {
                continue;
            }
            $details[$workout['id']] = $detail;
            foreach ($detail['exercises'] as $exercise) {
                $id = $exercise['exercise_id'];
                $lastSets[$id] ??= $setRepo->lastSetsForExercise($id);
            }
        }

        return [
            'workouts' => $workouts,
            'workout_groups' => (new WorkoutGroupRepository())->list(),
            'workout_details' => $details,
            'settings' => (new SettingsRepository())->getAll(),
            'last_sets' => $lastSets,
        ];
    }
}
