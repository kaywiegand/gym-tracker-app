#!/usr/bin/env python3
"""Import only the NEW sets from a per-exercise Gainsfire export.

    python3 scripts/gainsfire-incremental-import.py <export-dir> <target.db> <out.json>
        [--workout-prefix "FB26"] [--session-hour 18]

Unlike scripts/gainsfire-perfile-to-backup.py (which rebuilds a full backup
from a full-history export, keyed by deterministic ids so re-running it
just upserts), this script is for the recurring situation where Kay keeps
training in the app AND exporting from Gainsfire in parallel: the export's
"FULL history since 2024" mostly duplicates what is already in the
database, and re-importing everything under fresh Gainsfire-derived
workouts would create a second, confusing set of workouts next to the ones
Kay actually uses in the app (this happened once already -- the "26 FB ..."
workouts are exactly that leftover).

So this script:
  1. Maps each CSV's filename to an app exercise_id (same mapping table and
     filename convention as gainsfire-perfile-to-backup.py -- see that
     file's docstring for the "---" / three-space rule).
  2. Skips any (exercise, calendar day) that ALREADY has a non-deleted set
     for that exercise in the target database -- regardless of which
     workout/session it hangs off. This is what makes the import
     incremental: only days Kay has not yet logged for that exercise (by
     any route -- app or a previous Gainsfire import) produce new rows.
  3. Attaches new sets to Kay's CURRENT workouts (name starts with
     --workout-prefix, default "FB26") instead of creating new workouts:
       - if the target day already has a session on one of those workouts,
         the new sets join that session, continuing set_index after
         whatever sets that exercise already has there;
       - otherwise a new session is created on whichever prefixed workout's
         template contains the most of that day's mapped exercises (ties
         broken by workout name so the choice is reproducible);
       - if none of that day's exercises appear in any prefixed workout's
         template, the day is skipped and reported -- never guessed.
  4. Ids are fresh UUIDs (uuid4), not the deterministic uuid5 scheme the
     full-history converter uses: that scheme exists so a full-history
     re-run is idempotent, which does not apply here since we already
     dropped anything that would collide with existing data in step 2.

The two known Gainsfire pitfalls (see PROCESS_LOG.md, 2026-09-02):
  - the export can carry the same real-world set under two different
    Gainsfire spellings that both map to one app exercise -- handled by
    grouping rows by their MAPPED exercise_id (never the raw Gainsfire
    name) before assigning set_index, exactly like the full-history
    converter.
  - numbering must run AFTER mapping for the same reason (two names -> one
    exercise on the same day must not collide on set_index).

This format has no warm-up marker (checked: no "warm" text anywhere in a
2026-09-18 export), so is_warmup is always 0, matching what the existing
converters do.
"""
import argparse
import csv
import json
import os
import sqlite3
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

DELETED_PLAN = 'Entfernter Plan'

# Gainsfire exports a day, not a time. Imported sets are spaced this far apart
# so a session gets a plausible length -- all at one instant made the
# dashboard's "Avg duration" meaningless.
SET_SPACING = timedelta(seconds=150)
SESSION_WRAP_UP = timedelta(minutes=5)


def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def load_mapping(path):
    out = {}
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            if line.strip():
                gainsfire, source = line.rstrip('\n').split('\t')
                out[gainsfire.strip().lower()] = source
    return out


def read_export(directory, mapping, by_source):
    """-> rows [(day, exercise_id, set_no, reps, weight, plan)] plus per-file
    stats [(filename, gainsfire_name, source_name, exercise_id, total_rows)],
    plus what went missing."""
    rows, unmapped, missing, file_stats = [], set(), set(), []
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
        file_rows = 0
        with open(os.path.join(directory, filename), encoding='utf-8-sig') as fh:
            for row in csv.DictReader(fh):
                day = datetime.strptime(row['Date'], '%d/%m/%Y').date().isoformat()
                rows.append((day, exercise_id, int(row['Set']), int(row['Reps/Seconds']),
                             float(row['Weight']), row.get('Plan', '').strip()))
                file_rows += 1
        file_stats.append((filename, gainsfire, source, exercise_id, file_rows))
    return rows, unmapped, missing, file_stats


def existing_days(db, exercise_ids):
    """-> {(exercise_id, 'YYYY-MM-DD')} already covered by a non-deleted set."""
    if not exercise_ids:
        return set()
    placeholders = ', '.join('?' for _ in exercise_ids)
    cur = db.execute(
        f"SELECT DISTINCT exercise_id, date(performed_at) FROM sets "
        f"WHERE deleted_at IS NULL AND exercise_id IN ({placeholders})",
        list(exercise_ids),
    )
    return {(eid, day) for eid, day in cur.fetchall()}


