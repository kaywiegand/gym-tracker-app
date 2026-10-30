# 04 · Datenmodell

Quelle: `db/schema.sql`, Nachzügler per `ALTER TABLE` in `db/migrate.php:43-73`.

**Konventionen**

- Syncbare Tabellen: `id TEXT` (UUID), `created_at`, `updated_at` (ISO-8601 UTC ohne Millisekunden, `frontend/src/lib/time.ts`), `deleted_at`.
- Seed-Referenzen: `INTEGER`-PK.
- Das Schema deklariert weder `NOT NULL` noch `FOREIGN KEY`, außer PKs und `training_modes.key UNIQUE`. **Pflicht** meint daher die Pflicht laut Code, nicht laut DB.

Beziehungen im Diagramm sind logisch, die DB erzwingt sie nicht. `PRAGMA foreign_keys=ON` in `api/lib/Db.php:40` wirkt deshalb nicht.

## ER-Diagramm

```mermaid
erDiagram
    training_modes ||--o{ workouts : "mode_id"
    workout_groups |o--o{ workouts : "group_id"
    workouts ||--o{ workout_exercises : "workout_id"
    exercises ||--o{ workout_exercises : "exercise_id"
    exercises ||--o{ exercise_muscles : "exercise_id"
    muscles ||--o{ exercise_muscles : "muscle_id"
    muscle_volume_targets ||--o{ muscles : "region"
    exercises ||--o{ media : "exercise_id"
    workouts |o--o{ sessions : "workout_id"
    sessions ||--o{ sets : "session_id"
    exercises ||--o{ sets : "exercise_id"
    workout_exercises |o--o{ sets : "workout_exercise_id"
    sessions ||--o{ hr_samples : "session_id"
    bia_measurements ||--o{ bia_values : "measurement_id"
    bia_measurements |o--o{ media : "bia_measurement_id"

    workouts {
        text id PK
        text name
        int mode_id FK
        text group_id FK
        text notes
        int archived
    }
    workout_exercises {
        text id PK
        text workout_id FK
        text exercise_id FK
        int position
        int planned_sets
        int rep_low_override
        int rep_high_override
        real increment_override_kg
    }
    sessions {
        text id PK
        text workout_id FK
        text started_at
        text ended_at
        text note
    }
    sets {
        text id PK
        text session_id FK
        text exercise_id FK
        text workout_exercise_id FK
        int set_index
        real weight_kg
        int reps
        int is_warmup
        real rpe
        text performed_at
    }
    exercises {
        text id PK
        text name
        text movement
        text variant
        text display_alias
        int is_curated
        text equipment
        text mechanic
        text category
        real default_increment_kg
        text source
        text external_id
    }
```

Zentrum ist die Kette `workouts → workout_exercises → sets ← sessions`. `bodyweight`, `body_measurements` und `settings` stehen allein und fehlen im Diagramm. `exercise_muscles` trägt die Gewichtung, aus der alle Regionsauswertungen entstehen.

## Entitäten

### Referenz und Konfiguration

| Tabelle | Feld | Typ | Pflicht | Bedeutung |
| :--- | :--- | :--- | :--- | :--- |
| `settings` | `key`, `value` | TEXT | ja | Key-Value, alles Strings |
| `training_modes` | `id`, `key`, `name`, `rep_low`, `rep_high`, `sort` | INT/TEXT | ja | strength, hypertrophy, endurance |
| `muscles` | `id`, `name_en`, `region`, `sort` | INT/TEXT | ja | 17 Muskeln, 6 Regionen (`db/seed/muscle_taxonomy.php`) |
| `muscle_volume_targets` | `region`, `mev`, `mav`, `mrv` | TEXT/INT | ja | Wochenziele je Region, editierbar |

Settings-Schlüssel: `unit_system`, `default_increment_kg`, `rounding_kg`, `progression_trigger`, `rest_seconds`, `theme`, `plateau_sessions`, `recovery_drop_pct`, `recovery_watch_share_pct`, `recovery_deload_share_pct` (`db/seed/settings.php`), dazu `password_hash` und die Profilfelder `profile_height_cm`, `profile_birth_date`, `profile_sex` (`frontend/src/lib/bodyProfile.ts:5-9`).

