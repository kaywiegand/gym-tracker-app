# 05 · API und Schnittstellen

Basis `/api`, JSON. Fehlerform `{"error": "..."}`. Routing: If-Kette in `api/index.php:28-141`, Reihenfolge ist relevant (`/exercises/naming-vocabulary` vor `/exercises/:id`). Alle Routen außer `/auth/login`, `/auth/logout`, `/auth/status` verlangen eine Session, sonst 401.

`tz` ist immer ein IANA-Name, Standard UTC. Spalte **Datei** ist relativ zu `api/endpoints/`.

## REST-Endpunkte

### Auth und Konfiguration

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `POST /auth/login` | `{password}` | `{authenticated}` / 401 | `auth.php` |
| `POST /auth/logout` | – | `{authenticated:false}` | `auth.php` |
| `GET /auth/status` | – | `{authenticated}` | `auth.php` |
| `POST /auth/change-password` | `{current_password,new_password}` | `{ok}` | `auth.php` |
| `GET /settings` | – | Objekt ohne `password_hash` | `settings.php` |
| `PUT /settings` | Teilobjekt, beliebige Schlüssel | alle Settings | `settings.php` |
| `GET /training-modes` | – | `TrainingMode[]` | `reference.php` |
| `PUT /training-modes/:key` | `{rep_low,rep_high}` | `TrainingMode[]` | `reference.php` |
| `GET /muscles` | – | `Muscle[]`. Kein Aufrufer im Frontend | `reference.php` |
| `GET /muscle-volume-targets` | – | `MuscleVolumeTarget[]` | `reference.php` |
| `PUT /muscle-volume-targets/:region` | `{mev,mav,mrv}` | `MuscleVolumeTarget[]` | `reference.php` |

### Übungen

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `GET /exercises` | `q, region, mechanic, curated=1, tracked=1` | `ExerciseListItem[]` | `exercises.php` |
| `POST /exercises` | `{id?,name,...,muscles[]}` | `Exercise` 201 | `exercises.php` |
| `GET /exercises/naming-vocabulary` | – | `{movements,variants}` | `exercises.php` |
| `GET /exercises/:id` | – | `Exercise` mit `muscles`, `media` | `exercises.php` |
| `PUT /exercises/:id` | Teilfelder, nur Gesendetes ändert sich, `null` leert | `Exercise` | `exercises.php` |
| `PUT /exercises/:id/watchlist` | `{watched}` | `{watched}` | `exercises.php` |
| `GET /exercises/:id/last-sets` | `exclude_session` | `SetEntry[]` | `exercises.php` |
| `GET /exercises/:id/progression-context` | – | `ProgressionContext` oder `null` | `exercises.php` |
| `GET /exercises/:id/history` | `limit, weeks` | `ExerciseHistoryEntry[]` | `exercises.php` |
| `GET /exercises/:id/session-summaries` | `limit, weeks` | `ExerciseSessionSummary[]` | `exercises.php` |

`DELETE /exercises/:id` existiert nicht.

### Workouts

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `GET /workouts` | – | `WorkoutListItem[]`, ohne archivierte | `workouts.php` |
| `POST /workouts` | `{id?,name,mode_id,group_id,exercises[]}` | `Workout` 201 | `workouts.php` |
| `GET /workouts/recent` | `days` | `RecentWorkout[]` | `workouts.php` |
| `GET /workouts/:id` | – | `Workout` mit `exercises[]` | `workouts.php` |
| `PUT /workouts/:id` | Teilfelder aus POST, nur Gesendetes ändert sich, `null` leert | `Workout` | `workouts.php` |
| `DELETE /workouts/:id` | – | `{ok}` | `workouts.php` |
| `GET /workouts/:id/last-session-volume` | `exclude_session` | `PreviousSession` | `workouts.php` |
| `GET /workouts/:id/muscle-split` | `limit, weeks` | `{sessions[]}` | `workouts.php` |
| `GET /workout-groups` | – | `WorkoutGroup[]` | `workouts.php` |
| `POST /workout-groups` | `{id?,name,sort?}` | Gruppe 201 | `workouts.php` |
| `PUT /workout-groups/:id` | `{name?,sort?}` | Gruppe | `workouts.php` |
| `DELETE /workout-groups/:id` | – | `{deleted}` | `workouts.php` |