def prefixed_workouts(db, prefix):
    """-> {workout_id: {'name':..., 'exercise_ids': set(...)}} for
    non-deleted workouts whose name starts with prefix, with their
    non-deleted template exercise ids."""
    workouts = {}
    for wid, name in db.execute(
        "SELECT id, name FROM workouts WHERE deleted_at IS NULL AND name LIKE ? ORDER BY name",
        (prefix + '%',),
    ):
        if not name.startswith(prefix):  # LIKE with plain %/_ chars is a coarse pre-filter
            continue
        exercise_ids = {
            eid for (eid,) in db.execute(
                "SELECT exercise_id FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL",
                (wid,),
            )
        }
        workouts[wid] = {'name': name, 'exercise_ids': exercise_ids}
    return workouts


def workout_exercise_id(db, workout_id, exercise_id):
    row = db.execute(
        "SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ? AND deleted_at IS NULL",
        (workout_id, exercise_id),
    ).fetchone()
    return row[0] if row else None


def session_on_day(db, day, workout_ids):
    """-> (session_id, workout_id, workout_name) or None for an existing
    non-deleted session on `day` belonging to one of `workout_ids`."""
    if not workout_ids:
        return None
    placeholders = ', '.join('?' for _ in workout_ids)
    rows = db.execute(
        f"SELECT s.id, s.workout_id, w.name FROM sessions s JOIN workouts w ON w.id = s.workout_id "
        f"WHERE s.deleted_at IS NULL AND w.deleted_at IS NULL AND date(s.started_at) = ? "
        f"AND s.workout_id IN ({placeholders})",
        [day] + list(workout_ids),
    ).fetchall()
    return rows  # caller decides how to handle 0 / 1 / many


def parse_iso(value):
    return datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)


def fmt_iso(value):
    return value.strftime('%Y-%m-%dT%H:%M:%SZ')


def session_clock(db, session_id):
    """-> (time after the session's last logged set, ended_at is NULL).
    New sets joining an existing session continue from where it stopped --
    stamping them at a fixed hour stretched a morning session into the
    evening."""
    started, ended = db.execute(
        'SELECT started_at, ended_at FROM sessions WHERE id = ?', (session_id,)
    ).fetchone()
    last = db.execute(
        'SELECT MAX(performed_at) FROM sets WHERE session_id = ? AND deleted_at IS NULL', (session_id,)
    ).fetchone()[0]
    return parse_iso(last or started), ended is None


def next_set_index(db, session_id, exercise_id):
    row = db.execute(
        "SELECT MAX(set_index) FROM sets WHERE session_id = ? AND exercise_id = ? AND deleted_at IS NULL",
        (session_id, exercise_id),
    ).fetchone()
    return 0 if row is None or row[0] is None else row[0] + 1