### Bibliothek und Plan

| Tabelle | Feld | Typ | Pflicht | Bedeutung |
| :--- | :--- | :--- | :--- | :--- |
| `exercises` | `id`, `name` | TEXT | ja | `name` = Quellname, wird nicht umgeschrieben |
| | `movement`, `variant`, `display_alias` | TEXT | nein | Kuration, daraus der Anzeigename |
| | `is_curated` | INT | nein | abgeleitet aus `movement` |
| | `equipment`, `mechanic`, `category` | TEXT | nein | |
| | `default_increment_kg` | REAL | nein | |
| | `source`, `external_id` | TEXT | nein | `fedb` oder `custom` |
| `exercise_muscles` | `exercise_id`, `muscle_id`, `role`, `weight` | | ja | primary 1,0, secondary 0,5 |
| `media` | `id`, `kind`, `exercise_id`, `bia_measurement_id`, `path`, `mime`, `sort` | | teils | Bei FEDB eine externe URL |
| `workout_groups` | `id`, `name`, `sort` | | ja | |
| `workouts` | `id`, `name`, `mode_id` | | ja | |
| | `group_id`, `notes`, `archived` | | nein | |
| `workout_exercises` | `id`, `workout_id`, `exercise_id`, `position`, `planned_sets` | | ja | |
| | `rep_low_override`, `rep_high_override`, `increment_override_kg` | | nein | |

Regel: Ein Workout enthält jede Übung nur einmal. Das hängt am Picker und an `syncExercises`, der Zeilen per `exercise_id` abgleicht (`api/lib/Repository/WorkoutRepository.php:162-224`). Ein Unique-Index fehlt.

### Training

| Tabelle | Feld | Typ | Pflicht | Bedeutung |
| :--- | :--- | :--- | :--- | :--- |
| `sessions` | `id`, `started_at` | TEXT | ja | |
| | `workout_id` | TEXT | nein | fehlt bei Importen |
| | `ended_at` | TEXT | nein | `NULL` = offen |
| | `note` | TEXT | nein | nur Importe |
| `sets` | `id`, `session_id`, `exercise_id`, `set_index`, `weight_kg`, `reps`, `performed_at` | | ja | Zeile = Satz gemacht |
| | `workout_exercise_id` | TEXT | nein | Slot im Plan |
| | `is_warmup`, `rpe` | INT/REAL | nein | nie erfasst |

### Körper

| Tabelle | Feld | Typ | Pflicht | Bedeutung |
| :--- | :--- | :--- | :--- | :--- |
| `bodyweight` | `id`, `measured_at`, `weight_kg`, `note` | | `note` nein | |
| `body_measurements` | `id`, `measured_at`, `site`, `value_cm`, `note` | | `note` nein | waist, chest, hip, arm, thigh |
| `bia_measurements` | `id`, `measured_at`, `source`, `note`, `external_id` | | teils | Kopf eines Scans |
| `bia_values` | `id`, `measurement_id`, `category`, `subcategory`, `metric`, `value_num`, `value_text`, `unit`, `ref_low`, `ref_high` | | teils | Long-Format, deutsche Bezeichner aus der Vorlage (`api/lib/BiaImport.php:14-77`) |
| `hr_samples` | `id`, `session_id`, `ts`, `bpm` | | ja | ohne Soft-Delete |

Der Grundumsatz liegt als `bia_values`-Metrik `Grundumsatz (kcal)` vor und ist über `frontend/src/lib/biaMetrics.ts:18` zugänglich.

## Füllgrade

Live-Kopie vom 2026-10-26. Prozent bezogen auf aktive Zeilen (`deleted_at IS NULL`), sonst vermerkt.

