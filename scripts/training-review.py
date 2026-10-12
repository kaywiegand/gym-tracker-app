#!/usr/bin/env python3
"""Build a standalone review page for the last N weeks of training.

    python3 scripts/training-review.py <db> <out.html> [--weeks 13] [--today YYYY-MM-DD]

<db> is a backup of the live database (deploy/backup.sh). The page holds
its data inline and needs no server: weekly consistency, weekly sets per
muscle region against the app's volume targets, and for every exercise of
the current training days (workouts whose name starts with --prefix) its
e1RM trend, rep-range hit rate and a concrete target for the next session.

The next-session target is plain double progression on the workout's rep
range: add weight once every set reaches the top of the range, otherwise
keep the weight and add reps; drop the weight when most sets fall below
the range.
"""
import argparse
import csv
import json
import os
import sqlite3
import statistics
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
REGION_LABEL = {'chest': 'Brust', 'back': 'Rücken', 'shoulders': 'Schultern',
                'arms': 'Arme', 'legs': 'Beine', 'core': 'Core'}
WEEKDAYS = ['Monday', 'Wendsday', 'Friday']  # spelled as the workouts are named
DAY_LABEL = {'Monday': 'Montag', 'Wendsday': 'Mittwoch', 'Friday': 'Freitag'}


def titles(db_path):
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as tmp:
        out = tmp.name
    subprocess.run(['php', os.path.join(HERE, 'export-exercise-titles.php'), db_path, out],
                   check=True, capture_output=True)
    with open(out, encoding='utf-8') as fh:
        mapping = {r['id']: r for r in csv.DictReader(fh)}
    os.unlink(out)
    return mapping


def e1rm(kg, reps):
    return kg * (1 + reps / 30)


def fmt_kg(kg):
    return f'{kg:g}'.replace('.', ',')


def step_for(equipment):
    return 2.5 if equipment in ('barbell', 'dumbbell', 'e-z curl bar') else None


def working_set(sessions, low):
    """-> (weight, reps, date) to progress from.

    Not simply the last session: a deliberately light day (or a single
    top set) would turn into the new baseline. Looks at the last four
    sessions and takes the heaviest weight that was done for at least two
    sets with a median inside the range, at its most recent occurrence.
    Falls back to the last session's most used weight.
    """
    best = None
    for s in sessions[-4:]:
        by_kg = defaultdict(list)
        for r, kg in s['sets']:
            by_kg[kg].append(r)
        for kg, reps in by_kg.items():
            if len(reps) >= 2 and statistics.median(reps) >= low and (best is None or kg >= best[0]):
                best = (kg, reps, s['date'])
    if best:
        return best
    last = sessions[-1]
    weights = Counter(kg for _, kg in last['sets'])
    work = max(weights, key=lambda k: (weights[k], k))
    return work, [r for r, kg in last['sets'] if kg == work], last['date']


def next_target(sessions, low, high, equipment, today):
    """-> (headline, detail) for the next session: double progression on low..high."""
    work, reps, when = working_set(sessions, low)
    days_ago = (today - date.fromisoformat(sessions[-1]['date'])).days
    step = step_for(equipment)
    up = f'{fmt_kg(work + step)} kg' if step and work > 0 else f'eine Stufe über {fmt_kg(work)} kg'
    n = max(len(reps), 3)

    if work == 0:
        goal = ' / '.join(str(min(r + 1, high + 4)) for r in reps)
        return f'Körpergewicht × {goal}', 'Jeder Satz eine Wiederholung mehr als zuletzt.'
    if days_ago > 21:
        back = round(work * 0.9 / 2.5) * 2.5
        return (f'{fmt_kg(back)} kg × {n}×{low + 2}',
                f'{days_ago} Tage Pause bei dieser Übung: mit etwa 10 % weniger wieder einsteigen.')
    if all(r >= high for r in reps):
        return f'{up} × {n}×{low}–{low + 2}', f'Alle Sätze bei {high}+ Wiederholungen ({fmt_kg(work)} kg): Gewicht steigern.'
    if statistics.median(reps) < low:
        down = f'{fmt_kg(round(work * 0.9 / 2.5) * 2.5)} kg' if step else f'eine Stufe unter {fmt_kg(work)} kg'
        return (f'{down} × {n}×{low + 2}',
                f'Zuletzt {"/".join(map(str, reps))} bei {fmt_kg(work)} kg: unter dem Bereich {low}–{high}. '
                f'Leichter, dafür saubere {low + 2}er, dann hocharbeiten.')
    goal = sorted(reps, reverse=True)
    goal[-1] += 1  # the weakest set gets the extra rep first
    goal = sorted((min(r, high) for r in goal), reverse=True)
    while len(goal) < 3:
        goal.append(goal[-1])
    return (f'{fmt_kg(work)} kg × {" / ".join(map(str, goal))}',
            f'Basis {sd_iso(when)}: {"/".join(map(str, reps))}. Gewicht halten, Wiederholungen aufbauen; '
            f'erst bei {len(goal)}×{high} auf {up}.')