### Sync und Körperdaten

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `POST /sync/push` | `{sessions[],sets[],bodyweight[],body_measurements[]}` | `{ok}` | `sync.php` |
| `GET /sync/snapshot` | – | `{workouts,workout_groups,workout_details,exercises,settings,last_sets}` für den Offline-Start, `last_sets` auch für alle je trainierten Übungen | `sync.php`, `lib/OfflineSnapshot.php` |
| `GET /bodyweight` | `limit` | `Bodyweight[]` | `bodyweight.php` |
| `GET /body-measurements` | `site, limit` | `BodyMeasurement[]` | `bodymeasurements.php` |
| `GET /bia/template` | – | CSV | `bia.php` |
| `POST /bia/import` | Multipart `file` | `{imported,skipped}` | `bia.php` |
| `GET /bia/series` | `limit` | `BiaSeriesEntry[]` | `bia.php` |
| `GET /bia/latest` | – | `{measurement,values}` | `bia.php` |
| `GET /bia/measurements` | `limit` | `BiaMeasurement[]` | `bia.php` |
| `GET /bia/measurements/:id` | – | `{measurement,values}` | `bia.php` |
| `DELETE /bia/measurements/:id` | – | `{ok}` | `bia.php` |
| `POST /hr/import` | Multipart `file` | `{matched,sessions_touched}`. Datei liegt nur während des Requests im Upload-Verzeichnis | `hr.php` |
| `GET /media/:id` | – | Datei aus dem Upload-Verzeichnis, 404 für URL-Zeilen. Bilder inline, Rest als Download | `media.php` |
| `GET /uploads/status` | – | `{writable,outside_docroot}`, ohne Pfad | `media.php` |

Es gibt kein Lese-Endpoint für `hr_samples`, keines für Sessions als Liste und kein Schreib-Endpoint für Körperdaten außer Sync.

### Dashboard

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `GET /dashboard/muscle-volume` | `weeks, days, tz` | `{regions[]}` | `dashboard.php` |
| `GET /dashboard/acwr` | `weeks, days, tz` | `{acute_kg,chronic_kg,ratio,weekly_series,daily_series}` | `dashboard.php` |
| `GET /dashboard/recovery` | – | `RecoveryResponse` | `dashboard.php` |
| `GET /dashboard/training-load` | `weeks, tz` | `{weekly_volume,weekly_sessions}` | `dashboard.php` |
| `GET /dashboard/consistency` | `days, tz` | `{dates[]}` | `dashboard.php` |
| `GET /dashboard/session-volumes` | `days, tz` | `{sessions[]}` | `dashboard.php` |
| `GET /dashboard/top-exercises` | `weeks, limit` | `TopExercise[]` | `dashboard.php` |

### Export

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `GET /backup/export` | – | JSON-Download, inkl. `password_hash` | `backup.php` |
| `POST /backup/import` | Multipart `file` | `{tables:{...}}` | `backup.php` |
| `GET /export/training-log.csv` | – | CSV, eine Zeile je Satz | `export.php` |

## Interne Funktionen

