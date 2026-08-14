# PROCESS_LOG.md – Workout Tracker

> Projektverlauf und AI-Kontext-Einstieg.

---

## Projekt-Übersicht

| Feld | Inhalt |
| :--- | :--- |
| Projektname | Workout Tracker |
| Repo | `kw_gym-tracker` (neu angelegt 2026-08-14) |
| Typ | Full-Stack Web-App (PHP + SQLite Backend, React-PWA Frontend) |
| Briefing | `CLAUDE.md` (verbindlich, konsolidiert Konzept/Datenmodell/Strategie) |
| UX-Referenz | `docs/references/workout-app-v3.html` |
| Status | 🟢 Stufe 1 + Stufe 2 (Tracking-Loop, Offline-Sync, Rest-Timer, Körpergewicht) fertig, ungetestet von Kay |
| Nächster Schritt | Kay testet Stufe 2 lokal, dann Freigabe für Stufe 3 (Progression + Analyse-Basis) |
| Roadmap | Siehe `CLAUDE.md` §10 — keine separate ROADMAP.md, um Duplikate zu vermeiden |

---

## Session 2026-08-14 — Repo-Aufbau + Stufe 1 komplett

**Was passiert ist:**
- `kw_gym-tracker/` war noch kein eigenes Git-Repo (lag unter dem Wildcard-`.gitignore` des Workspace-Root-Repos) — neu initialisiert, `CLAUDE.md` + `docs/` mit übernommen.
- PHP 8.5 (`pdo_sqlite`) via Homebrew installiert — war auf der Maschine nicht vorhanden, nötig um Backend lokal tatsächlich auszuführen statt nur zu schreiben (Kay hat Install freigegeben).
- Backend: `db/schema.sql` + `db/migrate.php` (idempotent) + `db/seed/` (17 FEDB-Muskeln mit Region-Mapping, 3 Trainingsmodi, Settings-Defaults, 873 FEDB-Übungen inkl. Muskel-Zuordnung + Foto-URLs — Rohdaten vendored in `db/seed/fedb-exercises.json`, kein Live-Fetch beim Migrieren). PHP-Front-Controller (`api/index.php`) + Repository-Layer (`api/lib/`) + Endpunkte für Auth/Settings/Referenzdaten/Exercises/Workouts.
- Frontend: Vite + React 19 + TS (strict) + Tailwind v4 + shadcn/ui (Base UI). Drei Screens: Settings, Exercises (Suche/Filter/Gruppierung/Detail/Duplicate&edit), Workouts (Liste/New-Edit/Picker-Sheet).
- Verifikation: `php api/tests/run.php` (20 dependency-freie Repository-Checks), durchgängige curl-Runde aller Endpunkte inkl. 401-Fall, kompletter Browser-Durchlauf (Login → Exercises → Workouts → Settings → Reload) nach frischem `migrate.php`-Lauf.

**Entscheidungen (Details + Begründung im Plan-File der Session, hier nur Pointer):**
- Region-Mapping der 17 FEDB-Muskeln auf die 6 Farbregionen ist eine eigene Zuordnung (nicht im Brief vorgegeben) — dokumentiert in `db/seed/muscle_taxonomy.php`.
- 3-Tab-Shell (Exercises/Workouts/Settings) statt 4 wie im Prototyp — kein "Training"-Tab, da Stufe 1 keine Tracking-Logik hat.
- Keine Muskel-Icons in Listen (Brief-Text §7/§11 folgt, nicht dem visuellen Prototyp).
- "Duplicate & edit" kopiert Muskel-Zuordnung 1:1, editierbar sind nur Skalarfelder (Name/Equipment/Category/Mechanic/Increment) — kein Multi-Select-Editor für Muskel-Rollen.
- Kein PWA-Offline-Datenmodell (IndexedDB-Queue) — laut Roadmap explizit Stufe 2, nur App-Shell-Manifest + Precache jetzt.
- `PUT /api/workouts/:id` ersetzt bei jedem Save die komplette Exercise-Liste (Delete+Reinsert in einer Transaktion) statt granularer Einzel-CRUD — einfacher, unproblematisch ohne Offline-Sync.