| Feld | Füllgrad | Folge |
| :--- | :--- | :--- |
| `sets.rpe` | 0,0 % | Tracking schreibt fest `null` (`useTrackingStore.ts:244`) |
| `sets.is_warmup = 1` | 0,0 % | Tracking schreibt fest `0`. Alle Warmup-Filter sind wirkungslos |
| `sets.workout_exercise_id` | 47,0 % | Rest aus Importen |
| `sets.weight_kg = 0` | 3,8 % | Körpergewichts-Sätze ohne Lastangabe |
| Soft-gelöschte `sets` (alle Zeilen) | 40,3 % | Grabsteine aus Importen und Merges. Davon zeigen 82,8 % auf nicht mehr vorhandene Übungen |
| Aktive `sets` ohne Übung oder Session | 0,0 % | Aktiver Bestand ist sauber |
| `sessions.workout_id` | 38,8 % | Workout-Auswertung sieht nur diesen Teil |
| `sessions.ended_at` | 99,2 % | |
| `sessions.note` | 95,5 % | Ein einheitlicher Import-Text, keine echte Notiz |
| `hr_samples` je Session | 0,0 % | HR-Import nie produktiv angekommen |
| `workouts.group_id` (alle Zeilen) | 37,9 % | |
| `workouts.archived` (alle Zeilen) | 10,3 % | Gesetzt ohne UI, also per Datenfix |
| `workouts.notes` (alle Zeilen) | 3,4 % | Seed-Demo oder Import ⚠️ Annahme |
| `workout_exercises`-Overrides (alle Zeilen) | 0,0 % | Rep-Range nur aus dem Modus |
| `exercises.is_curated` (alle Zeilen) | 16,0 % | |
| `exercises.default_increment_kg` (alle Zeilen) | 0,1 % | Globaler Schritt greift fast immer |
| `exercises.equipment` (alle Zeilen) | 91,3 % | |
| `exercises.mechanic` (alle Zeilen) | 90,1 % | |
| Aktive Übungen ohne Primärmuskel | 0,0 % | |
| `recovery_*`-Settings | fehlen live | Kein Migrationslauf seit Einführung ⚠️ Annahme. Der Code nutzt Defaults |
| Profil | nur `profile_birth_date` live | Für Nutrition fehlen Größe und Geschlecht |

## Domain-Objekte

```mermaid
classDiagram
    class Workout {
        +string id
        +string name
        +number rep_low
        +number rep_high
        +WorkoutExercise[] exercises
    }
    class WorkoutExercise {
        +string exercise_id
        +number planned_sets
        +number rep_low_override
        +number rep_high_override
        +number increment_override_kg
    }
    class Session {
        +string id
        +string started_at
        +string ended_at
    }
    class SetEntry {
        +number weight_kg
        +number reps
        +number is_warmup
        +number rpe
    }
    class ExerciseTrack {
        +string exerciseId
        +number plannedSets
        +DraftSet[] sets
    }
    class DraftSet {
        +number weightKg
        +number reps
        +boolean done
    }
    class Suggestion {
        +number weightKg
        +number reps
        +string reason
    }
    class PlateauResult {
        +PlateauStatus status
        +PlateauMetric metric
        +number sessionsSinceBest
    }
    class RecoveryResponse {
        +string status
        +number falling_share_pct
    }
    Workout "1" *-- "many" WorkoutExercise
    Session "1" *-- "many" SetEntry
    ExerciseTrack "1" *-- "many" DraftSet
    WorkoutExercise ..> ExerciseTrack : wird im Tracking zu
    DraftSet ..> SetEntry : wird beim Abhaken zu
    SetEntry ..> Suggestion : suggestNext
    SetEntry ..> PlateauResult : detectPlateau
    SetEntry ..> RecoveryResponse : Recovery assess
```

Die Typen stehen in `frontend/src/types/index.ts`, die Entwurfsform in `store/useTrackingStore.ts:8-23`. `Suggestion` und `PlateauResult` sind berechnet und werden nie gespeichert. Das gilt auch für PR-Badges: Es gibt keinen PR-Verlauf.

## IndexedDB

DB `gym-tracker`, Version 2, Stores `sessions`, `sets`, `bodyweight`, `body_measurements`, jeweils `keyPath: id` plus `synced: boolean` (`frontend/src/lib/localDb.ts:9-46`). Weder Workouts noch Übungen oder Settings liegen lokal.