def pick_workout_for_day(workouts, day_exercise_ids):
    """-> (workout_id, matched_count, tie_candidates) choosing the prefixed
    workout whose template overlaps `day_exercise_ids` the most; ties
    broken by workout name for reproducibility."""
    scored = sorted(
        ((wid, len(info['exercise_ids'] & day_exercise_ids), info['name']) for wid, info in workouts.items()),
        key=lambda t: (-t[1], t[2]),
    )
    if not scored:
        return None, 0, []
    best_count = scored[0][1]
    tied = [name for wid, count, name in scored if count == best_count]
    return scored[0][0], best_count, tied


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('export_dir')
    parser.add_argument('db_path')
    parser.add_argument('out_path')
    parser.add_argument('--workout-prefix', default='FB26',
                         help='only workouts whose name starts with this are import targets (default: FB26)')
    parser.add_argument('--session-hour', type=int, default=18,
                         help='hour of day (UTC) used for performed_at/started_at of newly created rows (default: 18)')
    args = parser.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    mapping = load_mapping(os.path.join(here, 'gainsfire-mapping.tsv'))

    db = sqlite3.connect(args.db_path)
    by_source = {name: eid for eid, name in
                 db.execute('SELECT id, name FROM exercises WHERE deleted_at IS NULL')}

    rows, unmapped, missing, file_stats = read_export(args.export_dir, mapping, by_source)
    if unmapped:
        print('Not in gainsfire-mapping.tsv:', file=sys.stderr)
        for name in sorted(unmapped):
            print(f'  {name}', file=sys.stderr)
    if missing:
        print('Mapped to a source name the target database does not have:', file=sys.stderr)
        for line in sorted(missing):
            print(f'  {line}', file=sys.stderr)
        db.close()
        return 1
    if unmapped:
        db.close()
        return 1

    all_exercise_ids = {r[1] for r in rows}
    already = existing_days(db, all_exercise_ids)
    new_rows = [r for r in rows if (r[1], r[0]) not in already]

    # All of a day's exercises (new or already-logged) decide which workout
    # the day belongs to -- an exercise already skipped that day is still
    # evidence of which workout was trained.
    day_all_exercises = defaultdict(set)
    for day, exercise_id, *_ in rows:
        day_all_exercises[day].add(exercise_id)

    # New rows grouped by day, then by exercise (mapped id, not raw name --
    # the collision pitfall from PROCESS_LOG).
    new_by_day = defaultdict(lambda: defaultdict(list))
    for day, exercise_id, set_no, reps, weight, plan in new_rows:
        new_by_day[day][exercise_id].append((set_no, reps, weight))

    workouts = prefixed_workouts(db, args.workout_prefix)
    if not workouts:
        print(f'No non-deleted workout starts with "{args.workout_prefix}" -- nothing to attach to.', file=sys.stderr)
        db.close()
        return 1

    sessions_out = {}
    sets_out = []
    day_reports = []
    skipped_days = []
    stamp = now_iso()

    for day in sorted(new_by_day):
        day_exercises = new_by_day[day]
        candidates = session_on_day(db, day, list(workouts.keys()))

        if candidates:
            if len(candidates) > 1:
                names = ', '.join(f'{n} ({sid})' for sid, _wid, n in candidates)
                print(f'{day}: multiple {args.workout_prefix}* sessions exist ({names}); '
                      f'using the first.', file=sys.stderr)
            session_id, workout_id, workout_name = candidates[0]
            created_session = False
            clock, left_open = session_clock(db, session_id)
        else:
            workout_id, matched, tied = pick_workout_for_day(workouts, day_all_exercises[day])
            if workout_id is None or matched == 0:
                skipped_days.append(day)
                print(f'{day}: no exercise matches any {args.workout_prefix}* workout template -- skipped.',
                      file=sys.stderr)
                continue
            if len(tied) > 1:
                print(f'{day}: tie between {tied} on {matched} matching exercise(s); '
                      f'picked "{workouts[workout_id]["name"]}".', file=sys.stderr)
            workout_name = workouts[workout_id]['name']
            session_id = str(uuid.uuid4())
            clock = datetime.strptime(f'{day}T{args.session_hour:02d}:00:00Z', '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
            left_open = False
            sessions_out[session_id] = {
                'id': session_id, 'workout_id': workout_id,
                'started_at': fmt_iso(clock),
                'ended_at': None,  # set after the day's sets, below
                'note': 'Imported from Gainsfire',
                'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
            }
            created_session = True

        imported_this_day = []
        for exercise_id, entries in day_exercises.items():
            we_id = workout_exercise_id(db, workout_id, exercise_id)
            if we_id is None:
                print(f'{day}: exercise {exercise_id} has new sets but is not in '
                      f'"{workout_name}" -- importing without a workout_exercise link.', file=sys.stderr)
            start_index = next_set_index(db, session_id, exercise_id) if not created_session else 0
            entries.sort(key=lambda e: e[0])  # by Gainsfire's own Set number
            for offset, (set_no, reps, weight) in enumerate(entries):
                clock += SET_SPACING
                sets_out.append({
                    'id': str(uuid.uuid4()),
                    'session_id': session_id, 'exercise_id': exercise_id,
                    'workout_exercise_id': we_id, 'set_index': start_index + offset,
                    'weight_kg': weight, 'reps': reps,
                    'is_warmup': 0, 'rpe': None,
                    'performed_at': fmt_iso(clock),
                    'created_at': stamp, 'updated_at': stamp, 'deleted_at': None,
                })
            imported_this_day.append((exercise_id, len(entries)))

        # A session the app never finished would be offered for "resume" the
        # next time that workout is started. Once a past day's sets are all in,
        # close it; a new session gets its end the same way.
        wrap_up = fmt_iso(clock + SESSION_WRAP_UP)
        if created_session:
            sessions_out[session_id]['ended_at'] = wrap_up
        elif left_open and day < stamp[:10]:
            sessions_out[session_id] = {'id': session_id, 'ended_at': wrap_up, 'updated_at': stamp}

        day_reports.append({
            'day': day, 'session_id': session_id, 'workout': workout_name,
            'created_session': created_session, 'exercises': imported_this_day,
        })

    with open(args.out_path, 'w', encoding='utf-8') as fh:
        json.dump({
            'exported_at': stamp,
            'source': 'gainsfire-incremental',
            'tables': {
                'sessions': list(sessions_out.values()),
                'sets': sets_out,
            },
        }, fh, ensure_ascii=False, indent=2)

    print(f'sessions (new)  {len(sessions_out)}')
    print(f'sets (new)      {len(sets_out)}')
    print()
    for filename, gainsfire, source, exercise_id, total in file_stats:
        n_new = sum(1 for r in new_rows if r[1] == exercise_id)
        print(f'{filename}: {total} rows total, {n_new} new  [{gainsfire} -> {source}]')
    print()
    for rep in day_reports:
        tag = 'new session' if rep['created_session'] else 'existing session'
        ex_summary = ', '.join(f'{eid[:8]}x{n}' for eid, n in rep['exercises'])
        print(f'{rep["day"]}: {tag} {rep["session_id"]} on "{rep["workout"]}" -- {ex_summary}')
    if skipped_days:
        print()
        print('Skipped days (no matching workout):', ', '.join(skipped_days))

    db.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
