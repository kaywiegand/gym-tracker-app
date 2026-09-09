#!/usr/bin/env python3
"""Convert a per-exercise Gainsfire export into a backup-restore file.

    python3 scripts/gainsfire-perfile-to-backup.py <export-dir> <target.db> <out.json>
        [--skip-day YYYY-MM-DD ...]

--skip-day drops a training day from the output. Use it for a day already
logged in the app itself: the app's own sets carry random ids, so the
export's would land beside them rather than on them, and the day would count
twice.

Gainsfire has two export shapes. The older one is a single CSV with a
Uebung column (scripts/gainsfire-to-backup.py handles that). This one is a
directory of per-exercise files, the exercise name carried by the filename:

    Lat-pulldowns---to-chest-overhand.csv
    Date,Set,Reps/Seconds,Weight,Plan
    24/04/2024,1,10,30,Entfernter Plan

Hyphens stand in for spaces, so "---" is the " - " of a name like
"Cable Rows - to chest overhand"; scripts/gainsfire-mapping.tsv keys those
with the three spaces that survive the substitution.

Names resolve through the mapping to a FEDB source name and from there to an
id in the TARGET database, never to an id from some other install -- looking
them up anywhere else is what once orphaned 2775 sets on the live server.
A source name the target does not have aborts the run.

Ids are the same deterministic UUIDv5 keys the single-file converter uses
('set' + day + exercise + index, 0-based), so the two exports describe the
same training with the same ids: re-running updates rows instead of
duplicating them, and a set present in both exports lands on the row it
already has.

"Entfernter Plan" marks sets whose plan was deleted in Gainsfire. Where the
same DAY also carries a real plan, they belong to it.
"""
import csv
import json
import os
import sqlite3
import sys
import uuid
from collections import defaultdict
from datetime import datetime

NS = uuid.UUID('6f5c1e2a-3b47-4d8e-9a10-2c7f5b6d8e90')
NOW = '2026-09-09T00:00:00Z'
DELETED_PLAN = 'Entfernter Plan'


def uid(*parts):
    return str(uuid.uuid5(NS, '|'.join(parts)))


def load_mapping(path):
    out = {}
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            if line.strip():
                gainsfire, source = line.rstrip('\n').split('\t')
                out[gainsfire.strip().lower()] = source
    return out


def read_export(directory, mapping, by_source):
    """-> rows [(day, exercise_id, set_no, reps, weight, plan)], plus what went missing."""
    rows, unmapped, missing = [], set(), set()
    for filename in sorted(os.listdir(directory)):
        if not filename.endswith('.csv'):
            continue
        gainsfire = filename[:-4].replace('-', ' ').strip()
        source = mapping.get(gainsfire.lower())
        if source is None:
            unmapped.add(gainsfire)
            continue
        exercise_id = by_source.get(source)
        if exercise_id is None:
            missing.add(f'{gainsfire} -> {source}')
            continue
        with open(os.path.join(directory, filename), encoding='utf-8-sig') as fh:
            for row in csv.DictReader(fh):
                day = datetime.strptime(row['Date'], '%d/%m/%Y').date().isoformat()
                rows.append((day, exercise_id, int(row['Set']), int(row['Reps/Seconds']),
                             float(row['Weight']), row.get('Plan', '').strip()))
    return rows, unmapped, missing