**Nächster Schritt:** Kay testet Stufe 1 (siehe README.md Setup-Anleitung). Danach gemeinsam Stufe 2 (Tracking-Loop, Rest-Timer, Körpergewicht, Offline-Sync) planen — nicht vorher anfangen.

---

## Session 2026-08-14 — Stufe 2 komplett (Tracking-Loop, Offline-Sync, Rest-Timer, Körpergewicht)

**Was passiert ist:**
- CLAUDE.md hat für Stufe 2 keinen eigenen Detail-Abschnitt (anders als Stufe 1 mit §11) — Scope aus §2/§4/§6/§8 + Roadmap-Zeile abgeleitet, drei Scope-Fragen vorab mit Kay geklärt (alle „Recommended" gewählt, Details im Plan-File der Session): Stufe-3-Grenze (kein e1RM/Progression/PR/Volumen jetzt), Bodyweight-UI-Platzierung (Settings-Karte statt eigener Tab), Pull-Sync-Umfang (Online-Best-Effort für „letztes Mal"-Vorbelegung, kein voller Historien-Download).
- Backend: `SessionRepository`/`SetRepository`/`BodyweightRepository` mit geteiltem `upsertRow()`-Helper auf `BaseRepository` (Insert-oder-Update per `id`, last-write-wins über `updated_at`-String-Vergleich — funktioniert weil Client und Server exakt dasselbe ISO-8601-Format ohne Millisekunden schreiben). Neue Endpunkte: `POST /api/sync/push` (Batch-Upsert sessions→sets→bodyweight), `GET /api/exercises/:id/last-sets`, `GET /api/bodyweight`.
- Frontend: IndexedDB-Layer (`idb`) mit den drei Stores, Sync-Service (`pushPending()`, getriggert on-start/on-online/nach jeder Tracking-Aktion), `useTrackingStore` (Zustand) für die aktive Session inkl. Rest-Timer über absoluten End-Zeitstempel statt Sekunden-Countdown. Neuer Screen `TrackingPage` (`/track/:workoutId`, außerhalb der Tab-Shell, kein BottomNav) + „Start"-Button in Workouts + Bodyweight-Karte unten in Settings.
- Verifikation: `php api/tests/run.php` erweitert (29 Checks gesamt), curl-Runde inkl. Idempotenz + 401. Browser-Ende-zu-Ende: Workout starten, Sätze abhaken, Rest-Timer (+15s/Skip), **PHP-Server während des Trackens gestoppt** → Satz landet mit `synced:false` in IndexedDB ohne UI-Bruch → Server neu gestartet → nächste Aktion synct automatisch nach (bestätigt in `db/fitness.db`) → Finish-Summary korrekt → zweite Session desselben Workouts belegt Sätze mit den echten letzten Ist-Werten vor (nicht den Defaults) → Toggle-off eines abgehakten Satzes soft-deleted + synct korrekt.

**Entscheidungen (Details im Plan-File der Session):**
- Kein `done`-Flag in `sets` — eine Zeile existiert genau dann, wenn ein Satz tatsächlich abgehakt wurde. Draft-Werte vor „done" sind reine UI-State, nichts wird für nie abgehakte Sätze in IndexedDB geschrieben.
- Rest-Timer läuft über `Date.now() + duration` statt Sekunden-Dekrement — bleibt korrekt auch wenn `setInterval` im Hintergrund-Tab gedrosselt wird.
- Kein Retry-Backoff-Scheduler für den Sync — nächster Trigger (App-Start/online-Event/nächste Aktion) versucht es einfach erneut, reicht für den Scope.

**Nächster Schritt:** Kay testet Stufe 2 (siehe README.md „Offline & Sync"-Abschnitt). Danach gemeinsam Stufe 3 (Progression-Engine, e1RM, PR-Badge, erste Analyse-Charts) planen.

---

## Aktueller Stand

**Stufe 1 (Settings, Exercise-Library, Workout-Templates):** ✅ Abgeschlossen — alle 6 Akzeptanzkriterien aus `CLAUDE.md` §11 erfüllt und verifiziert.
**Stufe 2 (Tracking-Loop, Offline-Sync, Rest-Timer, Körpergewicht):** ✅ Abgeschlossen — verifiziert inkl. echtem Offline/Sync-Test (Server gestoppt/neu gestartet).
**Stufe 3–6:** ⏳ Noch nicht begonnen.
