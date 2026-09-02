#!/usr/bin/env python3
"""Convert a Gainsfire training export into the app's backup JSON.

    python3 scripts/gainsfire-to-backup.py <export.csv> <all.tsv> <overrides.tsv> <out.json>

IMPORTANT -- <all.tsv> must be exported from the TARGET database, the one the
backup will be restored into. db/seed/exercises.php mints a fresh Uuid::v4()
for every exercise on every install, so the same exercise carries a different
id on every machine. Building the file against a dev database and restoring
it on the server leaves every set pointing at an id that does not exist
there, and the workouts come up empty.

The app has no training-data import; it does have Backup restore, which
upserts by id and leaves rows not in the file alone. So the migration rides
that already-tested path instead of adding an endpoint.

Two things the raw export needs before it can be trusted:

* Every set appears TWICE, under two spellings of the same exercise (e.g.
  "Leg Press Machine" and "Leg press" carry byte-identical rows). Importing
  as-is would double every volume figure. Duplicate name groups are detected
  by comparing the full set of (date, set, reps, weight) tuples -- an exact
  match on all of them is not a coincidence.
* Roughly a fifth of the rows carry the plan name "Entfernter Plan" (the
  plan was deleted in Gainsfire). Where the same DAY also has a real plan,
  those sets belong to it -- no day in the export has two real plans, so the
  assignment is unambiguous.

Ids are deterministic (UUIDv5 over a stable key), so re-running produces the
same ids and a second import updates instead of duplicating.
"""
import csv, io, json, sys, uuid
from collections import defaultdict

NS = uuid.UUID('6f5c1e2a-3b47-4d8e-9a10-2c7f5b6d8e90')
def uid(*parts): return str(uuid.uuid5(NS, '|'.join(parts)))

def norm(rows, header):
    return [r for r in rows if len(r) == len(header)]

