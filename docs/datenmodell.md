# Datenmodell — Workout-Tracking-App

**Stand:** 13.08.2026 · **DB:** SQLite (eine Datei `fitness.db`) · **Gehört zu:** `workout-app-konzept.md`

Vollständiges Schema als Briefing für die Umsetzung. Ziel: modular, joinbar, sync-fähig, GitHub-tauglich. Maßgeblich für die Umsetzung ist zusätzlich die DDL in der Repo-`CLAUDE.md §6` (inkl. `hr_samples`, `body_measurements`, `settings.rest_seconds`).

---

## Konventionen

- **IDs:** `TEXT` (UUID, am Gerät erzeugt) für alles, was offline entstehen kann (Übungen, Workouts, Sessions, Sätze, Body/BIA, Media) → idempotenter Sync. `INTEGER` für reine Seed-Referenz (`muscles`, `training_modes`).
- **Zeitstempel:** `TEXT` im ISO-8601-Format, UTC (z. B. `2026-08-13T15:34:00Z`).
- **Sync-Felder** auf allen synchronisierten Tabellen: `updated_at` (Ordnung/Last-Write-Wins) und `deleted_at` (Soft-Delete; `NULL` = aktiv).
- **Einheiten:** metrisch, numerisch (`REAL`): `weight_kg`, `cm`.
- **Booleans:** `INTEGER` 0/1.
- **Fremdschlüssel** mit `ON DELETE`-Regeln; `PRAGMA foreign_keys = ON`.

---

## Referenz & Konfiguration

### `settings` (Key/Value)
`key TEXT PK`, `value TEXT`.
Seed: `unit_system=metric`, `default_increment_kg=2.5`, `rounding_kg=2.5`, `progression_trigger=all_sets` (alt. `last_set`), `rest_seconds=120`, `theme=dark`, `password_hash=…`.

### `training_modes`
`id INTEGER PK`, `key TEXT UNIQUE` (`max`/`hyp`/`ext`), `name`, `rep_low INT`, `rep_high INT` (Progressions-Trigger), `sort`.
Seed: max 3–5 · hyp 6–10 · ext 10–12. **Editierbar.**

### `muscles`
`id INTEGER PK`, `name_en`, `region` (`chest`/`back`/`shoulders`/`arms`/`legs`/`core`), `sort`. Seed: ~17 FEDB-Muskeln.

---

## Übungen

### `exercises`
`id TEXT PK`, `name`, `movement`, `equipment`, `mechanic` (`compound`/`isolation`), `category`, `default_increment_kg REAL NULL`, `source`, `external_id`, `created_at/updated_at/deleted_at`.

### `exercise_muscles` (n:m mit Rolle)
`exercise_id`, `muscle_id`, `role` (`primary`/`secondary`), `weight REAL` (1.0/0.5). PK (exercise_id, muscle_id).

### `media`
`id TEXT PK`, `kind` (`exercise_image`/`bia_photo`), `exercise_id NULL`, `bia_measurement_id NULL`, `path`, `mime`, `sort`, `created_at`.

---

## Workouts & Training

### `workouts` (Vorlage)
`id TEXT PK`, `name`, `mode_id INT` (liefert den Rep-Bereich), `notes`, `archived INT`, Sync-Felder.

### `workout_exercises` (Plan — **kein Zielgewicht**)
`id TEXT PK`, `workout_id`, `exercise_id`, `position INT`, `planned_sets INT`, `rep_low_override NULL`, `rep_high_override NULL`, `increment_override_kg NULL`, Sync-Felder. Index (workout_id, position).

### `sessions`
`id TEXT PK`, `workout_id NULL` (NULL = ad-hoc), `started_at`, `ended_at NULL`, `note`, Sync-Felder. Index (workout_id, started_at).

### `sets` (Ist — Quelle aller Statistiken)
`id TEXT PK` (am Gerät erzeugt), `session_id`, `exercise_id`, `workout_exercise_id NULL`, `set_index INT`, `weight_kg REAL`, `reps INT`, `is_warmup INT`, `rpe REAL NULL`, `performed_at`, Sync-Felder. Index (exercise_id, performed_at), (session_id).

---

## Körper & BIA

### `bodyweight`
`id TEXT PK`, `measured_at`, `weight_kg REAL`, `note`, Sync-Felder.

### `body_measurements` (Umfänge, spätere Stufe)
`id TEXT PK`, `measured_at`, `site TEXT`, `value_cm REAL`, `note`, Sync-Felder.

### `bia_measurements`
`id TEXT PK`, `measured_at` (Testzeit), `source`, `note`, Sync-Felder.

### `bia_values` (Long-Format — bildet den CSV-Export ab)
`id TEXT PK`, `measurement_id`, `category`, `subcategory NULL`, `metric`, `value_num REAL NULL`, `value_text TEXT NULL`, `unit NULL`, `ref_low NULL`, `ref_high NULL`. Index (measurement_id), (metric).

> Der vorhandene `FitnessExportBIA.csv` (Wide-Format, Datumsspalten) wird beim Import „umgedreht": pro Metrik × Messdatum eine `bia_values`-Zeile. So passt jeder zukünftige Report ohne Schemaänderung.

### `hr_samples` (HR-Import, spätere Stufe)
`id TEXT PK`, `session_id`, `ts`, `bpm INT`. Zuordnung aufs Training über absolute Zeit (Set-Timestamps ↔ HR-Zeitreihe).

---

## Progressions-Logik (Modul, Pseudocode)

Wird pro Übung beim Tracking aufgerufen; **schlägt vor**, ersetzt keine Eingabe.

```
range   = workout_exercise.override ?? workout.mode (rep_low..rep_high)
inc     = workout_exercise.increment_override
          ?? exercise.default_increment_kg
          ?? settings.default_increment_kg          // 2.5
last    = Arbeitssätze der letzten Session dieser Übung (is_warmup = 0)

if last ist leer:
    → kein Vorschlag (erste Erfassung, Werte manuell)
else if trigger erfüllt (alle Arbeitssätze reps >= range.high  [all_sets]
                         bzw. letzter Satz >= range.high        [last_set]):
    → Vorschlag: Gewicht = runde(last.weight + inc, rounding_kg), Reps-Ziel = range.low
else:
    → Vorschlag: Gewicht = last.weight (halten), Reps-Ziel = range.high

Immer zusätzlich: Felder mit last.weight / last.reps vorausfüllen (Progress sichtbar).
```

---

## Sync-Regeln (PHP-API ↔ Client)

- **Push:** Client sendet neue/geänderte Zeilen (UUID, `updated_at`, ggf. `deleted_at`).
- **Upsert per UUID:** existiert die UUID → Update, sonst Insert. Idempotent.
- **Konflikt:** Single-User → **Last-Write-Wins** über `updated_at`.
- **Pull:** Zeilen mit `updated_at` > letztem Sync-Stand (inkl. Soft-Deletes).
- **Reihenfolge:** Eltern vor Kindern (z. B. `sessions` vor `sets`).

---

## Seed-Daten (Stufe 1)

1. `training_modes` (max/hyp/ext), `muscles` (Taxonomie), `settings` (Defaults).
2. `exercises` + `exercise_muscles` + `media` aus **Free Exercise DB** (primär/sekundär → role, weight 1.0/0.5; `mechanic` = compound/isolation; `images[]` → media-Pfade).
3. Optional Testdaten: `bia_measurements`/`bia_values` aus `FitnessExportBIA.csv`.