def build(rows):
    by_day = defaultdict(list)
    for row in rows:
        by_day[row[0]].append(row)

    # A day's real plan, so its "Entfernter Plan" sets can join it.
    real_plan = {}
    for day, entries in by_day.items():
        named = {p for *_, p in entries if p and p != DELETED_PLAN}
        if len(named) == 1:
            real_plan[day] = next(iter(named))

    workouts, workout_exercises, sessions, sets_out = {}, {}, {}, []
    we_index = defaultdict(dict)

    for day in sorted(by_day):
        plans = {real_plan.get(day) if p == DELETED_PLAN else p for *_, p in by_day[day]}
        plans.discard(None)
        plans.discard('')
        plans.discard(DELETED_PLAN)
        plan = sorted(plans)[0] if plans else None

        workout_id = None
        if plan:
            workout_id = uid('workout', plan)
            workouts.setdefault(workout_id, {
                'id': workout_id, 'name': plan, 'mode_id': 2, 'notes': None, 'archived': 0,
                'created_at': NOW, 'updated_at': NOW, 'deleted_at': None,
            })

        session_id = uid('session', day)
        sessions[session_id] = {
            'id': session_id, 'workout_id': workout_id,
            'started_at': f'{day}T18:00:00Z', 'ended_at': f'{day}T19:15:00Z',
            'note': 'Imported from Gainsfire',
            'created_at': NOW, 'updated_at': NOW, 'deleted_at': None,
        }

        # Grouped AFTER mapping: two Gainsfire names can land on one app
        # exercise ("Cable rows" and "Cable Rows - to chest overhand"), and
        # keying set ids by the export's own set number would then make them
        # collide and overwrite each other. Numbering restarts per exercise.
        per_exercise = defaultdict(list)
        for row in by_day[day]:
            per_exercise[row[1]].append(row)

        for exercise_id, entries in per_exercise.items():
            we_id = None
            if workout_id:
                slot = we_index[workout_id]
                if exercise_id not in slot:
                    we_id = uid('we', workout_id, exercise_id)
                    slot[exercise_id] = {
                        'id': we_id, 'workout_id': workout_id, 'exercise_id': exercise_id,
                        'position': len(slot), 'planned_sets': len(entries),
                        'rep_low_override': None, 'rep_high_override': None,
                        'increment_override_kg': None,
                        'created_at': NOW, 'updated_at': NOW, 'deleted_at': None,
                    }
                    workout_exercises[we_id] = slot[exercise_id]
                else:
                    we_id = slot[exercise_id]['id']
                    slot[exercise_id]['planned_sets'] = max(slot[exercise_id]['planned_sets'], len(entries))

            entries.sort(key=lambda r: r[2])
            for idx, (_, _, _, reps, weight, _) in enumerate(entries):
                sets_out.append({
                    'id': uid('set', day, exercise_id, str(idx)),
                    'session_id': session_id, 'exercise_id': exercise_id,
                    'workout_exercise_id': we_id, 'set_index': idx,
                    'weight_kg': weight, 'reps': reps,
                    'is_warmup': 0, 'rpe': None, 'performed_at': f'{day}T18:00:00Z',
                    'created_at': NOW, 'updated_at': NOW, 'deleted_at': None,
                })

    return workouts, workout_exercises, sessions, sets_out


def main(export_dir, db_path, out_path, skip_days=()):
    here = os.path.dirname(os.path.abspath(__file__))
    mapping = load_mapping(os.path.join(here, 'gainsfire-mapping.tsv'))

    db = sqlite3.connect(db_path)
    by_source = {name: eid for eid, name in
                 db.execute('SELECT id, name FROM exercises WHERE deleted_at IS NULL')}

    rows, unmapped, missing = read_export(export_dir, mapping, by_source)
    if skip_days:
        before = len(rows)
        rows = [r for r in rows if r[0] not in skip_days]
        print(f'skipped {before - len(rows)} sets on {len(skip_days)} day(s) already logged in the app')
    if unmapped:
        print('Not in gainsfire-mapping.tsv:', file=sys.stderr)
        for name in sorted(unmapped):
            print(f'  {name}', file=sys.stderr)
    if missing:
        print('Mapped to a source name the target database does not have:', file=sys.stderr)
        for line in sorted(missing):
            print(f'  {line}', file=sys.stderr)
        return 1
    if unmapped:
        return 1

    workouts, workout_exercises, sessions, sets_out = build(rows)
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({
            'exported_at': NOW,
            'source': 'gainsfire-perfile',
            'tables': {
                'workouts': list(workouts.values()),
                'workout_exercises': list(workout_exercises.values()),
                'sessions': list(sessions.values()),
                'sets': sets_out,
            },
        }, fh, ensure_ascii=False)

    days = sorted({r[0] for r in rows})
    print(f'workouts           {len(workouts)}')
    print(f'workout_exercises  {len(workout_exercises)}')
    print(f'sessions           {len(sessions)}')
    print(f'sets               {len(sets_out)}')
    print(f'range              {days[0]} .. {days[-1]}')
    return 0


if __name__ == '__main__':
    args, skip = [], []
    it = iter(sys.argv[1:])
    for a in it:
        if a == '--skip-day':
            skip.append(next(it))
        else:
            args.append(a)
    if len(args) != 3:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        sys.exit(1)
    sys.exit(main(*args, skip_days=set(skip)))
