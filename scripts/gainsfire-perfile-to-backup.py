#!/usr/bin/env python3
"""Convert a per-exercise Gainsfire export into a backup-restore file.

    python3 scripts/gainsfire-perfile-to-backup.py <export-dir> <target.db> <out.json>
        [--skip-day YYYY-MM-DD ...] [--before YYYY-MM-DD] [--skip-name NAME ...]
        [--no-plans] [--id-alias NEW=OLD ...] [--extra-tables FILE] [--stamp ISO]

--skip-day drops a training day from the output. Use it for a day already
logged in the app itself: the app's own sets carry random ids, so the
export's would land beside them rather than on them, and the day would count
twice.

--before drops every day on or after the given date. Use it to backfill only
the history the app is missing and leave the days it already has alone.

--skip-name drops one Gainsfire name (the file name, hyphens as spaces) before
the mapping is consulted. For files that cannot be read as this export shape
or that repeat another file in a different format. (The one file with a doubled
"Exercise" header is read explicitly, see DOUBLED_HEADER.)

--no-plans ignores the Plan column: sessions get no workout and sets no
workout_exercise. Use it for a backfill, where the plan names are the
leftovers of plans Gainsfire no longer has and importing them would create
(or revive) workouts nobody wants.

--id-alias NEW=OLD keys the set ids of exercise NEW (a source name) on the id
of exercise OLD. For an exercise that used to be filed under OLD: sets already
in the app keep their ids and are moved onto NEW by the restore instead of
being doubled next to it.

--extra-tables merges the rows of a backup tables file (e.g. exercises the
export needs that the target does not have yet) into the output; their source
names resolve in the mapping like any other.

--stamp is the created_at/updated_at of every row written (default NOW below).

Output is minimal against the target: sessions, workouts and workout_exercises
that already exist are left out (so a deleted one is never revived), and so is
every set already in the target with the same values. A changed set keeps its
created_at and workout_exercise_id.

Rows with no date (a truncated last line, which some files end on) are
skipped. Where two Gainsfire names land on one app exercise and carry exactly
the same sets for a day, the day is kept once; days that differ are all kept.

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
from collections import Counter, defaultdict
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


# One file (Upright-dumbbell-rows.csv) has the header "Exercise,Exercise,Date,..."
# over rows of six values: the first Exercise is a stray extra header cell, the
# rows are Exercise,Date,Set,Reps/Seconds,Weight,Plan. Only that exact header
# is read this way; any other file is read as written.
DOUBLED_HEADER = ['Exercise', 'Exercise', 'Date', 'Set', 'Reps/Seconds', 'Weight', 'Plan']


def dict_rows(fh):
    reader = csv.reader(fh)
    header = next(reader, [])
    if header == DOUBLED_HEADER:
        header = DOUBLED_HEADER[1:]
    for values in reader:
        yield dict(zip(header, values))


def read_export(directory, mapping, by_source, skip_names=()):
    """-> rows [(day, exercise_id, set_no, reps, weight, plan)], plus what went missing."""
    raw, unmapped, missing = [], set(), set()
    skip = {n.lower() for n in skip_names}
    blank = 0
    for filename in sorted(os.listdir(directory)):
        if not filename.endswith('.csv'):
            continue
        gainsfire = filename[:-4].replace('-', ' ').strip()
        if gainsfire.lower() in skip:
            continue
        source = mapping.get(gainsfire.lower())
        if source is None:
            unmapped.add(gainsfire)
            continue
        exercise_id = by_source.get(source)
        if exercise_id is None:
            missing.add(f'{gainsfire} -> {source}')
            continue
        with open(os.path.join(directory, filename), encoding='utf-8-sig') as fh:
            for row in dict_rows(fh):
                date = (row.get('Date') or '').strip()
                if not date:
                    blank += 1
                    continue
                day = datetime.strptime(date, '%d/%m/%Y').date().isoformat()
                raw.append((gainsfire, day, exercise_id, int(row['Set']), int(row['Reps/Seconds']),
                            float(row['Weight']), row.get('Plan', '').strip()))
    rows, repeated = drop_repeated_days(raw)
    if blank:
        print(f'skipped {blank} row(s) without a date')
    if repeated:
        print(f'kept once: {len(repeated)} day(s) a second name repeats exactly')
    return rows, unmapped, missing


def drop_repeated_days(raw):
    """Gainsfire can carry one training under two names. Where both land on
    the same app exercise and the same day with exactly the same sets, keep
    the first name's day. A day that differs in any set is a different
    training and stays whole -- there is no telling which of its sets repeat."""
    kept_sigs = defaultdict(list)
    sigs = defaultdict(Counter)
    for name, day, exercise_id, set_no, reps, weight, _ in raw:
        sigs[(name, day, exercise_id)][(set_no, reps, weight)] += 1
    repeated = set()
    for key in sigs:  # insertion order = file order
        name, day, exercise_id = key
        if sigs[key] in kept_sigs[(day, exercise_id)]:
            repeated.add(key)
        else:
            kept_sigs[(day, exercise_id)].append(sigs[key])
    rows = [r[1:] for r in raw if (r[0], r[1], r[2]) not in repeated]
    return rows, sorted(repeated)


def build(rows, no_plans=False, id_key=None, stamp=NOW):
    id_key = id_key or {}
    if no_plans:
        rows = [(*r[:5], '') for r in rows]
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
                'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
            })

        session_id = uid('session', day)
        sessions[session_id] = {
            'id': session_id, 'workout_id': workout_id,
            'started_at': f'{day}T18:00:00Z', 'ended_at': f'{day}T19:15:00Z',
            'note': 'Imported from Gainsfire',
            'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
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
                        'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
                    }
                    workout_exercises[we_id] = slot[exercise_id]
                else:
                    we_id = slot[exercise_id]['id']
                    slot[exercise_id]['planned_sets'] = max(slot[exercise_id]['planned_sets'], len(entries))

            entries.sort(key=lambda r: r[2])
            for idx, (_, _, _, reps, weight, _) in enumerate(entries):
                sets_out.append({
                    'id': uid('set', day, id_key.get(exercise_id, exercise_id), str(idx)),
                    'session_id': session_id, 'exercise_id': exercise_id,
                    'workout_exercise_id': we_id, 'set_index': idx,
                    'weight_kg': weight, 'reps': reps,
                    'is_warmup': 0, 'rpe': None, 'performed_at': f'{day}T18:00:00Z',
                    'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
                })

    return workouts, workout_exercises, sessions, sets_out


SET_VALUES = ('session_id', 'exercise_id', 'set_index', 'weight_kg', 'reps', 'is_warmup', 'performed_at', 'deleted_at')


def only_changes(db, workouts, workout_exercises, sessions, sets_out, stamp):
    """Reduce the built rows to what the target does not already have."""
    for table, rows in (('workouts', workouts), ('workout_exercises', workout_exercises), ('sessions', sessions)):
        have = {r[0] for r in db.execute(f'SELECT id FROM {table}')}
        for row_id in [i for i in rows if i in have]:
            del rows[row_id]

    db.row_factory = sqlite3.Row
    have = {r['id']: r for r in db.execute('SELECT * FROM sets')}
    db.row_factory = None
    out = []
    for row in sets_out:
        old = have.get(row['id'])
        if old is None:
            out.append(row)
        elif any(old[k] != row[k] for k in SET_VALUES):
            row['created_at'] = old['created_at']
            row['workout_exercise_id'] = old['workout_exercise_id']
            row['rpe'] = old['rpe']
            row['updated_at'] = stamp
            out.append(row)
    return out


def main(export_dir, db_path, out_path, skip_days=(), before=None, skip_names=(), no_plans=False,
         id_aliases=(), extra_tables=None, stamp=NOW):
    here = os.path.dirname(os.path.abspath(__file__))
    mapping = load_mapping(os.path.join(here, 'gainsfire-mapping.tsv'))

    extra = {}
    if extra_tables:
        with open(extra_tables, encoding='utf-8') as fh:
            extra = json.load(fh)['tables']

    db = sqlite3.connect(db_path)
    by_source = {name: eid for eid, name in
                 db.execute('SELECT id, name FROM exercises WHERE deleted_at IS NULL')}
    for row in extra.get('exercises', []):
        by_source[row['name']] = row['id']

    id_key = {}
    for alias in id_aliases:
        new, old = alias.split('=', 1)
        if new not in by_source or old not in by_source:
            print(f'--id-alias {alias}: not a source name of the target', file=sys.stderr)
            return 1
        id_key[by_source[new]] = by_source[old]

    rows, unmapped, missing = read_export(export_dir, mapping, by_source, skip_names)
    if skip_days:
        before_n = len(rows)
        rows = [r for r in rows if r[0] not in skip_days]
        print(f'skipped {before_n - len(rows)} sets on {len(skip_days)} day(s) already logged in the app')
    if before:
        before_n = len(rows)
        rows = [r for r in rows if r[0] < before]
        print(f'skipped {before_n - len(rows)} sets on or after {before}')
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

    workouts, workout_exercises, sessions, sets_out = build(rows, no_plans, id_key, stamp)
    sets_out = only_changes(db, workouts, workout_exercises, sessions, sets_out, stamp)

    tables = {
        'workouts': list(workouts.values()),
        'workout_exercises': list(workout_exercises.values()),
        'sessions': list(sessions.values()),
        'sets': sets_out,
    }
    # Extra rows go first: a set in both is the importer's, which is the newer reading.
    for table, extra_rows in extra.items():
        mine = {r['id'] for r in tables.get(table, []) if 'id' in r}
        tables[table] = [r for r in extra_rows if r.get('id') not in mine] + tables.get(table, [])
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({'exported_at': stamp, 'source': 'gainsfire-perfile', 'tables': tables},
                  fh, ensure_ascii=False)

    days = sorted({r[0] for r in rows})
    print(f'new workouts           {len(workouts)}')
    print(f'new workout_exercises  {len(workout_exercises)}')
    print(f'new sessions           {len(sessions)}')
    print(f'sets written           {len(sets_out)} (of {len(rows)} in the export after de-duplication)')
    print(f'range                  {days[0]} .. {days[-1]}')
    return 0


if __name__ == '__main__':
    args, skip, names, aliases = [], [], [], []
    opts = {}
    it = iter(sys.argv[1:])
    for a in it:
        if a == '--skip-day':
            skip.append(next(it))
        elif a == '--skip-name':
            names.append(next(it))
        elif a == '--id-alias':
            aliases.append(next(it))
        elif a == '--before':
            opts['before'] = next(it)
        elif a == '--extra-tables':
            opts['extra_tables'] = next(it)
        elif a == '--stamp':
            opts['stamp'] = next(it)
        elif a == '--no-plans':
            opts['no_plans'] = True
        else:
            args.append(a)
    if len(args) != 3:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        sys.exit(1)
    sys.exit(main(*args, skip_days=set(skip), skip_names=names, id_aliases=aliases, **opts))
