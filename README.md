# Workout Tracker

Self-hosted Workout-Tracking-App. Backend: PHP + SQLite (MySQL-fähig über
einen Repository-Layer). Frontend: React-PWA (Vite, TypeScript, Tailwind,
shadcn/ui). Siehe `CLAUDE.md` für das vollständige Briefing und
`docs/references/workout-app-v3.html` für die UX-Referenz.

**Stand:** Stufe 1 (Settings, Exercise-Library, Workout-Templates, hinter
Passwort-Login) ist fertig. Tracking, Offline-Sync und Analyse folgen in
späteren Stufen.

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

Prüft die Repository-Schicht (Exercises/Workouts CRUD) gegen eine
Wegwerf-SQLite-Datei in `sys_get_temp_dir()`, rührt `db/fitness.db` nicht an.

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
