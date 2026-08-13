# CLAUDE.md — Workout-Tracking-App · Build Brief

Dies ist das verbindliche Briefing für die Umsetzung. Es konsolidiert Konzept, Datenmodell, Produktstrategie und Design. **UX-/Visual-Referenz ist der Prototyp `docs/references/workout-app-v3.html`** — Screens, Interaktionen, Farben und Verhalten daran orientieren.

> **Arbeitsweise:** In kleinen, abgeschlossenen Schritten bauen. **Zuerst nur Stufe 1** (siehe §11) vollständig fertigstellen und lauffähig machen — nicht die ganze Roadmap auf einmal. Häufig committen. Nicht over-engineeren.

---

## 1. Ziel

Self-hosted Web-App als Ersatz für Gainfire: Workouts/Übungen einrichten, im Gym mobil tracken, zu Hause am Desktop tief auswerten. Kern-USP: **„Ich verstehe deine Trainingshistorie und sage dir, was zu tun ist"** — erklärende Coaching-Intelligenz (Progression, Plateau, Balance) auf **eigenen, exportierbaren Daten, ohne Abo**.

## 2. Nicht verhandelbar

- **Verlustsicher offline:** jede Eingabe wird zuerst lokal gespeichert (IndexedDB), bevor Netzwerk im Spiel ist. Daten dürfen nie verloren gehen.
- **Modular & erweiterbar** (Datenmodell, Code, Charts als austauschbare Module).
- **Metrisch** durchgängig (kg, cm). **UI-Sprache: Englisch.**
- **Portabel:** „klonen & starten" ohne DB-Server. Public-Domain-Assets im Repo, private Bilder außerhalb.
- **Datenhoheit:** self-hosted, Export (CSV/PDF), kein Lock-in.

## 3. Tech-Stack (entschieden)

**Frontend** — installierbare **PWA**:

- React + **Vite** + **TypeScript**.
- **shadcn/ui + Tailwind** (shadcn baut *auf* Tailwind — beides zusammen, Komponenten liegen im Repo).
- **PWA** via `vite-plugin-pwa` (Workbox): App-Shell offline-fähig.
- **Offline-Store:** IndexedDB (Lib `idb`) + Sync-Queue.
- **Charts:** **Nivo**, pro Chart-Typ einzeln importiert (`@nivo/line`, `@nivo/radar`, `@nivo/heatmap`, `@nivo/calendar`, `@nivo/bar`). *(Erst ab Analyse-Stufe relevant.)*
- State: schlank (Zustand) + ein Sync-Service. Keine schweren Frameworks.

**Backend** — auf **Hetzner Webhosting Level 1** (Shared, nur PHP + MySQL/statisch, **kein Node/Root**):

- **PHP 8.x**, dependency-frei, ein Front-Controller (`api/index.php`) als Mini-Router, JSON-REST unter `/api`.
- **SQLite** (via PDO, eine Datei `db/fitness.db`). **Fallback MySQL** (1 DB verfügbar), falls `PDO_SQLite` am Host aus ist — Zugriff hinter einem Repository-Layer kapseln, damit austauschbar.
- Bilder als Dateien in `/uploads` (gitignored); in DB nur der Pfad.
- **Auth:** ein einziges Passwort → Login-Endpoint prüft Hash aus `settings`, setzt HTTP-only-Session-Cookie; API-Requests prüfen Session.

**Deployment:** Frontend-Build (statische Dateien) + `/api` (PHP) im selben Docroot des Webhostings. Beim ersten Deploy `PDO_SQLite` prüfen.

## 4. Architektur

```
[ React-PWA (Browser) ]  --HTTP/JSON-->  [ PHP-API ]  -->  [ SQLite ]  (+ /uploads)
  Handy (Gym) / Desktop                    Login·Sync·                 Bilder
  + IndexedDB (Offline-Puffer)             CRUD·Import·Export
```

**Offline-Sync (verlustsicher, idempotent):**

