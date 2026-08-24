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

## Session 2026-08-23 — Stufe-2-Testrunde (Findings) + Stufe 3 komplett

**Was passiert ist:**
- Kay hat Stufe 2 selbst getestet (App lokal gestartet, PHP-Backend auf Port 8010 wegen Port-Konflikt mit einem parallelen Worktree auf 8000 — `frontend/vite.config.ts` lokal umgebogen, bewusst **nicht** committed) und dabei drei echte Bugs/Lücken gefunden, die vor Stufe 3 gefixt wurden:
  1. Zweiter Timer (Gesamtzeit) unter dem Workout-Namen war überflüssig sichtbar → aus dem Display entfernt, läuft weiterhin unsichtbar über Zeitstempel.
  2. Rest-Timer: kein Ton bei Ablauf, „+15s" ungenutzt, Anzeige verschwand sofort bei 0 statt sichtbar zu bleiben → Web-Audio-Beep ergänzt, „+15s" entfernt, Rest-Bar bleibt bis Dismiss sichtbar (grün, „Rest done — keep going").
  3. **Kein Resume/New-Prompt bei abgebrochener Session** — Kay dachte das sei schon gebaut, war es aber nicht. Verlassene Sessions (`ended_at: null`) wurden bei erneutem Start unter einer neuen Session-ID verwaist (Daten selbst nie verloren, da sofort in IndexedDB, aber ohne UI-Weg zum Fortsetzen). Nachgezogen: `findOpenSession`/`getSetsForSession` in `localDb.ts`, `resume()`-Action im Store, Resume/New-Screen in `TrackingPage`. In einem echten Full-Page-Reload-Test verifiziert (kein Duplikat, ID wird korrekt wiederverwendet).
- Danach Stufe 3 (CLAUDE.md §10) geplant (Plan-Mode, Explore-Agent zur Bestandsaufnahme) und umgesetzt: Double-Progression-Suggestion (rein client-seitig, offline-tolerant wie die bestehende Last-Sets-Vorbelegung — kein neuer Endpoint nötig), e1RM (Epley) + PR-Erkennung (ggü. letztem Mal, kein Baseline-PR beim ersten Mal), erster Analyse-Chart (`@nivo/line`, e1RM-Trend im Exercise-Detail) mit neuem Endpoint `GET /exercises/:id/history`. Volumen-Vergleich pro Workout (`GET /workouts/:id/last-session-volume`) kam als Zwischenschritt schon während der Stufe-2-Nacharbeit dazu, ersetzt „Sets" durch „Volume" im Finish-Summary.
- Nebenbei: Demo-Workout „Full Body Starter" (5 Übungen, 3 Compound + 2 Isolation) wird jetzt beim Seed mitgeliefert (`db/seed/workouts.php`), damit man nach `migrate.php` sofort etwas zum Tracken hat.
- Verifikation: `php api/tests/run.php` auf 37 Checks erweitert (grün), `tsc`/`oxlint` clean, kompletter Browser-Durchlauf (Rest-Timer-Ablauf, Resume-Flow, Suggestion vor/nach Trigger, PR-Badge, e1RM-Chart).

**Entscheidungen:**
- Progression-Vorschlag ersetzt **nicht** die Vorbelegung mit den letzten Ist-Werten, sondern steht als separater Hinweis + „Use suggestion"-Button daneben — CLAUDE.md §8 verlangt explizit beides nebeneinander, kein stilles Überschreiben.
- PR-Vergleich nutzt e1RM (ein Wert erfasst Gewicht- und Rep-Verbesserung gemeinsam) statt drei einzelne Bedingungen — bewusste Vereinfachung.
- Plateau-/Deload-Detection bleibt draußen, ist laut Roadmap explizit Stufe 6.
- `frontend/vite.config.ts`-Portänderung (8010 statt 8000) ist rein lokal für diesen Worktree wegen des Port-Konflikts — nicht committed, betrifft niemanden sonst.

**Nächster Schritt:** Kay testet Stufe 3 selbst. Danach gemeinsam Stufe 4 (Muskel-Heatmap, Radar, ACWR, Dashboard) planen.

---

## Aktueller Stand

**Stufe 1 (Settings, Exercise-Library, Workout-Templates):** ✅ Abgeschlossen — alle 6 Akzeptanzkriterien aus `CLAUDE.md` §11 erfüllt und verifiziert.
**Stufe 2 (Tracking-Loop, Offline-Sync, Rest-Timer, Körpergewicht):** ✅ Abgeschlossen — inkl. Nacharbeiten aus Kays Testrunde (Rest-Timer-UX, Resume/New bei abgebrochener Session).
**Stufe 3 (Progression-Engine, e1RM, PR-Erkennung, erster Analyse-Chart):** ✅ Abgeschlossen — verifiziert, noch ungetestet von Kay.
**Stufe 4 (Muskel-Heatmap, Radar, ACWR, Dashboard):** ✅ Abgeschlossen — verifiziert, noch ungetestet von Kay.
**Stufe 5 (BIA-Import, HR-Import/-Matching, Body-Measurements, Backup/Restore):** ✅ Abgeschlossen — von Kay live getestet, zwei echte Bugs gefunden und gefixt (Semikolon-CSV, Restore-Last-Write-Wins).
**Stufe 6 Runde 1 (Plateau-Detection, CSV/PDF-Export):** ✅ Abgeschlossen — verifiziert, noch ungetestet von Kay. Kalorien-Schätzung bewusst zurückgestellt (BACKLOG #15).
**Stufe 3–4:** weiterhin ungetestet von Kay.

---

## Session 2026-08-23 (Fortsetzung) — Stufe 4 komplett

**Was passiert ist:**
- Direkt nach Stufe 3 committed (Kay wollte ohne Test-Pause weiter), Plan-Mode + Explore-Agent zur Bestandsaufnahme (Navigation/BottomNav-Struktur, Muskel-Farbmapping, Settings-Schema, bestehende Repository-Joins), dann Stufe 4 (CLAUDE.md §10) geplant und umgesetzt.
- Zwei Stellen, die CLAUDE.md nicht exakt festlegt, aus bestehenden CLAUDE.md-Aussagen aufgelöst statt geraten: „Heatmap" = echte Nivo-Daten-Heatmap (Region × Woche), nicht ein Körper-Silhouette-SVG — CLAUDE.md §3 nennt `@nivo/heatmap` explizit. MEV/MAV/MRV = neue Referenztabelle `muscle_volume_targets` (gleiches Muster wie `training_modes`/`muscles`), Default-Werte sind ein vertretbarer Startpunkt aus gängiger Trainings-Volumen-Literatur, keine Wissenschaft in Stein gemeißelt.
- Backend: `api/lib/MuscleVolume.php` (reine PHP-Engine — ISO-Wochen-Bucketing, Sekundär-Gewichtung ×0,5 für Sets/Volumen, e1RM als Peak statt Summe, ACWR-Formel), `SetRepository::rawSetsWithMuscles()` (erster Join im Code der primary UND secondary Muskelzuordnungen mit Gewicht liest, nicht nur `role='primary'` wie die bestehenden Joins in ExerciseRepository/WorkoutRepository), `SetRepository::dailyVolume()`, `MuscleRepository::volumeTargets()`. Neue Endpoints `GET /dashboard/muscle-volume`, `GET /dashboard/acwr`.
- Frontend: neuer Dashboard-Tab, jetzt Landing-Screen (Index-Redirect von `/exercises` verschoben) — passt zum „Status auf einen Blick"-Zweck dieser Stufe. `MuscleVolumeStatusList` (Ampel-Liste gegen MEV/MAV/MRV, eigene Komponente statt ins Radar gequetscht), `MuscleHeatmap` (`@nivo/heatmap`, Ein-Hue-Skala), `MuscleRadar` (`@nivo/radar`, 6 Achsen, Sets/Volume/e1RM-Toggle, diese vs. letzte Woche), `AcwrCard` (Ratio + client-seitige Ampel-Farbe, gleiches Muster wie der Volumen-Delta aus Stufe 3).
- Verifikation: `php api/tests/run.php` auf 62 Checks erweitert (25 neu — Wochen-Bucketing, Sekundär-Gewichtung, e1RM-als-Max, ACWR-Mathematik, echte Repository-Joins), `tsc`/`oxlint` clean, kompletter Browser-Durchlauf mit den bereits vorhandenen Testdaten (ACWR/Status-Liste/Heatmap/Radar rendern korrekt, alle drei Radar-Metriken durchgeklickt).

**Entscheidungen:**
- ACWR ist Gesamtkörper-Trainingslast, nicht pro Muskel (Sportwissenschafts-Konvention, passt zu CLAUDE.md §8s Wortlaut ohne Muskel-Bezug).
- Sets und Volumen sind additiv pro Region (Sekundär ×0,5); e1RM ist es nicht (Übungen lassen sich nicht addieren) — deshalb im Radar als Maximum statt Summe.
- Bekannte Einschränkung wie schon beim e1RM-Chart aus Stufe 3: die Heatmap zeigt nur die aktuelle Woche gefüllt, da alle bisherigen Testdaten von heute stammen — bei echter Nutzung über mehrere Wochen kein Problem.

**Korrektur (siehe Session-Eintrag direkt danach):** Die Heatmap-Entscheidung oben war falsch — Kay hat zu Recht auf den Prototyp verwiesen, der eine Körper-Silhouette statt eines Datengitters zeigt. In der Fortsetzungs-Session direkt umgebaut.

**Nächster Schritt:** Kay testet Stufe 3 + Stufe 4 zusammen. Danach gemeinsam Stufe 5 (BIA-Import, HR-Import/-Matching, Body-Measurements) planen.

---

## Session 2026-08-23 (Fortsetzung 2) — Stufe 4 Teil 2: Dashboard an den Prototyp angeglichen

**Was passiert ist:**
- Kay: "im Prototypen waren die Analyse-Einsicht schon deutlich umfangreicher. warum ist das jetzt so wenig?" — berechtigter Punkt. Direkter Vergleich mit `docs/references/workout-app-v3.html`s `vAnalysis()`/`aOverview()`/`aExercise()`/`aWorkout()`/`bodyHeat()` ergab zwei Kategorien Lücke:
  1. Korrekt zurückgestellt: Body-Scope (braucht BIA-Daten, Stufe 5) und die Plateau-Karte (explizit Stufe 6) — beide bleiben draußen.
  2. Echte Lücke: die Muskel-"Heatmap" war als Nivo-Datengitter gebaut (gestützt auf CLAUDE.md §3s Tech-Stack-Zeile), der Prototyp zeigt aber eine Körper-Silhouette (`bodyHeat()`). CLAUDE.md sagt selbst "UX-/Visual-Referenz ist der Prototyp" — das hätte stärker gewogen. Dazu fehlten KPI-Kacheln mit Sparkline, ein Consistency-Kalender, und die Exercise-/Workout-Analyse-Scopes aus dem Prototyp-Segmented-Control.
- Plan-Mode (ohne neuen Explore-Agent, Codebase aus den letzten beiden Sessions noch vollständig im Kontext) für Teil 2, dann umgesetzt:
  - `MuscleHeatmap` (Nivo) entfernt, ersetzt durch `MuscleBodyMap` — SVG-Pfade 1:1 aus dem Prototyp übernommen, aber auf die bestehenden 6 Regionen reduziert (nicht die 11 feineren Prototyp-Zonen) — bleibt konsistent mit der einzigen im Rest der App verwendeten Taxonomie.
  - `statusFor()` nach `lib/muscleStatus.ts` extrahiert, damit Body-Map und Status-Liste dieselbe Ampel-Logik teilen.
  - Neue KPI-Kacheln (Volume/Woche, Sessions/Woche, ACWR) mit handgerollter SVG-Sparkline (kein neues Nivo-Paket für eine Mini-Linie) — dafür neue Backend-Aggregationen `MuscleVolume::weeksFromDaily()`, `::acwrWeeklySeries()`, `SessionRepository::recentDates()`.
  - Consistency-Kalender (echte UTC-Daten, kein Nivo).
  - `MuscleRadar` verallgemeinert auf generische `{label, color, values}`-Serien (statt hart auf Region-Objekte verdrahtet) — Metrik-Toggle-Besitz liegt jetzt beim jeweiligen Scope, nicht mehr in der Radar-Komponente selbst.
  - Dashboard ist jetzt ein 3-Scope-Screen (Overview/Exercise/Workout, Segmented Control) mit Zeitraum-Selector (3M–All, nur Overview). Exercise-Scope: Suche + e1RM/Best-Set-KPIs + bestehender e1RM-Chart + neue "Progression Ladder" (`sessionSummariesForExercise`). Workout-Scope: Workout-Wahl + Sessions/Ø-Dauer-KPIs + neuer `@nivo/bar`-Stacked-Muscle-Split + Signature-Radar (`muscleSplitForWorkout`).
- Verifikation: `php api/tests/run.php` auf 79 Checks erweitert (17 neu), `tsc`/`oxlint` clean, kompletter Browser-Durchlauf — Body-Map-Füllfarben direkt aus dem DOM ausgelesen und gegen die Status-Liste gegengeprüft (alle 6 Regionen auf beiden Figuren korrekt), Exercise- und Workout-Scope komplett durchgeklickt mit echten Testdaten.

**Entscheidung:** Kein 4. KPI "e1RM Bench" im Overview (anders als Prototyp) — welche einzelne Übung "die" Overview-Kennzahl sein soll ist für echte Nutzer mit vielen Übungen nicht wohldefiniert. e1RM lebt stattdessen im Exercise-Scope, wo eine Übung explizit gewählt wird.

**Nächster Schritt:** Kay testet Stufe 3 + Stufe 4 (inkl. der Nacharbeit) zusammen. Danach gemeinsam Stufe 5 (BIA-Import, HR-Import/-Matching, Body-Measurements) planen.

---

## Session 2026-08-23 (Fortsetzung 3) — Stufe 4 Teil 3: Zeitraum überall, Body-Tab, Glossar

**Was passiert ist:**
- Kay hat den Prototyp direkt im Browser gesehen (`docs/references/workout-app-v3.html` per `window.nav('analysis')` aufgerufen, da Klicks im Preview-Pane in dieser Session unzuverlässig timeouten — JS-Injection als Workaround) und drei konkrete Nacharbeiten gewünscht, mit expliziten Zielen pro Scope (Overview: Trend/Balance/Load/Consistency auf einen Blick; Exercise: Plateau/Overload je Übung; Workout: Regelmäßigkeit/Balance/Signature/Splits):
  1. Zeitraum-Switch (3M/6M/12M/All, kein 9M — so von Kay benannt) auf allen vier Scopes, nicht nur Overview.
  2. Body-Tab als Platzhalter (Segmented Control komplett, Inhalt erst mit Stufe-5-BIA-Import).
  3. Info-Buttons (ⓘ) für Fachbegriffe wie im Prototyp (`glossary()`/`glossTerm()`).
- Backend: `historyForExercise`/`sessionSummariesForExercise`/`muscleSplitForWorkout` um optionalen `$sinceDays`-Parameter erweitert — abwärtskompatibel (bestehender `ExerciseDetailSheet`-Aufruf mit nur `?limit=` bleibt unverändert), neuer `?weeks=`-Query-Param auf den drei Endpoints.
- Frontend: `lib/dashboardRanges.ts` (einzige Quelle für die Range-Optionen, ersetzt die bisherige Overview-lokale Kopie), Zeitraum-Switch in Exercise-/Workout-Scope ergänzt (Ladder/Stacked-Bar-Limit dabei von 6 auf 20 angehoben, da ein weiterer Zeitraum auch mehr Zeilen zeigen soll), `BodyScope` (Platzhalter, ehrlicher Empty-State, keine erfundenen BIA-Zahlen), Glossar-System (`lib/glossary.ts`, `useGlossaryStore`, `GlossarySheet`, `InfoButton`) — ein Sheet, von überall im Scope-Baum ansteuerbar ohne Prop-Drilling, mit Fokus+Highlight auf einen bestimmten Begriff.
- Verifikation: `php api/tests/run.php` auf 88 Checks erweitert (10 neu — Cutoff-Verhalten je Methode, inkl. Bestätigung dass der alte `limit`-only-Pfad unverändert funktioniert), `tsc`/`oxlint` clean, kompletter Browser-Durchlauf (Range-Wechsel per Netzwerk-Log auf korrekten `weeks=`-Wert verifiziert, Glossar-Header-Button + fokussierter MEV-Button beide geprüft).

**Nächster Schritt:** Kay testet Stufe 3 + Stufe 4 komplett. Danach gemeinsam Stufe 5 (BIA-Import, HR-Import/-Matching, Body-Measurements) planen — Body-Scope wird dann inhaltlich gefüllt.

---

## Session 2026-08-24 — Stufe 5: BIA-Import, HR-Import/-Matching, Body-Measurements, Backup/Restore

**Was passiert ist:**
- Plan-Mode über drei Runden, jeweils mit Kays Korrekturen gegen einen ersten Entwurf geprüft, bevor umgesetzt wurde:
  1. BIA-Import ist kein fixer Server-Dateipfad, sondern ein echter mobiler Workflow: Scan fotografieren → externe KI füllt eine herunterladbare CSV-Vorlage aus → Upload in der App. Dedupe-Schlüssel `(external_id, measured_at)` zusammen, nicht `external_id` allein — Kays reale Datei (`uploads/fitness-export-bia.csv`) hat zwei verschiedene Scans mit identischer ID.
  2. FitScore (`Fitnessbewertung/Punktzahl` + `/Skala`) ist ein echtes InBody-Feld, keine erfundene Kennzahl — als fünfte KPI-Kachel übernommen.
  3. HR-Import (Apple Health `export.xml`) bekommt ebenfalls einen Upload-Button in Settings statt nur eines Server-Dateipfads; ein komplettes Backup/Restore (JSON, alle individuell erzeugten Daten außer Seed-Referenztabellen) kommt in denselben Settings-Bereich; die Body-Scope-Detailansicht zeigt alle importierten BIA-Werte, nicht nur die 5 KPIs — Kay: „die App soll den Ausdruck voll ersetzen."
- Backend: `BiaImport.php`/`HrImport.php` (reine Parser/Matcher, kein DB-Zugriff), `BiaRepository`/`HrRepository`/`BodyMeasurementRepository`/`BackupRepository` (neu), `SessionRepository::allTimeWindows()`. `HrImport::matchFromAppleHealthXml()` nutzt `XMLReader` (Streaming, kein `SimpleXML`/`DOMDocument`) gegen die reale 165-MB-Exportdatei, Zwei-Zeiger-Sweep gegen sortierte Session-Fenster statt einer Sample×Session-Schleife. `BackupRepository` exportiert/importiert 13 Tabellen (Restore nutzt `BaseRepository::upsertRow()` überall wo `id`+`updated_at` existiert, sonst Insert-falls-fehlt für `bia_values`/`hr_samples`/`media`/`exercise_muscles`, Key-Upsert für `settings`) — FEDB-Übungen und reine Seed-Tabellen bewusst ausgeschlossen (via `php db/migrate.php` reproduzierbar). Neue Endpoints unter `/bia/*`, `/hr/import`, `/body-measurements`, `/backup/export`+`/backup/import`. `db/migrate.php` bekam eine erste additive Spalten-Migration (`bia_measurements.external_id`, try/catch statt PRAGMA-Introspektion — portabel für den MySQL-Fallback).
- Frontend: `BiaMeasurementDetailSheet` (alle Werte einer Messung, nach Kategorie gruppiert — wiederverwendet in Settings-Scan-Liste und Body-Scope-Historie), `BodyScope` komplett neu (5 KPI-Kacheln + Sparklines + Scan-Historie, ehrlicher Empty-State ohne Daten), vier neue Settings-Karten (Body composition/BIA, Heart rate, Body measurements — Bandmaß-Schnelleingabe nach exakt dem Bodyweight-Muster inkl. IndexedDB-Store-Version-Bump, Backup). `api.upload()` (multipart, FormData) neu in `lib/api.ts` — `request()` musste angepasst werden, den JSON-`Content-Type`-Header bei `FormData`-Bodies wegzulassen (sonst hätte der Browser den Multipart-Boundary nicht selbst setzen können).
- Verifikation: `php api/tests/run.php` von 88 auf 118 Checks erweitert (BiaImport-Parsing inkl. Einheiten-Suffix/Bereichs-Erkennung, der reale Dedupe-Bug, HrImport-Fenster-Matching mit einer synthetischen XML-Fixture, BackupRepository-Roundtrip inkl. explizitem Test dass FEDB-Übungen nicht exportiert werden), `tsc`/`oxlint` clean, `php db/migrate.php` zweimal gegen eine Wegwerf-DB (idempotent, Spalten-Migration greift). Kompletter Browser-Durchlauf gegen die echte laufende Dev-DB: Kays reale BIA-CSV importiert (4 Scans, 60 Werte je Scan), Re-Import idempotent (0 importiert/4 übersprungen), Body-Scope zeigt alle 5 echten KPI-Werte + Sparklines, Detail-Sheet zeigt alle 60 Werte gruppiert, Löschen über die echte UI verifiziert, HR-Import gegen eine synthetische Apple-Health-XML mit einer echten Session aus der Dev-DB (nur das Sample im Session-Fenster wurde übernommen), Backup-Export→Import-Roundtrip gegen die echte DB (idempotent), Body-Measurements-Karte über die echte UI gespeichert und in SQLite verifiziert.

**Entscheidungen:**
- Backup/Restore ist bewusst kein Vorgriff auf Stufe 6 (CLAUDE.md §10 nennt dort "Export/PDF") — Stufe 6 meint menschenlesbare Reports, dieser Mechanismus ist ein roher JSON-Datensicherungs-Mechanismus, motiviert durch CLAUDE.md §2s "kein Lock-in". `settings` (inkl. `password_hash`) ist Teil des Backups, da es echte Nutzerkonfiguration ist, keine Seed-Daten.
- Body-Scope-Zeitraum-Switch (3M/6M/12M/All) bleibt für UI-Konsistenz mit den anderen drei Scopes bestehen, filtert aber nichts — BIA-Scans sind zu selten (ein paar pro Jahr) als dass eine Zeitraum-Filterung sinnvoll wäre. Backlog-Kandidat falls die Scan-Frequenz mal deutlich steigt.
- Kein Foto→KI-Extraktion in der App selbst — die KI-Übertragung Foto→CSV passiert bei Kay, außerhalb der App.

**Nächster Schritt:** Kay testet Stufe 5 (inkl. Stufe 3+4, noch offen). Danach Stufe 6 (Export/PDF, Plateau-/Deload-Detection, Deep-Analytics) planen.

---

## Session 2026-08-24 (Fortsetzung) — Kays echter Testlauf: zwei Bugs gefunden und gefixt

**Was passiert ist:**
- Für Kays eigenen Testlauf ein interaktives Checklisten-Artifact gebaut (27 Testfälle über Stufe 3–5 + Offline-Regression, lokal gespeicherter Fortschritt, Notizfeld, Export-Funktion) — kein Teil des Repos, nur ein Hilfsmittel für die Session.
- Kay hat tatsächlich mit echten Dateien getestet (nicht nur durchgeklickt) und zwei reale Bugs gefunden, die mit meinen eigenen synthetischen Testdaten vorher nicht aufgefallen waren:
  1. **BIA-Import scheiterte komplett bei Semikolon-getrennter CSV.** Kay hatte die heruntergeladene Vorlage in einer Tabellenkalkulation (deutsches Gebietsschema, Komma = Dezimaltrennzeichen) bearbeitet und gespeichert — dabei wird beim Speichern standardmäßig Semikolon statt Komma als Trennzeichen verwendet. `BiaImport::parse()` hatte das Trennzeichen hart auf `,` codiert; jede Zeile hatte dadurch nur 1 Feld statt der erwarteten Spalten → `count($row) < 3` → jede Zeile wurde übersprungen → 0 importiert, 0 übersprungen, bei jedem Versuch, unabhängig vom Dateiinhalt. Direkt an Kays realer Datei (`~/Desktop/bia-template.csv`) reproduziert und gefixt: Trennzeichen wird jetzt aus der Kopfzeile erkannt (mehr `;` als `,` → Semikolon), sonst Komma.
  2. **Backup-Restore konnte eine Löschung nicht rückgängig machen.** Kay hatte ein Backup heruntergeladen, danach ein Workout gelöscht, und wollte über Restore genau das rückgängig machen — das Workout blieb aber verschwunden. Ursache: `BackupRepository::importUpsertTable()` nutzte bisher `BaseRepository::upsertRow()` — dasselbe Last-Write-Wins-Prinzip wie beim Live-Sync (CLAUDE.md §4). Das Löschen aktualisiert `updated_at` auf den Löschzeitpunkt; das ist neuer als der Zeitstempel im (älteren) Backup → der Restore wurde als "veraltet" stillschweigend verworfen. Genau falsch herum für eine explizite Wiederherstellungs-Aktion. Direkt an Kays realer Backup-Datei (`~/Downloads/gym-tracker-backup-2026-08-24.json`) reproduziert und gefixt: Restore überschreibt jetzt bedingungslos (`BackupRepository::forceUpsertRow()`, kein Timestamp-Vergleich) — die wiederhergestellte Datei ist immer maßgeblich, nicht die aktuelle DB.
- Beide Bugs mit dedizierten Regressionstests abgesichert (`api/tests/run.php`, 118 → 122 Checks: Semikolon-Parsing, und explizit "ein gelöschtes Workout wird durch Restore eines älteren, nicht-gelöschten Backups wiederbelebt"), Settings-Backup-Hinweistext ergänzt ("Restoring always applies the file's data, even over newer changes"), `tsc`/`oxlint` clean.
- Kays reale BIA-Daten und das gelöschte Workout in seiner laufenden Dev-DB direkt wiederhergestellt (Duplikate aus der Fehlersuche bereinigt), per Browser verifiziert (Workouts-Liste + Body-Dashboard zeigen wieder den korrekten Stand).

**Entscheidung:** Restore-Semantik ist bewusst NICHT dieselbe wie Live-Sync — Live-Sync schützt vor einem Offline-Gerät, das versehentlich neuere Server-Änderungen überschreibt; ein explizites Restore ist eine bewusste, einmalige Nutzeraktion ("dieser Snapshot soll jetzt gelten") und muss deshalb immer gewinnen, unabhängig von `updated_at`.

**Nächster Schritt:** Kay testet weiter (Stufe 3+4 stehen noch aus). Vorschlag an Kay offen: soll ein gelöschter BIA-Scan beim erneuten Hochladen derselben Quelldatei wieder auftauchen (aktuelles, bewusstes Verhalten — ermöglicht Korrektur einer fehlerhaften Datei) oder für immer blockiert bleiben?

---

## Session 2026-08-24 (Fortsetzung 2) — Stufe 6 Runde 1: Plateau-Detection, CSV/PDF-Export

**Was passiert ist:**
- Kay: "dann geh die nächste Stufe an." Plan-Mode (ohne neuen Explore-Agent, Codebase aus dieser Session noch vollständig im Kontext) für Stufe 6 (CLAUDE.md §10: "Export/PDF, Plateau-/Deload-Detection, Deep-Analytics"). Scope-Entscheidung: Plateau-Detection UND Export komplett umgesetzt, "Deep-Analytics" wird durch die Plateau-Detection selbst erfüllt (CLAUDE.md §8 nennt sie explizit "Differenzierer") — die einzige noch offene §8-Idee, Kalorien-Schätzung (Keytel, HR-basiert), bewusst zurückgestellt (CLAUDE.md markiert sie selbst als "später"; eigene offene Fragen zu Gewichtsquelle/Geschlecht-Parsing/UI-Fläche) → BACKLOG #15.
- **Plateau-Detection:** `lib/plateau.ts::detectPlateau()` (reine Funktion, kein neuer Endpoint — nutzt die bereits von `ExerciseScope` geladene e1RM-Historie) vergleicht aktuelles e1RM gegen den Wert von N Sessions davor (N = neuer Settings-Key `plateau_sessions`, Default 4, editierbar in Settings). `ExerciseScope` zeigt bei Treffer einen Plateau-Banner plus — als Antwort auf Kays ursprüngliches Stufe-4-Teil-3-Ziel "Plateau UND Overload erkennen" — eine kompakte Gesamtkörper-ACWR-Zeile (bewusst nicht als erfundener Pro-Übungs-Overload-Wert deklariert).
- **CSV-Export:** `SetRepository::exportRows()` + `GET /export/training-log.csv` — ein Trainings-Log (eine Zeile pro Satz, e1RM serverseitig mit derselben Formel wie überall sonst), bewusst nicht ein Export pro Tabelle (das wäre nur eine schlechtere Kopie von Stufe 5s JSON-Backup).
- **PDF-Export:** kein PHP-PDF-Dependency (CLAUDE.md §3/§12: "keine unnötigen Dependencies") — stattdessen `ReportPage.tsx` unter neuer Route `/report` (außerhalb `AppShell`, wie `/track/:workoutId`), druckoptimiertes Layout, `window.print()` → jeder Browser bietet "Als PDF speichern". Neuer globaler `@media print`-Override in `index.css` erzwingt die Light-Palette-Tokens unabhängig vom aktiven Theme — ohne das wäre ein Ausdruck im (Standard-)Dark-Theme helle Schrift auf weißem Papier, da Browser `background-color` beim Drucken meist weglassen, `color` aber nicht.
- Verifikation: `php api/tests/run.php` auf 136 Checks erweitert (3 neu für `exportRows()`), `tsc`/`oxlint` clean. Kompletter Browser-Durchlauf gegen die echte laufende Dev-DB: CSV-Export stichprobenartig gegen SQL gegengeprüft (inkl. Epley-e1RM-Handrechnung, leeres e1RM bei Warmup), Plateau-Banner mit einer temporären synthetischen Test-Übung (5 Sessions, absichtlich flaches e1RM) verifiziert und danach wieder gelöscht, Glossar-Eintrag "Plateau" geprüft, `/report` lädt echte Overview/Muscle-Load/Consistency/BIA-Daten, Print-CSS-Regel im kompilierten Stylesheet bestätigt.

**Nächster Schritt:** Kay testet Stufe 3, 4 und 6 (Stufe 5 ist getestet). Danach: Kalorien-Schätzung (BACKLOG #15) oder ein anderes P2/P3-Backlog-Item, je nach Kays Priorität.
