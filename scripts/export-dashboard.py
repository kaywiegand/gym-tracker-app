#!/usr/bin/env python3
"""Feed the standalone HTML dashboard with the app's data.

    python3 scripts/export-dashboard.py <db> <template.html> <out.html> [--csv <training.csv>] [--legacy <old.html>]

<db>         a backup of the live database (deploy/backup.sh -> backups/<id>/fitness.db)
<template>   the dashboard HTML; only its `const RAW=...;` block is replaced
<out.html>   the refreshed dashboard
--legacy     an older dashboard whose RAW rows fill what the app never imported
             (early Gainsfire history). Per (day, exercise) the app wins; a
             legacy exercise name is matched through scripts/gainsfire-mapping.tsv.
--csv        also write the training sets as a flat CSV in the dashboard's
             original export format (Datum, Uebung, Muskelgruppe, ...)

The dashboard computes everything from RAW in the browser:
  exMeta  [[name, muscle group, movement pattern], ...]
  rows    [[date, exMeta index, reps, kg], ...]            one entry per set
  bia     [{date, weight, smm, ..., train8w{...}}, ...]    one per body scan

Weights go in exactly as logged -- no pound repair here (see BACKLOG #75).
"""
import csv
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
from collections import defaultdict
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))

# App primary muscle -> (dashboard group, pattern). Same vocabulary the
# dashboard already uses; rear-delt work counts as back, like before.
MUSCLE_GROUP = {
    'Chest': ('Brust', 'Druck'),
    'Lats': ('Rücken', 'Zug'),
    'Middle Back': ('Rücken', 'Zug'),
    'Traps': ('Rücken', 'Zug'),
    'Lower Back': ('unt. Rücken', 'Zug'),
    'Shoulders': ('Schultern', 'Druck'),
    'Biceps': ('Bizeps', 'Zug'),
    'Triceps': ('Trizeps', 'Druck'),
    'Quadriceps': ('Beine', 'Beine'),
    'Hamstrings': ('Beine', 'Beine'),
    'Glutes': ('Beine', 'Beine'),
    'Calves': ('Beine', 'Beine'),
    'Abductors': ('Beine', 'Beine'),
    'Adductors': ('Beine', 'Beine'),
    'Abdominals': ('Core', 'Core'),
}
REAR_DELT = re.compile(r'rear[- ]delt|reverse (machine )?fly|reverse pec|face pull', re.I)

BIA = {  # dashboard key -> (category, subcategory, metric)
    'weight': ('Körperzusammensetzungsanalyse', '', 'Gewicht (kg)'),
    'smm': ('Muskel-Fett Analyse', '', 'Skelettmuskelmasse'),
    'bf_pct': ('Adipositas-Analyse (Kennzahlen)', '', 'Anteil an Körperfett (%)'),
    'bf_mass': ('Muskel-Fett Analyse', '', 'Körperfettmasse'),
    'bmi': ('Adipositas-Analyse (Kennzahlen)', '', 'BMI'),
    'fitness': ('Fitnessbewertung', '', 'Punktzahl'),
    'protein': ('Körperzusammensetzungsanalyse', 'Proteine (kg)', 'Wert'),
    'water': ('Körperzusammensetzungsanalyse', 'Gesamtkörperwasser (L)', 'Wert'),
    'ffm': ('Körperzusammensetzungsanalyse', '', 'Fettfreie Masse (kg)'),
    'whr': ('Adipositas-Analyse (Kennzahlen)', '', 'Taille-Hüfte-Verhältnis'),
    'bmr': ('Forschungsdaten', '', 'Grundumsatz (kcal)'),
    'visfat': ('Forschungsdaten', '', 'Viszeraler Fettbereich'),
    'trunk_musc': ('Segmentanalyse (Muskel kg / %)', 'Rumpf', 'kg'),
}


def titles(db_path):
    """exercise id -> normalized title, from the app's own naming code."""
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as tmp:
        out = tmp.name
    subprocess.run(['php', os.path.join(HERE, 'export-exercise-titles.php'), db_path, out],
                   check=True, capture_output=True)
    with open(out, encoding='utf-8') as fh:
        mapping = {r['id']: r['title'] for r in csv.DictReader(fh)}
    os.unlink(out)
    return mapping


def load_sets(db, title_of):
    cur = db.execute("""
        SELECT date(t.performed_at), e.id, e.name, t.set_index, t.reps, t.weight_kg,
               COALESCE(w.name, ''),
               (SELECT mu.name_en FROM exercise_muscles em JOIN muscles mu ON mu.id = em.muscle_id
                 WHERE em.exercise_id = e.id AND em.role = 'primary' ORDER BY mu.sort LIMIT 1)
        FROM sets t
        JOIN exercises e ON e.id = t.exercise_id
        JOIN sessions s ON s.id = t.session_id AND s.deleted_at IS NULL
        LEFT JOIN workouts w ON w.id = s.workout_id
        WHERE t.deleted_at IS NULL AND t.is_warmup = 0 AND t.reps IS NOT NULL AND t.weight_kg IS NOT NULL
        ORDER BY t.performed_at, t.set_index""")
    out = []
    for day, eid, source_name, idx, reps, kg, plan, muscle in cur:
        title = title_of.get(eid) or source_name
        group, pattern = MUSCLE_GROUP.get(muscle, ('Sonstige', 'Sonstige'))
        if group == 'Schultern' and REAR_DELT.search(source_name):
            group, pattern = 'Rücken (hint. Schulter)', 'Zug'
        out.append((day, title, group, pattern, idx + 1, int(reps), float(kg), plan))
    return out


