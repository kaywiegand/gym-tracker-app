<?php
declare(strict_types=1);

// Curation starter set: the exercises almost every plan is built from.
//
// Curation is NOT a bulk rename -- a dry run against all 873 FEDB names
// produced 176 with no recognisable movement word and 127 name collisions
// (see BACKLOG.md). So this seeds only the obvious core lifts by their exact
// source name; everything else stays uncurated and keeps its original name
// until it is actually used and curated by hand in the editor.
//
// Columns set here:
//   movement       Press | Row | Curl | ...   -- having one = curated
//   variant        Incline | Seated | ...     -- optional
//   display_alias  the common gym name shown as the second line
//
// Muscle and equipment are NOT repeated here -- they already exist in
// exercise_muscles / exercises.equipment and are read from there when the
// display name is assembled (see api/lib/ExerciseNaming.php).
return function (PDO $pdo, array $args): void {
    // source name => [movement, variant, common alias]
    $curated = [
        'Barbell Bench Press - Medium Grip'            => ['Press', null, 'Bench Press'],
        'Barbell Incline Bench Press - Medium Grip'    => ['Press', 'Incline', 'Incline Bench Press'],
        'Decline Barbell Bench Press'                  => ['Press', 'Decline', 'Decline Bench Press'],
        'Wide-Grip Barbell Bench Press'                => ['Press', 'Wide-Grip', 'Wide-Grip Bench Press'],
        'Dumbbell Bench Press'                         => ['Press', null, 'Dumbbell Bench Press'],
        'Incline Dumbbell Press'                       => ['Press', 'Incline', 'Incline Dumbbell Press'],
        'Decline Dumbbell Bench Press'                 => ['Press', 'Decline', 'Decline Dumbbell Press'],
        'Machine Bench Press'                          => ['Press', null, 'Machine Chest Press'],
        'Leverage Incline Chest Press'                 => ['Press', 'Incline', 'Incline Machine Press'],
        'Smith Machine Bench Press'                    => ['Press', 'Smith', 'Smith Machine Bench Press'],
        'Cable Chest Press'                            => ['Press', null, 'Cable Chest Press'],
        'Dumbbell Flyes'                               => ['Fly', null, 'Dumbbell Flyes'],
        'Incline Dumbbell Flyes'                       => ['Fly', 'Incline', 'Incline Dumbbell Flyes'],
        'Cable Crossover'                              => ['Fly', null, 'Cable Crossover'],
        'Low Cable Crossover'                          => ['Fly', 'Low', 'Low Cable Crossover'],
        'Incline Cable Flye'                           => ['Fly', 'Incline', 'Incline Cable Fly'],
        'Butterfly'                                    => ['Fly', null, 'Pec Deck'],
        'Pushups'                                      => ['Push-Up', null, 'Push-Up'],
        'Push-Ups With Feet Elevated'                  => ['Push-Up', 'Decline', 'Decline Push-Up'],
        'Straight-Arm Dumbbell Pullover'               => ['Pullover', null, 'Dumbbell Pullover'],
        'Wide-Grip Lat Pulldown'                       => ['Pulldown', 'Wide-Grip', 'Lat Pulldown'],
        'Close-Grip Front Lat Pulldown'                => ['Pulldown', 'Close-Grip', 'Close-Grip Pulldown'],
        'Underhand Cable Pulldowns'                    => ['Pulldown', 'Supinated', 'Reverse-Grip Pulldown'],
        'V-Bar Pulldown'                               => ['Pulldown', 'Neutral', 'V-Bar Pulldown'],
        'Straight-Arm Pulldown'                        => ['Pulldown', 'Straight-Arm', 'Straight-Arm Pulldown'],
        'Pullups'                                      => ['Pull-Up', null, 'Pull-Up'],
        'Chin-Up'                                      => ['Pull-Up', 'Supinated', 'Chin-Up'],
        'V-Bar Pullup'                                 => ['Pull-Up', 'Neutral', 'Neutral-Grip Pull-Up'],
        'Leverage Iso Row'                             => ['Row', 'Iso-Lateral', 'Iso-Lateral Row'],
        'Bent Over Barbell Row'                        => ['Row', 'Bent-Over', 'Barbell Row'],
        'Reverse Grip Bent-Over Rows'                  => ['Row', 'Supinated', 'Pendlay Row'],
        'Bent Over Two-Dumbbell Row'                   => ['Row', 'Bent-Over', 'Dumbbell Row'],
        'One-Arm Dumbbell Row'                         => ['Row', 'One-Arm', 'One-Arm Dumbbell Row'],
        'Seated Cable Rows'                            => ['Row', 'Seated', 'Seated Cable Row'],
        'Lying T-Bar Row'                              => ['Row', 'T-Bar', 'T-Bar Row'],
        'Dumbbell Incline Row'                         => ['Row', 'Incline', 'Chest-Supported Row'],
        'Barbell Deadlift'                             => ['Deadlift', null, 'Deadlift'],
        'Stiff Leg Barbell Good Morning'               => ['Good Morning', null, 'Good Morning'],
        'Hyperextensions With No Hyperextension Bench' => ['Extension', null, 'Back Extension'],
        'Barbell Shrug'                                => ['Shrug', null, 'Barbell Shrug'],
        'Dumbbell Shrug'                               => ['Shrug', null, 'Dumbbell Shrug'],
        'Upright Cable Row'                            => ['Upright Row', null, 'Cable Upright Row'],
        'Standing Military Press'                      => ['Press', 'Overhead', 'Overhead Press'],
        'Seated Barbell Military Press'                => ['Press', 'Seated', 'Seated Barbell Press'],
        'Seated Dumbbell Press'                        => ['Press', 'Seated', 'Seated Dumbbell Press'],
        'Standing Dumbbell Press'                      => ['Press', 'Overhead', 'Standing Dumbbell Press'],
        'Arnold Dumbbell Press'                        => ['Press', 'Arnold', 'Arnold Press'],
        'Machine Shoulder (Military) Press'            => ['Press', 'Overhead', 'Machine Shoulder Press'],
        'Seated Cable Shoulder Press'                  => ['Press', 'Seated', 'Cable Shoulder Press'],
        'Side Lateral Raise'                           => ['Raise', 'Lateral', 'Lateral Raise'],
        'Seated Side Lateral Raise'                    => ['Raise', 'Lateral Seated', 'Seated Lateral Raise'],
        'Standing Low-Pulley Deltoid Raise'            => ['Raise', 'Lateral', 'Cable Lateral Raise'],
        'Front Dumbbell Raise'                         => ['Raise', 'Front', 'Front Raise'],
        'Front Cable Raise'                            => ['Raise', 'Front', 'Cable Front Raise'],
        'Reverse Flyes'                                => ['Fly', 'Rear-Delt', 'Rear Delt Fly'],
        'Reverse Machine Flyes'                        => ['Fly', 'Rear-Delt', 'Reverse Pec Deck'],
        'Cable Rear Delt Fly'                          => ['Fly', 'Rear-Delt', 'Cable Rear Delt Fly'],
        'Face Pull'                                    => ['Face Pull', null, 'Face Pull'],
        'Upright Barbell Row'                          => ['Upright Row', null, 'Upright Row'],
        'Barbell Curl'                                 => ['Curl', null, 'Barbell Curl'],
        'EZ-Bar Curl'                                  => ['Curl', null, 'EZ-Bar Curl'],
        'Dumbbell Bicep Curl'                          => ['Curl', null, 'Dumbbell Curl'],
        'Hammer Curls'                                 => ['Curl', 'Hammer', 'Hammer Curl'],
        'Incline Dumbbell Curl'                        => ['Curl', 'Incline', 'Incline Curl'],
        'Concentration Curls'                          => ['Curl', 'Concentration', 'Concentration Curl'],
        'Preacher Curl'                                => ['Curl', 'Preacher', 'Preacher Curl'],
        'Spider Curl'                                  => ['Curl', 'Spider', 'Spider Curl'],
        'Standing Biceps Cable Curl'                   => ['Curl', null, 'Cable Curl'],
        'Cable Hammer Curls - Rope Attachment'         => ['Curl', 'Hammer', 'Rope Hammer Curl'],
        'Reverse Barbell Curl'                         => ['Curl', 'Reverse-Grip', 'Reverse Curl'],
        'Machine Bicep Curl'                           => ['Curl', null, 'Machine Curl'],
        'Triceps Pushdown'                             => ['Pushdown', null, 'Triceps Pushdown'],
        'Cable Rope Overhead Triceps Extension'        => ['Extension', 'Overhead', 'Overhead Rope Extension'],
        'Cable Lying Triceps Extension'                => ['Extension', 'Lying', 'Cable Skullcrusher'],
        'Close-Grip Barbell Bench Press'               => ['Press', 'Close-Grip', 'Close-Grip Bench Press'],
        'Dips - Triceps Version'                       => ['Dip', null, 'Dips'],
        'Bench Dips'                                   => ['Dip', 'Bench', 'Bench Dips'],
        'Seated Palm-Up Barbell Wrist Curl'            => ['Curl', 'Wrist', 'Wrist Curl'],
        'Palms-Down Wrist Curl Over A Bench'           => ['Curl', 'Wrist Reverse', 'Reverse Wrist Curl'],
        'Barbell Squat'                                => ['Squat', 'Back', 'Back Squat'],
        'Front Barbell Squat'                          => ['Squat', 'Front', 'Front Squat'],
        'Barbell Full Squat'                           => ['Squat', 'Deep', 'Deep Squat'],
        'Dumbbell Squat'                               => ['Squat', 'Goblet', 'Goblet Squat'],
        'Hack Squat'                                   => ['Squat', 'Hack', 'Hack Squat'],
        'Smith Machine Squat'                          => ['Squat', 'Smith', 'Smith Machine Squat'],
        'Bodyweight Squat'                             => ['Squat', null, 'Air Squat'],
        'Leg Press'                                    => ['Press', null, 'Leg Press'],
        'Narrow Stance Leg Press'                      => ['Press', 'Narrow', 'Narrow-Stance Leg Press'],
        'Barbell Lunge'                                => ['Lunge', null, 'Barbell Lunge'],
        'Dumbbell Lunges'                              => ['Lunge', null, 'Dumbbell Lunge'],
        'Barbell Walking Lunge'                        => ['Lunge', 'Walking', 'Walking Lunge'],
        'Split Squat with Dumbbells'                   => ['Squat', 'Split', 'Bulgarian Split Squat'],
        'Dumbbell Step Ups'                            => ['Step-Up', null, 'Step-Up'],
        'Leg Extensions'                               => ['Extension', null, 'Leg Extension'],
        'Romanian Deadlift'                            => ['Deadlift', 'Romanian', 'RDL'],
        'Stiff-Legged Dumbbell Deadlift'               => ['Deadlift', 'Stiff-Legged', 'Dumbbell RDL'],
        'Lying Leg Curls'                              => ['Curl', 'Lying', 'Lying Leg Curl'],
        'Seated Leg Curl'                              => ['Curl', 'Seated', 'Seated Leg Curl'],
        'Standing Leg Curl'                            => ['Curl', 'Standing', 'Standing Leg Curl'],
        'Natural Glute Ham Raise'                      => ['Raise', 'Glute-Ham', 'Nordic Curl'],
        'Butt Lift (Bridge)'                           => ['Bridge', null, 'Glute Bridge'],
        'Single Leg Glute Bridge'                      => ['Bridge', 'Single-Leg', 'Single-Leg Glute Bridge'],
        'Pull Through'                                 => ['Pull-Through', null, 'Cable Pull-Through'],
        'One-Legged Cable Kickback'                    => ['Kickback', null, 'Cable Kickback'],
        'Standing Calf Raises'                         => ['Raise', 'Standing', 'Standing Calf Raise'],
        'Seated Calf Raise'                            => ['Raise', 'Seated', 'Seated Calf Raise'],
        'Calf Press On The Leg Press Machine'          => ['Raise', 'Leg-Press', 'Leg Press Calf Raise'],
        'Thigh Abductor'                               => ['Abduction', null, 'Hip Abduction'],
        'Thigh Adductor'                               => ['Adduction', null, 'Hip Adduction'],
        'Crunches'                                     => ['Crunch', null, 'Crunch'],
        'Cable Crunch'                                 => ['Crunch', null, 'Cable Crunch'],
        'Reverse Crunch'                               => ['Crunch', 'Reverse', 'Reverse Crunch'],
        'Ab Crunch Machine'                            => ['Crunch', null, 'Machine Crunch'],
        'Sit-Up'                                       => ['Sit-Up', null, 'Sit-Up'],
        'Hanging Leg Raise'                            => ['Raise', 'Hanging', 'Hanging Leg Raise'],
        'Flat Bench Lying Leg Raise'                   => ['Raise', 'Lying', 'Lying Leg Raise'],
        'Plank'                                        => ['Hold', null, 'Plank'],
        'Side Bridge'                                  => ['Hold', 'Side', 'Side Plank'],
        'Barbell Ab Rollout - On Knees'                => ['Rollout', null, 'Ab Wheel Rollout'],
        'Russian Twist'                                => ['Twist', null, 'Russian Twist'],
        'Standing Cable Wood Chop'                     => ['Chop', null, 'Cable Wood Chop'],
        'Pallof Press'                                 => ['Press', 'Anti-Rotation', 'Pallof Press'],
        'Dumbbell Side Bend'                           => ['Side Bend', null, 'Side Bend'],
    ];

    // Only touches exercises that were never curated. is_curated is the flag
    // to test, not the movement value: two entries here happen to have a
    // movement identical to their source name ("Face Pull", "Sit-Up"), and a
    // movement-based guard re-wrote exactly those on every migrate.php run --
    // which would silently undo a hand correction to them.
    $stmt = $pdo->prepare(
        'UPDATE exercises
            SET movement = ?, variant = ?, display_alias = ?, is_curated = 1
          WHERE name = ? AND deleted_at IS NULL AND (is_curated = 0 OR is_curated IS NULL)'
    );

    $applied = 0;
    foreach ($curated as $sourceName => [$movement, $variant, $alias]) {
        $stmt->execute([$movement, $variant, $alias, $sourceName]);
        $applied += $stmt->rowCount();
    }

    echo "   curated {$applied} exercise name(s)\n";
};
