# Workout Tracker

Self-hosted Workout-Tracking-App. Backend: PHP + SQLite (MySQL-fähig über
einen Repository-Layer). Frontend: React-PWA (Vite, TypeScript, Tailwind,
shadcn/ui). Siehe `CLAUDE.md` für das vollständige Briefing und
`docs/references/workout-app-v3.html` für die UX-Referenz.

**Stand:** Stufe 1–6 (Runde 1) sind fertig — Settings/Exercise-Library/
Workout-Templates, Tracking-Loop mit Offline-Sync, Progression/e1RM/PR-Badges,
das komplette Analyse-Dashboard (Overview/Exercise/Workout/Body), BIA-Import/
HR-Import/Body-Measurements/Backup, Plateau-Detection sowie CSV-/PDF-Export.
Die Keytel-Kalorienschätzung aus CLAUDE.md §8 ist bewusst noch offen (siehe
BACKLOG.md).

## Voraussetzungen

- PHP ≥ 8.1 mit `pdo_sqlite` (`php -m | grep sqlite` zum Prüfen)
- Node.js ≥ 20, npm
- `sqlite3` CLI ist praktisch für Debugging, aber nicht zwingend nötig

## Lokales Setup

**1. Backend — Datenbank anlegen und seeden**

```bash
php db/migrate.php --password=<dein-passwort>
```

Läuft idempotent — mehrfaches Ausführen schadet nicht. Ohne `--password`
wird `changeme` als Default gesetzt (mit Warnung in der Konsole); das
Passwort lässt sich später in der App unter Settings → Change password
ändern. Legt `db/fitness.db` an (gitignored) und importiert dabei alle 873
Übungen aus der vendored Free-Exercise-DB-Kopie (`db/seed/fedb-exercises.json`,
Public Domain).

**2. Backend — PHP-Server starten**

Vom Repo-Root aus (wichtig: Docroot ist das Repo-Root, nicht `api/`, sonst
stimmen die `/api/...`-Pfade nicht):

```bash
php -S localhost:8000 -t . api/index.php
```

`api/index.php` dient dabei als Router-Skript für den eingebauten
PHP-Server — das entspricht später dem `.htaccess`-Rewrite auf dem
Webhosting.

**3. Frontend — Dev-Server starten**

```bash
cd frontend
npm install
npm run dev
```

Läuft auf `http://localhost:5173` und proxied `/api/*` per Vite-Dev-Proxy
auf `http://localhost:8000` (siehe `vite.config.ts`) — Frontend und Backend
laufen dadurch im Browser same-origin, kein CORS-Setup nötig.

**4. Backend-Tests (optional, dependency-frei)**

```bash
php api/tests/run.php
```

Prüft die Repository-Schicht (Exercises/Workouts/Sessions/Sets/Bodyweight)
gegen eine Wegwerf-SQLite-Datei in `sys_get_temp_dir()`, rührt
`db/fitness.db` nicht an.

## Offline & Sync (Stufe 2)

