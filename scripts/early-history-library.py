#!/usr/bin/env python3
"""Library changes the early-history backfill (BACKLOG #135) depends on.

    python3 scripts/early-history-library.py <target.db> <out.json> <move-from-day> [stamp]

Writes a backup tables file (feed it to gainsfire-perfile-to-backup.py with
--extra-tables) holding:

* three custom exercises the export needs and the library lacks, with their
  muscles -- Crucifix Crunch, Dumbbell Lateral Squat, Dumbbell Single-Leg
  Deadlift. Ids are UUIDv5 over the source name, so a second run describes the
  same rows;
* three FEDB exercises re-curated (Air Bike -> "Abs Crunch Bicycle", Standing
  Dumbbell Reverse Curl -> "Biceps Curl Dumbbell Reverse", Standing Dumbbell
  Upright Row -> "Traps Upright Row Dumbbell"). A restore carries
  FEDB curation as the full exercise row, the same way live-movement-20261013
  did; db/seed/exercise_naming.php has the same two entries for fresh installs;
* the move of the existing "Abs Crunch Crucifix" sets from Crunches to Crucifix
  Crunch: every Crunches set on or after <move-from-day> (earlier days are the
  importer's, via --id-alias) and the workout_exercise rows they hang on.
  Aborts if a Crunches set is not one the Gainsfire converters produced
  (deterministic id), since only those are known to be Crucifix sets.

Everything is read from the TARGET database; muscle and exercise ids differ
per install.
"""
import json
import sqlite3
import sys
import uuid

NS = uuid.UUID('6f5c1e2a-3b47-4d8e-9a10-2c7f5b6d8e90')
DEFAULT_STAMP = '2026-10-13T00:00:00Z'


def uid(*parts):
    return str(uuid.uuid5(NS, '|'.join(parts)))


# name, movement, variant, alias, equipment, mechanic, {muscle: role}
# Crucifix Crunch takes its muscles from Crunches (same movement, same body).
NEW_EXERCISES = [
    ('Crucifix Crunch', 'Crunch', 'Crucifix', 'Crucifix Crunch', 'body only', 'isolation', None),
    ('Dumbbell Lateral Squat', 'Squat', 'Lateral', 'Lateral Squat', 'dumbbell', 'compound',
     {'Quadriceps': 'primary', 'Glutes': 'secondary', 'Adductors': 'secondary'}),
    ('Dumbbell Single-Leg Deadlift', 'Deadlift', 'Single-Leg', 'Single-Leg Deadlift', 'dumbbell', 'compound',
     {'Hamstrings': 'primary', 'Glutes': 'secondary', 'Lower Back': 'secondary'}),
]

# source name -> movement, variant, alias
RECURATED = {
    'Air Bike': ('Crunch', 'Bicycle', 'Bicycle Crunch'),
    'Standing Dumbbell Reverse Curl': ('Curl', 'Reverse', 'Dumbbell Reverse Curl'),
    'Standing Dumbbell Upright Row': ('Upright Row', None, 'Dumbbell Upright Row'),
}


def rows(db, sql, args=()):
    cur = db.execute(sql, args)
    names = [c[0] for c in cur.description]
    return [dict(zip(names, r)) for r in cur.fetchall()]


def main(db_path, out_path, move_from, stamp=DEFAULT_STAMP):
    db = sqlite3.connect(db_path)
    by_name = {r['name']: r for r in rows(db, 'SELECT * FROM exercises WHERE deleted_at IS NULL')}
    muscle_id = {r['name_en']: r['id'] for r in rows(db, 'SELECT id, name_en FROM muscles')}

    exercises, exercise_muscles = [], []
    for name, movement, variant, alias, equipment, mechanic, muscles in NEW_EXERCISES:
        if name in by_name:
            print(f'{name} already exists in the target', file=sys.stderr)
            return 1
        exercise_id = uid('exercise', name)
        exercises.append({
            'id': exercise_id, 'name': name, 'movement': movement, 'equipment': equipment,
            'mechanic': mechanic, 'category': 'strength', 'default_increment_kg': None,
            'source': 'custom', 'external_id': None, 'created_at': stamp, 'updated_at': stamp,
            'deleted_at': None, 'variant': variant, 'display_alias': alias, 'is_curated': 1,
        })
        if muscles is None:
            source = rows(db, 'SELECT mu.name_en AS muscle, em.role FROM exercise_muscles em '
                              'JOIN muscles mu ON mu.id = em.muscle_id WHERE em.exercise_id = ?',
                          (by_name['Crunches']['id'],))
            muscles = {r['muscle']: r['role'] for r in source}
        for muscle, role in muscles.items():
            exercise_muscles.append({'exercise_id': exercise_id, 'muscle_id': muscle_id[muscle],
                                     'role': role, 'weight': 1.0 if role == 'primary' else 0.5})

    for name, (movement, variant, alias) in RECURATED.items():
        row = dict(by_name[name])
        row.update(movement=movement, variant=variant, display_alias=alias, is_curated=1, updated_at=stamp)
        exercises.append(row)

    crunches = by_name['Crunches']['id']
    crucifix = uid('exercise', 'Crucifix Crunch')
    moved_sets = rows(db, 'SELECT * FROM sets WHERE exercise_id = ? AND substr(performed_at, 1, 10) >= ? '
                          'ORDER BY performed_at, set_index', (crunches, move_from))
    for row in moved_sets:
        day = row['performed_at'][:10]
        if row['id'] != uid('set', day, crunches, str(row['set_index'])):
            print(f'Crunches set {row["id"]} ({day}) is not from the Gainsfire converters', file=sys.stderr)
            return 1
        row.update(exercise_id=crucifix, updated_at=stamp)

    # A workout_exercise moves with its sets, so it must carry nothing else.
    # (Sets before <move-from-day> are moved by the importer in the same restore.)
    moved_we = []
    for we in rows(db, 'SELECT * FROM workout_exercises WHERE exercise_id = ?', (crunches,)):
        foreign = db.execute('SELECT COUNT(*) FROM sets WHERE workout_exercise_id = ? AND exercise_id != ?',
                             (we['id'], crunches)).fetchone()[0]
        if foreign:
            print(f'workout_exercise {we["id"]} also carries sets of other exercises', file=sys.stderr)
            return 1
        we.update(exercise_id=crucifix, updated_at=stamp)
        moved_we.append(we)

    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({'exported_at': stamp, 'source': 'early-history-library', 'tables': {
            'exercises': exercises, 'exercise_muscles': exercise_muscles,
            'workout_exercises': moved_we, 'sets': moved_sets,
        }}, fh, ensure_ascii=False)

    print(f'exercises          {len(exercises)} ({len(NEW_EXERCISES)} new, {len(RECURATED)} re-curated)')
    print(f'exercise_muscles   {len(exercise_muscles)}')
    print(f'workout_exercises  {len(moved_we)} moved to Crucifix Crunch')
    print(f'sets               {len(moved_sets)} moved to Crucifix Crunch (from {move_from})')
    return 0


if __name__ == '__main__':
    if len(sys.argv) not in (4, 5):
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        sys.exit(1)
    sys.exit(main(*sys.argv[1:]))