def main(csv_path, all_tsv, overrides_tsv, out_path):
    rows = list(csv.reader(io.open(csv_path, encoding='utf-8-sig')))
    header, data = rows[0], norm(rows[1:], rows[0])
    C = {name: i for i, name in enumerate(header)}

    # --- exercise lookup -------------------------------------------------
    # Keyed by the app's display title, which is derived from the source data
    # and is therefore stable across installs -- unlike the row id.
    # <all.tsv> is "<source name>\t<id>" exported from the TARGET database.
    # Source names come from the seed data and are identical on every install;
    # ids are not.
    by_source = {}
    for line in io.open(all_tsv, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) != 2: continue
        by_source.setdefault(p[0], p[1])

    mapping = {}
    unresolved = []
    for line in io.open(overrides_tsv, encoding='utf-8'):
        if not line.strip(): continue
        gf, source_name = line.rstrip('\n').split('\t')
        if source_name in by_source:
            mapping[gf] = by_source[source_name]
        else:
            unresolved.append((gf, source_name))
    if unresolved:
        print(f'{len(unresolved)} mapping targets missing from the target database:')
        for gf, sn in unresolved:
            print(f'  {gf}  ->  {sn}')
        raise SystemExit(1)

    # --- drop duplicate spellings ---------------------------------------
    sig = defaultdict(set)
    for r in data:
        sig[r[C['Uebung']]].add((r[C['Datum']], r[C['Satz']], r[C['Wiederholungen']], r[C['Gewicht_kg']]))
    names = sorted(sig, key=lambda n: -len(sig[n]))
    canonical, seen = {}, set()
    for i, a in enumerate(names):
        if a in seen: continue
        canonical[a] = a; seen.add(a)
        for b in names[i + 1:]:
            if b not in seen and sig[a] == sig[b]:
                canonical[b] = a; seen.add(b)
    data = [r for r in data if canonical[r[C['Uebung']]] == r[C['Uebung']]]

    # --- one workout per plan, one session per day ----------------------
    real_plan_of_day = {}
    for r in data:
        plan = r[C['Plan']]
        if plan != 'Entfernter Plan':
            real_plan_of_day[r[C['Datum']]] = plan

    def plan_for(r):
        plan = r[C['Plan']]
        return real_plan_of_day.get(r[C['Datum']]) if plan == 'Entfernter Plan' else plan

    now = '2026-09-02T00:00:00Z'
    workouts, workout_exercises, sessions, sets_out = {}, {}, {}, []
    we_index = defaultdict(dict)   # workout_id -> exercise_id -> we row
    unmapped = defaultdict(int)

    by_day = defaultdict(list)
    for r in data: by_day[r[C['Datum']]].append(r)

    for day in sorted(by_day):
        plan = plan_for(by_day[day][0])
        workout_id = None
        if plan:
            workout_id = uid('workout', plan)
            workouts.setdefault(workout_id, {
                'id': workout_id, 'name': plan, 'mode_id': 2, 'notes': None, 'archived': 0,
                'created_at': now, 'updated_at': now, 'deleted_at': None,
            })

        session_id = uid('session', day)
        sessions[session_id] = {
            'id': session_id, 'workout_id': workout_id,
            'started_at': f'{day}T18:00:00Z', 'ended_at': f'{day}T19:15:00Z',
            'note': 'Imported from Gainsfire',
            'created_at': now, 'updated_at': now, 'deleted_at': None,
        }

        # Group AFTER mapping, not by the Gainsfire name: two names can map
        # to the same app exercise on the same day ("Cable rows" and "Rows
        # Cable"). Keying set ids by the export's own set number then made
        # them collide and silently overwrite each other -- 579 sets vanished
        # in the first run. Numbering restarts per (day, app exercise).
        per_exercise = defaultdict(list)
        for r in by_day[day]:
            exercise_id = mapping.get(r[C['Uebung']])
            if exercise_id is None:
                unmapped[r[C['Uebung']]] += 1
                continue
            per_exercise[exercise_id].append(r)

        for exercise_id, entries in per_exercise.items():
            we_id = None
            if workout_id:
                slot = we_index[workout_id]
                if exercise_id not in slot:
                    we_id = uid('we', workout_id, exercise_id)
                    slot[exercise_id] = {
                        'id': we_id, 'workout_id': workout_id, 'exercise_id': exercise_id,
                        'position': len(slot), 'planned_sets': len(entries),
                        'rep_low_override': None, 'rep_high_override': None, 'increment_override_kg': None,
                        'created_at': now, 'updated_at': now, 'deleted_at': None,
                    }
                    workout_exercises[we_id] = slot[exercise_id]
                else:
                    we_id = slot[exercise_id]['id']
                    slot[exercise_id]['planned_sets'] = max(slot[exercise_id]['planned_sets'], len(entries))

            entries.sort(key=lambda x: (x[C['Uebung']], int(x[C['Satz']])))
            for idx, r in enumerate(entries):
                sets_out.append({
                    'id': uid('set', day, exercise_id, str(idx)),
                    'session_id': session_id, 'exercise_id': exercise_id, 'workout_exercise_id': we_id,
                    'set_index': idx,
                    'weight_kg': float(r[C['Gewicht_kg']]), 'reps': int(r[C['Wiederholungen']]),
                    'is_warmup': 0, 'rpe': None, 'performed_at': f'{day}T18:00:00Z',
                    'created_at': now, 'updated_at': now, 'deleted_at': None,
                })

    payload = {
        'exported_at': now, 'source': 'gainsfire-migration',
        'tables': {
            'workouts': list(workouts.values()),
            'workout_exercises': list(workout_exercises.values()),
            'sessions': list(sessions.values()),
            'sets': sets_out,
        },
    }
    io.open(out_path, 'w', encoding='utf-8').write(json.dumps(payload, ensure_ascii=False))

    print(f'workouts           {len(workouts)}')
    print(f'workout_exercises  {len(workout_exercises)}')
    print(f'sessions           {len(sessions)}')
    print(f'sets               {len(sets_out)}')
    if unmapped:
        print(f'\nNICHT gemappt ({sum(unmapped.values())} Sätze):')
        for n, c in sorted(unmapped.items(), key=lambda x: -x[1]):
            print(f'  {c:4}  {n}')

if __name__ == '__main__':
    main(*sys.argv[1:5])