def legacy_sets(path, db, title_of, have):
    """Sets from an older dashboard's RAW that the app does not hold for that (day, exercise)."""
    html = open(path, encoding='utf-8').read()
    start = html.index('const RAW=') + len('const RAW=')
    legacy = json.loads(html[start:html.index(';\nconst F=', start)])
    mapping = {}
    with open(os.path.join(HERE, 'gainsfire-mapping.tsv'), encoding='utf-8') as fh:
        for line in fh:
            if '\t' in line:
                k, v = line.rstrip('\n').split('\t')
                mapping[k.strip().lower()] = v
    by_source = {n: i for i, n in db.execute('SELECT id, name FROM exercises WHERE deleted_at IS NULL')}
    muscle = dict(db.execute("""SELECT em.exercise_id, mu.name_en FROM exercise_muscles em
                                JOIN muscles mu ON mu.id = em.muscle_id WHERE em.role='primary'"""))
    out = []
    for day, ei, reps, kg in legacy['rows']:
        name, group, pattern = legacy['exMeta'][ei]
        eid = by_source.get(mapping.get(name.strip().lower(), ''))
        if eid:
            title = title_of.get(eid, name)
            group, pattern = MUSCLE_GROUP.get(muscle.get(eid), (group, pattern))
            if group == 'Schultern' and REAR_DELT.search(name):
                group, pattern = 'Rücken (hint. Schulter)', 'Zug'
        else:
            title = name
        if (day, title) in have:
            continue
        out.append((day, title, group, pattern, 0, int(reps), float(kg), ''))
    return out


def build_raw(sets, db):
    names = sorted({(s[1], s[2], s[3]) for s in sets}, key=lambda x: x[0].lower())
    index = {n[0]: i for i, n in enumerate(names)}
    rows = [[s[0], index[s[1]], float(s[5]), s[6]] for s in sets]

    by_day = defaultdict(list)
    for s in sets:
        by_day[s[0]].append((s[5], s[6]))

    bia = []
    scans = db.execute("SELECT id, date(measured_at) FROM bia_measurements WHERE deleted_at IS NULL ORDER BY measured_at").fetchall()
    for mid, day in scans:
        entry = {'date': day}
        for key, (cat, sub, metric) in BIA.items():
            r = db.execute("SELECT value_num FROM bia_values WHERE measurement_id=? AND category=? "
                           "AND IFNULL(subcategory,'')=? AND metric=?", (mid, cat, sub, metric)).fetchone()
            entry[key] = r[0] if r else None
        d = date.fromisoformat(day)
        days = [x for x in by_day if d - timedelta(days=56) <= date.fromisoformat(x) <= d]
        if days:
            vols = [sum(r * w for r, w in by_day[x]) for x in days]
            reps = sum(r for x in days for r, _ in by_day[x])
            entry['train8w'] = {'sessions': len(days), 'avgVol': round(sum(vols) / len(vols)),
                                'perWeek': round(len(days) / 8, 2),
                                'avgLoad': round(sum(vols) / reps, 1) if reps else None}
        bia.append(entry)

    days = sorted(by_day)
    return {'exMeta': [list(n) for n in names], 'rows': rows, 'bia': bia,
            'minDate': days[0], 'maxDate': days[-1]}


def write_csv(path, sets):
    with open(path, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['Datum', 'Uebung', 'Muskelgruppe', 'Bewegungsmuster', 'Satz', 'Wiederholungen',
                    'Gewicht_kg', 'Volumen_kg', 'geschaetztes_1RM_kg', 'Plan'])
        for day, title, group, pattern, n, reps, kg, plan in sets:
            w.writerow([day, title, group, pattern, n, reps, kg, round(reps * kg, 1),
                        round(kg * (1 + reps / 30), 1), plan or 'Entfernter Plan'])


def main(argv):
    csv_path = legacy = None
    if '--legacy' in argv:
        i = argv.index('--legacy')
        legacy = argv[i + 1]
        del argv[i:i + 2]
    if '--csv' in argv:
        i = argv.index('--csv')
        csv_path = argv[i + 1]
        del argv[i:i + 2]
    if len(argv) != 3:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        return 1
    db_path, template, out_path = argv
    db = sqlite3.connect(db_path)
    title_of = titles(db_path)
    sets = load_sets(db, title_of)
    if legacy:
        added = legacy_sets(legacy, db, title_of, {(s[0], s[1]) for s in sets})
        print(f'legacy sets added: {len(added)}')
        # renumber legacy sets per (day, exercise) so the CSV's Satz column stays meaningful
        counter = defaultdict(int)
        sets += [(d, t, g, p, (counter.__setitem__((d, t), counter[(d, t)] + 1) or counter[(d, t)]), r, k, pl)
                 for d, t, g, p, _, r, k, pl in added]
        sets.sort(key=lambda s: (s[0], s[1], s[4]))
    raw = build_raw(sets, db)

    html = open(template, encoding='utf-8').read()
    start = html.index('const RAW=')
    end = html.index(';\nconst F=', start)
    html = html[:start] + 'const RAW=' + json.dumps(raw, ensure_ascii=False, separators=(',', ':')) + html[end:]
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    if csv_path:
        write_csv(csv_path, sets)

    print(f"sets {len(raw['rows'])}  exercises {len(raw['exMeta'])}  days {len({s[0] for s in sets})}  "
          f"bia {len(raw['bia'])}  {raw['minDate']} .. {raw['maxDate']}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