1. Eingabe → sofort IndexedDB (lokal).
2. Service Worker cached App-Shell → App startet offline.
3. Sync-Queue pusht offene Zeilen an die API, sobald online (Hintergrund; spätestens bei „Finish workout"). Fehlgeschlagene bleiben in der Queue → Retry.
4. Jede syncbare Zeile trägt **am Gerät erzeugte UUID + `updated_at` + optional `deleted_at`** → Server **upsert per UUID** (doppelter Push schadet nie), Konflikt = **last-write-wins** über `updated_at`. Eltern vor Kindern syncen.

## 5. Repo-Struktur

```
/frontend            React-PWA (Vite, TS, shadcn/ui, Tailwind)
/api                 PHP (index.php Front-Controller, db.php, endpoints/, auth.php)
/db                  schema.sql · migrate.php · seed/ (fedb import, muscles, sample bia)
/uploads             (gitignored) Bilder
/docs                Konzept-Kopien + references/workout-app-v3.html (UX-Referenz)
CLAUDE.md · README.md · .gitignore
```

## 6. Datenmodell (SQLite DDL)

Konventionen: syncbare Tabellen haben `id TEXT` (UUID, am Gerät erzeugt) + `updated_at TEXT` (ISO-8601 UTC) + `deleted_at TEXT NULL` (Soft-Delete). Reine Seed-Referenz (`muscles`, `training_modes`) nutzt `INTEGER` PK. `PRAGMA foreign_keys=ON`.

```sql
CREATE TABLE settings ( key TEXT PRIMARY KEY, value TEXT );
-- seed: unit_system=metric, default_increment_kg=2.5, rounding_kg=2.5,
--       progression_trigger=all_sets, rest_seconds=120, password_hash=..., theme=dark

CREATE TABLE training_modes ( id INTEGER PRIMARY KEY, key TEXT UNIQUE, name TEXT, rep_low INT, rep_high INT, sort INT );
-- seed: strength 3-5 · hypertrophy 6-10 · endurance 10-12  (editierbar)

CREATE TABLE muscles ( id INTEGER PRIMARY KEY, name_en TEXT, region TEXT, sort INT );
-- ~17 FEDB-Muskeln; region ∈ chest/back/shoulders/arms/legs/core

CREATE TABLE exercises (
  id TEXT PRIMARY KEY, name TEXT, movement TEXT, equipment TEXT,
  mechanic TEXT,                      -- compound | isolation
  category TEXT, default_increment_kg REAL, source TEXT, external_id TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE exercise_muscles (
  exercise_id TEXT, muscle_id INT,
  role TEXT,                          -- primary | secondary
  weight REAL,                        -- 1.0 primary / 0.5 secondary (konfigurierbar)
  PRIMARY KEY (exercise_id, muscle_id) );

CREATE TABLE media ( id TEXT PRIMARY KEY, kind TEXT, exercise_id TEXT, bia_measurement_id TEXT,
  path TEXT, mime TEXT, sort INT, created_at TEXT );

CREATE TABLE workouts ( id TEXT PRIMARY KEY, name TEXT, mode_id INT, notes TEXT, archived INT DEFAULT 0,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE workout_exercises ( id TEXT PRIMARY KEY, workout_id TEXT, exercise_id TEXT, position INT,
  planned_sets INT,                  -- KEIN festes Zielgewicht (dynamisch, s. §8)
  rep_low_override INT, rep_high_override INT, increment_override_kg REAL,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE sessions ( id TEXT PRIMARY KEY, workout_id TEXT, started_at TEXT, ended_at TEXT, note TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE sets ( id TEXT PRIMARY KEY, session_id TEXT, exercise_id TEXT, workout_exercise_id TEXT,
  set_index INT, weight_kg REAL, reps INT, is_warmup INT DEFAULT 0, rpe REAL, performed_at TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE bodyweight ( id TEXT PRIMARY KEY, measured_at TEXT, weight_kg REAL, note TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE body_measurements ( id TEXT PRIMARY KEY, measured_at TEXT, site TEXT, value_cm REAL, note TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE bia_measurements ( id TEXT PRIMARY KEY, measured_at TEXT, source TEXT, note TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT );

CREATE TABLE bia_values ( id TEXT PRIMARY KEY, measurement_id TEXT, category TEXT, subcategory TEXT,
  metric TEXT, value_num REAL, value_text TEXT, unit TEXT, ref_low REAL, ref_high REAL );  -- Long-Format

CREATE TABLE hr_samples ( id TEXT PRIMARY KEY, session_id TEXT, ts TEXT, bpm INT );  -- HR-Import, per absoluter Zeit aufs Training gelegt

-- Indizes: sets(exercise_id,performed_at), sets(session_id), sessions(workout_id,started_at),
--          workout_exercises(workout_id,position), bia_values(measurement_id), exercise_muscles(muscle_id)
```

## 7. Design-System & Farb-Governance

- **Neutrales Schwarz-Weiß-Chrome** (shadcn-Stil) + **Dark/Light-Umschalter** (Dark = Default, OLED-Strom). **Farbe gehört den Daten.**
- **Grün/Gelb/Rot = ausschließlich Status** (positiv/Warnung/negativ: Ampel MEV/MAV/MRV, ACWR, PR/Regress). Nie als Serienfarbe.
- **Muskelgruppen fix farbcodiert, überall gleich:** Chest=Blau, Back=Orange, Shoulders=Aqua, Arms=Gelb, Legs=Magenta, Core=Grün.
- **Metriken feste Farben** (e1RM/Gewicht/Reps je eine), für Wiedererkennung über alle Charts.
- Charts: dataviz-Prinzipien (dünne Marks, Legende ab 2 Serien, sequenzielle Ein-Hue-Heatmaps, kategoriale Palette in fixer Reihenfolge). Palette für Light+Dark validieren.
- Muskel-Icons im Prototyp sind Platzhalter → **Backlog** (später besserer Original-Icon-Satz). In Listen/Workouts bewusst **ohne Icons** (Namen reichen).

## 8. Fitness-Domäne (Regeln & Formeln)

- **e1RM (Epley):** `1RM ≈ Gewicht × (1 + Reps/30)`.
- **Volume Load:** `Σ (Sätze × Reps × Gewicht)`.
- **Trainingsmodus pro Workout** liefert den Rep-Bereich; Übungen erben ihn (pro Übung überschreibbar).
- **Kein festes Zielgewicht.** Ziel = dynamisch aus Historie + Modus über die **Progressions-Engine (austauschbares Modul)**:
  - **Double Progression:** Gewicht **+Schritt**, wenn alle Arbeitssätze (Trigger `all_sets`) bzw. der letzte Satz (Trigger `last_set`) das **obere Rep-Ende** erreichen; sonst gleiches Gewicht, Reps hocharbeiten. Schritt = `increment_override_kg` ?? `exercises.default_increment_kg` ?? `settings.default_increment_kg`.
  - Beim Tracking **letzte Ist-Werte vorbelegen** + Vorschlag mit „Warum".
- **Volumen/Muskel/Woche:** Sätze je Muskel; Sekundär ×0,5. Bewertung an **MEV/MAV/MRV**.
- **ACWR** (Prävention): Last 7 Tage / 28-Tage-Schnitt; grün 0,8–1,3.
- **PR-Erkennung:** je Übung vs. letztes Mal (Gewicht/Reps/e1RM ↑).
- **Plateau-Detection** (Differenzierer): kein e1RM-Zuwachs über N Sessions (Default 4) → Hinweis „Deload/Variation".
- **Kalorien** (später): HR-basiert (Keytel) mit Gewicht/Alter aus BIA — ehrlich als Schätzung. **HR-Matching** über Set-Timestamps ↔ importierte HR-Zeitreihe.

## 9. Seed-Daten

- **Übungen:** aus **Free Exercise DB** (Public Domain) importieren: `https://github.com/yuhonas/free-exercise-db`, JSON `dist/exercises.json`. Mapping: `name`→name, `primaryMuscles`/`secondaryMuscles`→`exercise_muscles` (role+weight 1.0/0.5), `mechanic`→mechanic, `equipment`→equipment, `category`→category, `images[]`→`media` (Bild-URLs: `raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<path>`). Muskel-Taxonomie aus den ~17 FEDB-Muskeln.
- **BIA-Beispiel** (optional Testdaten): `FitnessExportBIA.csv` (InBody-Style, Wide-Format, Datumsspalten) → beim Import „umdrehen" zu `bia_values` (Long-Format: pro Metrik×Datum eine Zeile).

## 10. Roadmap (P0→P2)

- **Stufe 1:** Settings + Exercise-Library (FEDB-Seed) + Workout-Templates. *(P0 Teil 1)*
- **Stufe 2:** Tracking-Loop (offline-first + Sync), Rest-Timer, Körpergewicht. *(P0 Teil 2)*
- **Stufe 3:** Progression + Analyse-Basis (e1RM, Volumen, PR-Badge, erste Charts).
- **Stufe 4:** Muskel-Heatmap, Radar (Sets/Weight/1RM), ACWR, Dashboard. *(P1)*
- **Stufe 5:** BIA-Import, HR-Import/-Matching, Body-Measurements. *(P1)*
- **Stufe 6:** Export/PDF, Plateau-/Deload-Detection, Deep-Analytics. *(P2)*

## 11. STUFE 1 — deine erste Aufgabe (vollständig fertigstellen)

Ziel: Man kann Übungen durchsuchen/filtern, Workouts mit Modus + Übungen (geplante Sätze) anlegen/bearbeiten, und die Settings pflegen. Alles hinter einem Passwort-Login, Daten in SQLite.

**Backend (PHP + SQLite):**

- `db/schema.sql` anlegen (§6) + `migrate.php` (erstellt DB, legt Schema an, idempotent).
- `db/seed/` : FEDB-Import-Skript (Übungen + Muskeln + media-Pfade), `training_modes`, `muscles`, `settings`-Defaults.
- `api/` : Login/Logout (Passwort-Hash aus settings, Session-Cookie), und CRUD für `exercises` (read/list/search/filter/duplicate), `workouts` + `workout_exercises` (CRUD), `settings` (get/update), `muscles`/`training_modes` (read). JSON-REST, Repository-Layer über PDO (SQLite, MySQL-fähig).

**Frontend (React-PWA, shadcn/ui + Tailwind):** drei Screens gemäß Prototyp v3:

- **Settings:** Theme (Dark/Light), Trainingsmodi + Rep-Bereiche (tap-to-type), Default-Increment, Add-weight-Trigger (all/last, mit Erklärtext), Rest-Timer-Default, Units, Passwort-Lock.
- **Exercises:** Suche + Filter-Chips (Muskelgruppe · Compound/Isolation), Liste **gruppiert nach Muskel, alphabetisch** (nur Namen, keine Icons), Detail-Sheet mit primär/sekundär Muskeln + „Duplicate & edit".
- **Workouts:** Liste; „New/Edit workout" mit Name, Modus-Auswahl, Übungen via **Picker-Sheet** (Suche + „In your workouts" + nach Muskel gruppiert), geplante Satzzahl je Übung. **Kein festes Zielgewicht.**
- App-weit: neutrales Chrome, Dark/Light, Farb-Governance (§7), Zahlen-Eingabe als einheitliche tap-to-type-Komponente.