Jede Eingabe beim Tracking (Sätze abhaken, Körpergewicht loggen) wird
sofort in IndexedDB geschrieben (`gym-tracker`-DB im Browser, siehe
`frontend/src/lib/localDb.ts`) — die App verlässt sich dafür nicht auf
Netzwerk. Ein schlanker Sync-Service (`frontend/src/lib/syncService.ts`)
pusht offene Zeilen an `POST /api/sync/push`, sobald die App startet, das
Browser-`online`-Event feuert, oder direkt nach einer Aktion (z.B. „Finish
workout"). Fehlgeschlagene Pushes bleiben einfach in IndexedDB stehen und
werden beim nächsten Trigger erneut versucht — kein Retry-Scheduler nötig.

Zum Testen: Browser-DevTools → Application → IndexedDB → `gym-tracker`
zeigt den aktuellen Stand (`synced: false` = noch nicht hochgeladen).
Den PHP-Server kurz stoppen, während getrackt wird, zeigt den
Offline-Puffer in Aktion; nach Neustart des Servers synct die nächste
Interaktion automatisch nach.

Bewusst **kein** vollständiger Pull-Sync der Historie aufs Gerät — die
Vorbelegung neuer Sätze mit den letzten Ist-Werten (`GET
/api/exercises/:id/last-sets`) ist ein Online-Best-Effort-Abruf beim
Workout-Start, mit leerem Fallback wenn offline (Details im Plan der
Stufe-2-Session).

## BIA-/HR-Import & Backup (Stufe 5)

Alles unter Settings, im selben Bereich wie Körpergewicht:

- **Body composition (BIA):** CSV-Vorlage herunterladen, den fotografierten
  Scan per externer KI in die Vorlage übertragen lassen, ausgefüllte CSV
  wieder hochladen. Import ist idempotent (Dedupe über `external_id` +
  Scan-Datum zusammen — die reale InBody-Datei kann dieselbe ID über zwei
  Scans hinweg wiederverwenden). Jeder importierte Scan zeigt beim Antippen
  **alle** Werte, gruppiert wie im Original-Ausdruck — nicht nur die 5
  kuratierten KPI-Kacheln im Body-Dashboard-Tab.
- **Heart rate:** Apple-Health-`export.xml` hochladen. Nur Samples, deren
  Zeitstempel in ein bereits abgeschlossenes Trainings-Session-Fenster
  fallen, werden übernommen (Rest des Tages wird verworfen). Die Datei kann
  100+ MB groß sein — PHPs `upload_max_filesize`/`post_max_size` (Default
  oft 2–8 MB) müssen auf dem Hosting entsprechend angehoben werden (z.B.
  `.user.ini` mit `upload_max_filesize=200M` und `post_max_size=200M` im
  Docroot); das ist eine reine PHP-Ini-Einstellung, die zur Laufzeit nicht
  umgangen werden kann. Ein zu großer Upload gibt eine klare Fehlermeldung
  statt eines kryptischen Absturzes zurück.
- **Backup:** vollständiger JSON-Export aller individuell erzeugten Daten
  (Workouts, eigene Übungen, Trainings-/Tracking-Historie, Bodyweight/
  Body-Measurements, BIA- und HR-Daten, `settings` inkl. Passwort-Hash) —
  bewusst kein Vorgriff auf Stufe 6s Export/PDF (dort geht es um
  menschenlesbare Reports, hier um eine rohe Datensicherung). FEDB-Übungen
  und reine Seed-Tabellen (`muscles`, `training_modes`,
  `muscle_volume_targets`) sind nicht enthalten — die kommen über
  `php db/migrate.php` zurück. Restore überschreibt bedingungslos mit den
  Daten aus der Datei (nicht last-write-wins wie der Offline-Sync — ein
  Restore ist eine bewusste, einmalige Aktion und muss auch eine seitdem
  erfolgte Löschung rückgängig machen können).

## Plateau-Detection & Export (Stufe 6)

- **Plateau-Detection:** Dashboard → Exercise zeigt einen Hinweis, wenn eine
  Übung über die in Settings konfigurierte Anzahl Sessions (Default 4) kein
  e1RM-Wachstum zeigt — plus eine kompakte Gesamtkörper-ACWR-Zeile als
  Trainingslast-Kontext (CLAUDE.md §8).
- **CSV-Export:** Settings → Export → „Download training log (CSV)" —
  ein Trainings-Log (eine Zeile pro Satz inkl. berechnetem e1RM), zum Öffnen
  in Excel/Sheets oder Weitergeben an einen Coach.
- **PDF-Export:** Settings → Export → „Print report (PDF)" öffnet
  `/report`, eine druckoptimierte Zusammenfassung (Overview-KPIs, Muskel-
  Status, Consistency, BIA-Kennzahlen). Bewusst kein PHP-PDF-Dependency
  (CLAUDE.md §3/§12) — `window.print()` im Browser, "Als PDF speichern" im
  Druckdialog erledigt den Rest.

## Übungs-Namen (Naming-Konvention)

Die Namen aus der Free Exercise DB sind uneinheitlich („Barbell Bench Press -
Medium Grip", „Dumbbell Bench Press"). Statt sie umzuschreiben, bekommt jede
Übung vier Struktur-Teile, aus denen der Anzeigename **berechnet** wird:

```
<primärer Muskel> <movement> <equipment> <variant>
Chest              Press      Barbell     Incline   ->  "Chest Press Barbell Incline"
```

- Muskel und Equipment stehen schon in den Daten — nur `movement` und
  `variant` werden getippt, im Exercise-Editor mit Vorschlagsliste aus den
  bereits vergebenen Werten.
- `display_alias` hält den gängigen Namen („Incline Bench Press") und steht
  als zweite Zeile darunter. Die Suche trifft **beide** plus den Originalnamen.
- Weil der Name berechnet wird, kann keine zweite Schreibweise derselben Übung
  entstehen — Kollisionen fallen sofort auf.
- Eine Übung gilt als **kuratiert**, sobald sie ein `movement` hat. Die
  Exercises-Liste zeigt per Default nur diese („My library"); der Toggle
  „All exercises" blendet die vollen 873 ein. Kuratiert wird beim ersten
  Verwenden, direkt in der Bibliothek — kein Duplikat.
- 123 Übungen sind vorkuratiert (`db/seed/exercise_naming.php`): die
  Standard-Compounds plus die gängigen Isolationsübungen, über alle sechs
  Regionen (Chest 20 · Back 22 · Shoulders 17 · Arms 20 · Legs 30 · Core 14).
  Bewusst kein Massen-Rename aller 873: ein Trockenlauf ergab 176 ohne
  ableitbares Bewegungswort und 127 Kollisionen.

Logik in `api/lib/ExerciseNaming.php` (eine Stelle, getestet in
`api/tests/run.php`). Die Datenquelle bleibt austauschbar — sie muss nur
Muskel, Equipment und einen Originalnamen liefern.

## Gainsfire-Migration

Trainingshistorie aus der Vorgänger-App übernehmen. Die App hat keinen
Import für Trainingsdaten — wohl aber **Backup-Restore**, das per ID
upsertet und Zeilen, die nicht in der Datei stehen, unangetastet lässt.
Die Migration nutzt diesen bereits getesteten Weg statt eines neuen Endpoints.

```bash
# 1. aktuelle Übungsbibliothek exportieren (Titel + IDs)
php -r 'require "api/bootstrap.php";
  foreach ((new ExerciseRepository())->list(null,null,null) as $e)
    printf("%s\t%s\t%s\t%d\n", $e["display_name"], $e["display_subtitle"], $e["id"], $e["is_curated"]);' > /tmp/all.tsv

# 2. konvertieren
python3 scripts/gainsfire-to-backup.py \
    <gainsfire-export.csv> /tmp/all.tsv scripts/gainsfire-mapping.tsv \
    uploads/gainsfire-migration-backup.json
```

Ergebnis in der App hochladen: **Settings → Backup → Restore**.

**`scripts/gainsfire-mapping.tsv`** ordnet jeden Gainsfire-Namen einem
App-Übungstitel zu (Tab-getrennt). Neue Namen aus einem frischeren Export
hier ergänzen — nicht im Script.

Zwei Eigenheiten des Exports, die das Script abfängt (Details im Docstring):

- **Jeder Satz steht doppelt drin**, unter zwei Schreibweisen derselben
  Übung (`Leg Press Machine` = `Leg press`). Ungefiltert wäre jede
  Volumenzahl zu hoch. Erkennung über identische (Datum, Satz, Reps,
  Gewicht)-Mengen.
- **Rund ein Fünftel der Zeilen trägt „Entfernter Plan"** (Plan in Gainsfire
  gelöscht). Hat derselbe Tag einen echten Plan, gehören sie dorthin — kein
  Tag im Export hat zwei echte Pläne, die Zuordnung ist also eindeutig.

IDs sind deterministisch (UUIDv5 über einen stabilen Schlüssel): ein zweiter
Import aktualisiert dieselben Zeilen, statt Duplikate anzulegen. Bestehende
Workouts und Sessions bleiben erhalten.

## Production Build

```bash
cd frontend
npm run build
```

Erzeugt statische Dateien in `frontend/dist/` (inkl. PWA-Manifest +
Service-Worker-Precache).

## Deploy (Hetzner Webhosting — FTP, kein SSH)

### Einmal einrichten: Zugangsdaten

`deploy/env` anlegen (Vorlage: `deploy/env.example`) und ausfüllen:

```
GYM_FTP_HOST=ftp://ftp.example.com
GYM_FTP_USER=your-ftp-user
GYM_FTP_PASS=<FTP-Passwort>
```

Gitignored, `chmod 600`, bleibt lokal. Beide Scripts lesen die Datei selbst —
kein `export` nötig. Gesetzte Umgebungsvariablen haben Vorrang, falls man
einmalig etwas überschreiben will.

`lftp` wird gebraucht: `brew install lftp`.

### Deployen: ein Befehl

```bash
./deploy/deploy.sh "was sich geändert hat"
```

Das ist der einzige Weg zu deployen. Nichts von Hand kopieren.

### Was das Script tut — immer diese 5 Schritte

| # | Schritt | Was passiert |
| :--- | :--- | :--- |
| 1 | **Build-ID** | aus Git-Commit + Zeitstempel, z.B. `20260830-1028-b237d66` |
| 2 | **Backup** | Live-DB + `uploads/` von Hetzner nach `backups/<build-id>/`. **Schlägt das fehl, bricht der Deploy ab.** |
| 3 | **Build** | `frontend/dist/`, mit der Build-ID fest eingebacken |
| 4 | **Assemble** | `deploy-upload/` wird komplett neu gebaut — aus einer festen Liste |
| 5 | **Upload** | `deploy-upload/` → FTP-Root |

Danach schreibt es eine Zeile in `DEPLOYMENTS.md`.

**Flags:**

- `--dry-run` — Schritt 1–4 ohne Upload und ohne Backup. Zum Prüfen von `deploy-upload/`.
- `--with-migration` — nur nötig wenn `db/schema.sql` sich geändert hat (siehe unten).

### Schutz des Datenbestands — 4 Regeln

Die Daten sind das Wertvolle, nicht der Code. Vier Mechanismen, unabhängig voneinander:

| Regel | Wo |
| :--- | :--- |
| **Vorher immer ein Backup** — Live-DB + Bilder werden gezogen, geprüft (SQLite-Integritätscheck + Zeilenzahlen) und erst dann geht es weiter | `deploy/backup.sh` |
| **Kein `--delete` beim Upload** — sonst würde jeder Deploy die Live-DB und alle Bilder auf dem Server löschen | `deploy/deploy.sh` |
| **Nie eine DB im Upload** — `deploy-upload/` wird aus einer Whitelist gebaut, `*.db` ist ausgeschlossen; direkt vor dem Upload prüft das Script nochmal und bricht ab wenn doch eine drin liegt | `deploy/deploy.sh` |
| **Migration ist idempotent** — `CREATE TABLE IF NOT EXISTS`, Seeds prüfen vorher was schon da ist | `db/migrate.php` |

Was auf dem Server **nie** angefasst wird: `db/fitness.db` und `uploads/`.

Backup allein ziehen, ohne Deploy:

```bash
./deploy/backup.sh
```

`backups/` ist gitignored — Nutzerdaten gehören nicht ins Repo.

### Build-ID

Jeder Deploy bekommt eine ID: `<datum>-<uhrzeit>-<commit>`, z.B. `20260830-1028-b237d66`.

Sie steht an drei Stellen:

- **In der App:** Settings → About
- **Auf dem Server:** `https://<domain>/build.json`
- **Im Log:** `DEPLOYMENTS.md`

Der Backup-Ordner heißt genauso — zu jedem Build gehört exakt ein Backup.

Ein lokaler Build (`npm run build`) hat keine Build-ID, Settings zeigt dann `dev`.
Ein Deploy mit uncommitteten Änderungen bekommt `-dirty` angehängt.

### Deployment-Changelog

`DEPLOYMENTS.md` — eine Zeile pro Deploy, vom Script geschrieben:
Build-ID, Commit, Zeitpunkt, Backup-Ordner, Notiz. Die Notiz ist das Argument
von `deploy.sh` — deshalb immer eine mitgeben.

### Wenn sich das Schema geändert hat

`db/schema.sql` geändert → Migration muss auf dem Server laufen:

```bash
./deploy/deploy.sh --with-migration "neue Spalte X"
```

Das Script lädt `deploy/run-migration.php` mit einem **frisch erzeugten** Token
mit hoch, zeigt die URL, wartet — und **löscht die Setup-Scripts danach
automatisch wieder vom Server**. Ohne dieses Flag liegt `deploy/` nie auf dem
Server (die Datei kann mit ihrem Token Migrationen auslösen, sie darf dort
nicht dauerhaft stehen).

### Erst-Installation auf einem leeren Host

1. `./deploy/deploy.sh --with-migration "initial"` — Backup-Schritt schlägt fehl,
   da noch keine DB da ist. Dann einmalig `./deploy/deploy.sh --dry-run` und den
   Upload von Hand (`deploy/upload.sh`).
2. `https://<domain>/deploy/check-env.php` — zeigt PHP-Version, ob `PDO_SQLite`
   oder `PDO_MySQL` da ist, ob der Docroot beschreibbar ist.
3. Falls `pdo_sqlite` fehlt: `api/config.local.php` (gitignored, Vorlage in
   `api/config.php`) mit `driver => 'mysql'` + Zugangsdaten aus dem Hosting-Panel
   anlegen und **einzeln** hochladen — `deploy.sh` schließt diese Datei bewusst
   vom Upload aus.
4. Migration über die vom Script gezeigte URL laufen lassen.
5. Prüfen: `https://<domain>/api/settings` muss `{"error":"Unauthorized"}` (401)
   liefern, nicht 404 — sonst greift das `mod_rewrite` aus `api/.htaccess` nicht.


## Struktur

```
frontend/    React-PWA (Vite, TS, Tailwind, shadcn/ui)
api/         PHP Front-Controller + Repository-Layer (index.php, lib/, endpoints/)
db/          schema.sql, migrate.php, seed/ (FEDB-Import, Muskeln, Modi, Settings)
uploads/     private Bilder, gitignored
docs/        Konzept-Dokumente + UX-Referenzprototyp
```