def sd_iso(iso):
    return f'{iso[8:10]}.{iso[5:7]}.'


def build(db_path, weeks, today, prefix):
    db = sqlite3.connect(db_path)
    title_of = titles(db_path)
    monday = today - timedelta(days=today.weekday())
    start = monday - timedelta(weeks=weeks - 1)
    start_iso = start.isoformat()

    mode = dict(db.execute('SELECT id, rep_low FROM training_modes')), dict(db.execute('SELECT id, rep_high FROM training_modes'))
    core_range = db.execute("SELECT rep_low, rep_high FROM training_modes WHERE key = 'endurance'").fetchone() or (11, 16)

    # --- weekly consistency -------------------------------------------------
    per_day = {}
    for day, n, vol in db.execute(
            """SELECT date(t.performed_at), COUNT(*), SUM(t.reps * t.weight_kg) FROM sets t
               JOIN sessions s ON s.id = t.session_id AND s.deleted_at IS NULL
               WHERE t.deleted_at IS NULL AND t.is_warmup = 0 AND date(t.performed_at) >= ?
               GROUP BY 1""", (start_iso,)):
        per_day[day] = (n, vol or 0)
    week_rows = []
    for i in range(weeks):
        ws = start + timedelta(weeks=i)
        days = [d for d in per_day if ws <= date.fromisoformat(d) < ws + timedelta(days=7)]
        week_rows.append({'week': ws.isoformat(), 'sessions': len(days),
                          'sets': sum(per_day[d][0] for d in days),
                          'volume': round(sum(per_day[d][1] for d in days)),
                          'days': sorted(days)})
    train_days = sorted(per_day)
    gaps = [(a, b, (date.fromisoformat(b) - date.fromisoformat(a)).days)
            for a, b in zip(train_days, train_days[1:])]
    long_gaps = [{'from': a, 'to': b, 'days': n} for a, b, n in gaps if n >= 8]

    # --- weekly sets per region ----------------------------------------------
    region_sets = defaultdict(float)
    for region, weight, n in db.execute(
            """SELECT m.region, em.weight, COUNT(*) FROM sets t
               JOIN exercise_muscles em ON em.exercise_id = t.exercise_id
               JOIN muscles m ON m.id = em.muscle_id
               WHERE t.deleted_at IS NULL AND t.is_warmup = 0 AND date(t.performed_at) >= ?
               GROUP BY 1, 2""", (start_iso,)):
        region_sets[region] += weight * n
    targets = {r: (mev, mav, mrv) for r, mev, mav, mrv in db.execute('SELECT region, mev, mav, mrv FROM muscle_volume_targets')}
    regions = []
    for region in ['chest', 'back', 'shoulders', 'arms', 'legs', 'core']:
        mev, mav, mrv = targets.get(region, (0, 0, 0))
        avg = round(region_sets[region] / weeks, 1)
        regions.append({'key': region, 'label': REGION_LABEL[region], 'avg': avg,
                        'mev': mev, 'mav': mav, 'mrv': mrv,
                        'status': 'low' if avg < mev else ('high' if avg > mrv else 'ok')})

    # --- per training day ------------------------------------------------------
    days_out = []
    for wd in WEEKDAYS:
        row = db.execute('SELECT id, mode_id FROM workouts WHERE name = ? AND deleted_at IS NULL',
                         (f'{prefix} {wd}',)).fetchone()
        if not row:
            continue
        wid, mode_id = row
        low_default, high_default = mode[0].get(mode_id, 6), mode[1].get(mode_id, 10)
        done = db.execute("""SELECT COUNT(DISTINCT date(started_at)) FROM sessions s
                             WHERE workout_id = ? AND deleted_at IS NULL AND date(started_at) >= ?
                               AND EXISTS (SELECT 1 FROM sets t WHERE t.session_id = s.id AND t.deleted_at IS NULL)""",
                          (wid, start_iso)).fetchone()[0]
        exercises = []
        for eid, planned, lo, hi, equipment in db.execute(
                """SELECT we.exercise_id, we.planned_sets, we.rep_low_override, we.rep_high_override, e.equipment
                   FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
                   WHERE we.workout_id = ? AND we.deleted_at IS NULL ORDER BY we.position""", (wid,)):
            low, high = lo or low_default, hi or high_default
            if title_of[eid]['primary_muscle'] == 'Abdominals' and not lo:
                low, high = core_range  # core work runs on the endurance range, not the workout's
            by_day = defaultdict(list)
            for d, reps, kg in db.execute(
                    """SELECT date(performed_at), reps, weight_kg FROM sets
                       WHERE exercise_id = ? AND deleted_at IS NULL AND is_warmup = 0
                         AND date(performed_at) >= ? ORDER BY performed_at, set_index""", (eid, start_iso)):
                by_day[d].append((reps, kg))
            sessions = [{'date': d, 'sets': v,
                         'best': round(max(e1rm(kg, r) for r, kg in v), 1),
                         'top': max(kg for _, kg in v)} for d, v in sorted(by_day.items())]
            info = title_of[eid]
            entry = {'title': info['title'], 'subtitle': info['subtitle'], 'muscle': info['primary_muscle'],
                     'planned': planned, 'low': low, 'high': high, 'sessions': sessions}
            all_reps = [r for s in sessions for r, _ in s['sets']]
            if all_reps:
                n = len(all_reps)
                entry['range'] = {'below': round(100 * sum(r < low for r in all_reps) / n),
                                  'in': round(100 * sum(low <= r <= high for r in all_reps) / n),
                                  'above': round(100 * sum(r > high for r in all_reps) / n)}
            # e1RM says nothing once a session ran without load (leg raises: 10 kg, then none)
            bodyweight = sessions and any(s['best'] == 0 for s in sessions)
            if len(sessions) >= 4 and not bodyweight:
                k = min(3, len(sessions) // 2)
                first = statistics.mean(s['best'] for s in sessions[:k])
                last = statistics.mean(s['best'] for s in sessions[-k:])
                pct = round((last - first) / first * 100, 1) if first else 0
                entry['trend'] = pct
                entry['status'] = 'up' if pct > 2.5 else ('down' if pct < -2.5 else 'flat')
            else:
                entry['status'] = 'few'
            if sessions:
                entry['next'], entry['why'] = next_target(sessions, low, high, equipment, today)
                entry['last_days'] = (today - date.fromisoformat(sessions[-1]['date'])).days
            else:
                entry['next'], entry['why'] = 'Einstiegsgewicht finden', 'In den letzten Wochen nicht trainiert.'
            exercises.append(entry)
        days_out.append({'key': wd, 'label': DAY_LABEL[wd], 'workout': f'{prefix} {wd}',
                         'done': done, 'exercises': exercises})

    # --- body ---------------------------------------------------------------------
    body = []
    wanted = {('Muskel-Fett Analyse', 'Gewicht'): 'weight', ('Muskel-Fett Analyse', 'Skelettmuskelmasse'): 'smm',
              ('Muskel-Fett Analyse', 'Körperfettmasse'): 'fat',
              ('Adipositas-Analyse (Kennzahlen)', 'Anteil an Körperfett (%)'): 'fat_pct'}
    for mid, when in db.execute("SELECT id, date(measured_at) FROM bia_measurements WHERE deleted_at IS NULL "
                                "ORDER BY measured_at DESC LIMIT 2"):
        scan = {'date': when}
        for cat, metric, val in db.execute('SELECT category, metric, value_num FROM bia_values WHERE measurement_id = ?', (mid,)):
            if (cat, metric) in wanted:
                scan[wanted[(cat, metric)]] = val
        body.append(scan)
    body.reverse()
    bw = db.execute("SELECT date(measured_at), weight_kg FROM bodyweight WHERE deleted_at IS NULL "
                    "ORDER BY measured_at DESC LIMIT 1").fetchone()

    trained_weeks = [w for w in week_rows if w['sessions']]
    return {
        'today': today.isoformat(), 'start': start_iso, 'weeks': weeks,
        'year_end_weeks': round((date(today.year, 12, 31) - today).days / 7),
        'weekly': week_rows, 'gaps': long_gaps, 'regions': regions, 'days': days_out,
        'body': body, 'bodyweight': {'date': bw[0], 'kg': bw[1]} if bw else None,
        'kpi': {'sessions': len(train_days), 'per_week': round(len(train_days) / weeks, 1),
                'full_weeks': sum(w['sessions'] >= 3 for w in week_rows),
                'empty_weeks': sum(w['sessions'] == 0 for w in week_rows),
                'avg_sets': round(statistics.mean(w['sets'] for w in trained_weeks)) if trained_weeks else 0},
        'today_key': {0: 'Monday', 2: 'Wendsday', 4: 'Friday'}.get(today.weekday(), 'Monday'),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('db')
    parser.add_argument('out')
    parser.add_argument('--weeks', type=int, default=13)
    parser.add_argument('--today', default=date.today().isoformat())
    parser.add_argument('--prefix', default='FB26')
    args = parser.parse_args()

    data = build(args.db, args.weeks, date.fromisoformat(args.today), args.prefix)
    template = open(os.path.join(HERE, 'training-review.template.html'), encoding='utf-8').read()
    html = template.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write(html)
    k = data['kpi']
    print(f"{data['start']} .. {data['today']}: {k['sessions']} training days, {k['per_week']}/week, "
          f"{len(data['days'])} training day tabs")
    return 0


if __name__ == '__main__':
    sys.exit(main())