**Akzeptanzkriterien Stufe 1:**

1. `migrate.php` + Seed laufen sauber; SQLite enthält FEDB-Übungen mit Muskel-Mapping und die 3 Modi.
2. Login schützt die App; ohne Session gibt die API 401.
3. Exercises: Suche + beide Filter funktionieren; Gruppierung nach Muskel korrekt; Duplicate erzeugt editierbare Kopie.
4. Workout anlegen/bearbeiten mit Modus + Übungen + geplanten Sätzen; persistiert in SQLite und übersteht Reload.
5. Settings ändern persistiert (inkl. Theme, Rep-Bereiche, Rest, Trigger).
6. Frontend baut zu statischen Dateien; lokal lauffähig (Vite dev + PHP built-in server); README beschreibt Setup + Deploy aufs Webhosting.

**Danach stoppen** und Stufe 1 gemeinsam testen, bevor Stufe 2 (Tracking + Offline-Sync) beginnt.

## 12. Konventionen

- TypeScript strict; kleine, fokussierte Module; sprechende Namen. Keine unnötigen Dependencies (shared-hosting-tauglich halten).
- Kleine Commits mit klarer Message. Einfache Tests für Engine-Logik (e1RM, Progression, Volumen) und die Sync-Upsert-Logik.
- UUIDs am Client erzeugen. Timestamps ISO-8601 UTC. Nichts hardcoden, was in `settings` gehört.
- Immer die günstigste, klarste Lösung — nicht over-engineeren.
  
  ```
  
  ```