### Backend

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `MuscleVolume::weeklyByRegion` | Rohzeilen, Wochen, Fenster, tz | Metriken je Region | `api/lib/MuscleVolume.php:47` |
| `MuscleVolume::dailyTotals` | Satzzeilen, tz | `date => kg` | `api/lib/MuscleVolume.php:159` |
| `MuscleVolume::acwr` | Tageslast, Datum | `{acute_kg,chronic_kg,ratio}` | `api/lib/MuscleVolume.php:173` |
| `Recovery::assess` | Bestwerte je Übung/Session, Schwellen | Status, Übungen | `api/lib/Recovery.php:30` |
| `VolumeLandmarks::regionTargets` | Muskeln | Ziele je Region | `api/lib/VolumeLandmarks.php:43` |
| `ExerciseNaming::displayName` | Übungszeile | Titel | `api/lib/ExerciseNaming.php:453` |
| `ExerciseNaming::decorateAllJoined` | Zeilen mit Präfix | Zeilen mit Anzeigename | `api/lib/ExerciseNaming.php:631` |
| `BiaImport::parse` | CSV | Long-Format | `api/lib/BiaImport.php:92` |
| `HrImport::matchFromAppleHealthXml` | Pfad, Fenster | Samples | `api/lib/HrImport.php:17` |
| `BaseRepository::upsertRow` | Tabelle, Spalten, ID | – | `api/lib/BaseRepository.php:43` |
| `SetRepository::e1rmByExerciseSession` | Tage | Bestwerte | `api/lib/Repository/SetRepository.php:334` |
| `SetRepository::lastSetsForExercise` | Übung, Ausschluss | Sätze | `api/lib/Repository/SetRepository.php:41` |
| `WorkoutRepository::progressionContextForExercise` | Übung | Rep-Range, Schritt | `api/lib/Repository/WorkoutRepository.php:45` |

### Frontend

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| `suggestNext` | letzte Sätze, Range, Schritt, Rundung, Trigger | `Suggestion` | `lib/progression.ts:27` |
| `detectPlateau` | Verlauf, Schwelle | `PlateauResult` | `lib/plateau.ts:81` |
| `acwrStatus` | Ratio | Farbe, Label | `lib/acwr.ts:19` |
| `statusFor` | Sätze, MEV, MAV, MRV | Ampel | `lib/muscleStatus.ts:8` |
| `epley1RM` | kg, Reps | e1RM | `lib/metrics.ts:3` |
| `resolveRange` | Bereich | Fenster, Tage | `lib/dashboardRanges.ts:130` |
| `putRow`, `getUnsynced`, `markSynced` | Store, Zeile | IndexedDB | `lib/localDb.ts:48,63,93` |
| `findOpenSessions` | Workout | offene Sessions | `lib/localDb.ts:77` |
| `pushPending` | – | Sync-Lauf, Auslöser während eines Laufs starten danach einen weiteren | `lib/syncService.ts` |
| `syncNow` | – | Push, dann `refreshOfflineCache` | `lib/syncService.ts` |
| `loadWorkoutList`, `loadTrackingData` | Workout | Netz mit 4 s Limit, sonst `cache`, sonst `null` | `lib/offlineCache.ts` |
| `useTrackingStore` | Aktionen | Session-Zustand | `store/useTrackingStore.ts:128` |
| `checkForNewVersion` | – | Reload oder Banner | `lib/versionCheck.ts:129` |

Unter `lib/`, `store/` ist `frontend/src/` gemeint.

## Skripte

| Name | Input | Output | Datei |
| :--- | :--- | :--- | :--- |
| Migration | `--password, --db, --force` | Schema, Seeds | `db/migrate.php` |
| Gainsfire-Import | Export, Ziel-DB | Backup-JSON | `scripts/gainsfire-*.py` |
| Duplikate mergen | DB | Backup-JSON | `scripts/merge-duplicate-exercises.php` |
| Frühe Historie | DB | Backup-JSON | `scripts/early-history-library.py` |
| Trainings-Review | DB-Kopie | HTML | `scripts/training-review.py` |
| Dashboard-Export | DB, Template | HTML | `scripts/export-dashboard.py` |
| Titel-Export | DB | Liste | `scripts/export-exercise-titles.php` |
| Body-Pfade | `docs/references/body.svg` | `bodyPaths.ts` | `scripts/build-body-paths.py` |

