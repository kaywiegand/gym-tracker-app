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

## Production Build

```bash
cd frontend
npm run build
```

Erzeugt statische Dateien in `frontend/dist/` (inkl. PWA-Manifest +
Service-Worker-Precache).

## Deploy (Hetzner Webhosting, PHP + statisch, kein Node/Root)

1. **Vor dem ersten Deploy:** prüfen, ob `PDO_SQLite` auf dem Host aktiv
   ist (`php -m` im Hosting-Panel oder via `phpinfo()`). Falls nicht,
   `api/config.local.php` (gitignored, Vorlage in `api/config.php`) mit
   `driver => 'mysql'` und den Zugangsdaten der bereitgestellten MySQL-DB
   anlegen — der Repository-Layer ist dafür bereits vorbereitet, `schema.sql`
   ist portables ANSI-SQL.
2. `npm run build` lokal ausführen, den Inhalt von `frontend/dist/` in den
   Docroot kopieren.
3. `api/`, `db/` (ohne `fitness.db`) und `uploads/` (leer) in denselben
   Docroot kopieren, daneben liegend zum Frontend-Build.
4. Auf dem Server `php db/migrate.php --password=<produktivpasswort>`
   einmalig ausführen (per SSH oder Cronjob-Trigger, falls kein SSH
   verfügbar ist).
5. Docroot muss `api/.htaccess` respektieren (mod_rewrite) — leitet alle
   `/api/*`-Requests, die keine echte Datei sind, an `api/index.php` weiter.
6. `/uploads` muss vom Webserver beschreibbar sein, wird aber nicht mit
   Public-Domain-Assets vorbefüllt (private Bilder, s. `CLAUDE.md` §2).

## Struktur

```
frontend/    React-PWA (Vite, TS, Tailwind, shadcn/ui)
api/         PHP Front-Controller + Repository-Layer (index.php, lib/, endpoints/)
db/          schema.sql, migrate.php, seed/ (FEDB-Import, Muskeln, Modi, Settings)
uploads/     private Bilder, gitignored
docs/        Konzept-Dokumente + UX-Referenzprototyp
```