Zwei Skripte im Muster "DB-Kopie rein, HTML raus" (`training-review.py`, `export-dashboard.py`) rechnen Auswertung in Python nach. Das ist eine zweite Implementierung außerhalb der App.

## Externe Dienste

| Dienst | Richtung | Beleg |
| :--- | :--- | :--- |
| GitHub Raw (FEDB-Bilder) | Browser lädt Bilder | `db/seed/exercises.php:101`, `components/ExerciseDetailSheet.tsx` |
| Hetzner FTP | Deploy, Backup | `deploy/deploy.sh`, `deploy/backup.sh` |

Es gibt keine weiteren Laufzeit-Dienste: keine Telemetrie, keine KI-API.

## Kern-Flows

### Workout loggen

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant T as TrackingPage
    participant S as useTrackingStore
    participant L as IndexedDB
    participant Y as syncService
    participant A as PHP API
    participant D as SQLite

    K->>T: Start
    T->>A: GET /workouts/:id, /settings, last-sets (max. 4 s)
    A-->>T: Plan und letzte Saetze
    Note over T,L: offline oder Zeitlimit: dasselbe aus dem Store cache
    T->>L: findOpenSessions
    T->>S: start oder resume
    K->>S: Satz abhaken
    S->>L: putRow sessions beim ersten Satz
    S->>L: putRow sets
    S->>Y: pushPending
    Y->>L: getUnsynced
    Y->>A: POST /sync/push
    A->>D: Upsert per ID, LWW
    A-->>Y: ok
    Y->>L: markSynced
    K->>S: Finish
    S->>L: putRow sessions mit ended_at
    S->>Y: pushPending
    T->>A: GET last-session-volume
    A-->>T: Vergleichswert
```

Kein Schritt braucht zwingend Netz, solange ein Snapshot im `cache` liegt (s. Offline-Start). Schlägt der Push fehl, bleiben die Zeilen ungesynct und der nächste Auslöser versucht es erneut. Auslöser sind App-Start, `online`, jede Satz-Aktion und Finish.

### Offline-Start

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant W as WorkoutsPage
    participant Y as syncService
    participant C as offlineCache
    participant L as IndexedDB
    participant A as PHP API
    participant T as TrackingPage

    Note over W,A: Vorbereitung bei Empfang
    W->>Y: syncNow
    Y->>A: POST /sync/push
    Y->>C: refreshOfflineCache
    C->>A: GET /sync/snapshot
    A-->>C: Workouts, Gruppen, Details, Uebungen, Settings, letzte Saetze
    C->>L: replaceCache, kompletter Austausch

    Note over K,T: Spaeter im Gym
    K->>T: Workout starten
    T->>C: loadTrackingData
    alt online und Antwort unter 4 s
        C->>A: GET /workouts/:id, /settings, last-sets
        A-->>C: frische Daten
    else offline oder Zeitlimit
        C->>L: getCached workout:id, settings, last-sets
        L-->>C: lokale Kopie
    else 404 oder keine Kopie
        C-->>T: null
        T-->>K: Hinweis statt Laden
    end
    C-->>T: TrackingData
```

Die Session bleibt client-seitig, ihre Zeile entsteht erst beim ersten Satz. Grenze: Die letzten Sätze stammen vom letzten Snapshot, zwei Offline-Workouts hintereinander sehen einander nicht.

### Login und abgelaufene Session

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant U as Screen
    participant S as useAuthStore
    participant H as api.ts
    participant A as PHP Auth
    participant D as SQLite

    U->>S: checkStatus
    alt Antwort unter 4 s
        S->>A: GET /auth/status
        A-->>S: authenticated
    else offline
        S->>S: bekannter Login aus localStorage
    end
    K->>S: login mit Passwort
    S->>A: POST /auth/login
    A->>D: password_hash aus settings
    A->>A: password_verify, neue Session-ID
    A-->>S: HTTP-only-Cookie, 30 Tage gleitend
    Note over U,A: Spaeter laeuft die Session ab
    U->>H: beliebiger Request
    H->>A: Request
    A-->>H: 401
    H-->>S: Event, recheck
    S->>A: GET /auth/status
    A-->>S: authenticated false
    S-->>U: LoginPage als Overlay, Screen bleibt montiert
```

Das Overlay schützt ungespeicherte Eingaben: Der Screen darunter bleibt stehen. Ein Netzfehler beim `recheck` sagt nichts über die Session und ändert daher keinen Zustand. Eine Login-Sperre zeigt das Diagramm nach Stand von R-13 nicht.

### BIA-Import

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant E as Externe KI
    participant U as SettingsPage
    participant A as bia.php
    participant P as BiaImport
    participant R as BiaRepository
    participant D as SQLite

    K->>U: Vorlage laden
    U->>A: GET /bia/template
    A-->>K: CSV-Vorlage
    K->>E: Foto des Scans und Vorlage
    E-->>K: ausgefuellte CSV
    K->>U: Datei waehlen
    U->>A: POST /bia/import
    A->>P: parse, Wide zu Long
    P-->>A: Datumsspalten und Eintraege
    A->>R: existingKeys
    loop je Datum
        alt external_id und measured_at bekannt
            A->>A: skipped + 1
        else neu
            A->>R: createMeasurement
            A->>R: insertValues
            R->>D: bia_measurements, bia_values
        end
    end
    A-->>U: imported, skipped
```

Der Schlüssel aus `external_id` und `measured_at` macht den Import idempotent. `external_id` allein reicht nicht, der Export verwendet sie mehrfach (`BiaRepository.php`). Der KI-Schritt läuft außerhalb der App.

### Auswertung und Dashboard

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant O as OverviewScope
    participant R as dashboardRanges
    participant A as PHP API
    participant M as MuscleVolume
    participant Q as Recovery
    participant D as SQLite

    K->>O: Dashboard oeffnen
    O->>A: GET /dashboard/recovery
    A->>D: e1rmByExerciseSession 180 Tage
    A->>Q: assess
    Q-->>O: Status und Uebungen
    O->>R: resolveRange
    R->>A: GET /dashboard/consistency
    A-->>R: Trainingstage
    R-->>O: Fenster
    par Parallel
        O->>A: GET /dashboard/acwr
        A->>M: dailyTotals, acwr, Serien
    and
        O->>A: GET /dashboard/muscle-volume
        A->>M: weeklyByRegion
    and
        O->>A: GET /dashboard/session-volumes
    and
        O->>A: GET /dashboard/top-exercises
    end
    A-->>O: Daten
    O-->>K: Kacheln
```

Der Overview macht einen Bereichs-Lauf mit fünf Requests plus Recovery. Jede Zahl wird pro Aufruf aus Rohdaten berechnet, einen Cache gibt es nicht. Der Exercise-Scope arbeitet ähnlich und rechnet Target und Plateau im Client.

### Export

```mermaid
sequenceDiagram
    actor K as Nutzer
    participant U as SettingsPage
    participant W as ServiceWorker
    participant A as PHP API
    participant B as BackupRepository
    participant D as SQLite

    K->>U: Download Backup oder CSV
    U->>W: Navigation /api/...
    W->>A: durchgereicht, Denylist
    A->>B: exportAll
    B->>D: SELECT je Tabelle
    D-->>B: Zeilen
    B-->>A: tables
    A-->>K: JSON-Datei
    K->>U: Restore mit Datei
    U->>A: POST /backup/import
    A->>B: importAll
    B->>D: Ueberschreiben ohne LWW
    A-->>U: Zusammenfassung je Tabelle
```

Downloads sind einfache `<a href>`-Links, die der Service Worker durchlässt (`vite.config.ts:13-18`). CSV läuft gleich, nur über `exportRows()`. Der Druck-Report liest über die Dashboard-Endpunkte und nutzt `window.print()`.
