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

---

## Session 2026-08-24 (Fortsetzung 3) — Repo umbenannt, dritter Bug gefunden, Exercise-Scope-Redesign, 2 Backlog-Items

**Was passiert ist:**
- Kay: Workspace-Ordner umbenennen (`kw_*` → `kw-*` für alle vier `kw_`-Projekte), lokales `main` synchronisieren, ab jetzt nur noch dort arbeiten, die beiden anderen Worktrees ignorieren. Durchgeführt: `mv` aller vier Ordner, `git worktree repair` für alle drei an `kw-gym-tracker` hängenden Worktrees (Hauptrepo + diese Session + die zwei ignorierten — Reparatur ist reine Git-Hygiene, keine inhaltliche Arbeit dort), lokales `main` per `git merge --ff-only origin/main` synchronisiert.
- **Dritter echter Bug gefunden:** Der laufende PHP-Dev-Server (Prozess von vor der Umbenennung) beantwortete nach dem Rename JEDEN Mehrsegment-Pfad (`/auth/login`, `/auth/status`, `/dashboard/acwr`, `/bia/latest`, vermutlich auch `/bia/import`, `/backup/import`) mit 404 — Einzelsegment-Pfade (`/settings`, `/workouts`) funktionierten weiter. Root Cause nicht abschließend geklärt (vermutlich eine interne, beim Start absolut aufgelöste Pfadangabe in PHPs eingebautem Server, die durchs Renamen bricht), aber empirisch zweifelsfrei bestätigt: ein frischer `php -S`-Prozess auf demselben Code funktioniert sofort korrekt. Alter Prozess gekillt, neuer gestartet — Login und alle Mehrsegment-Routen funktionieren wieder.
- Das erklärt wahrscheinlich einen Teil von Kays Testfeedback (Backup-Restore "funktioniert nicht", Body-Tab-FitScore "fehlt") — beides direkt nachgestellt und bestätigt korrekt funktionierend (Backup-Restore: PHP-CLI-Test deleted→restored→zurück; FitScore: DB→Repository→API-Shape→Frontend-Lookup alle einzeln geprüft, exakter Match). BIA-Import "0 imported" bleibt ungeklärt — die vermutete Datei in `~/Downloads/bia-template.csv` war beim Nachtesten eine unausgefüllte Vorlage, nicht die tatsächlich hochgeladene Datei; müsste erneut mit der echten Datei reproduziert werden.
- **Exercise-Scope neu gestaltet** (Kay-Feedback: "ein Diagramm mit 3 Linien für e1RM, Volumen und Sets reicht"): `MultiMetricTrendChart.tsx` (neu) ersetzt die beiden KPI-Kacheln + den alten Nur-e1RM-Chart. Alle drei Metriken sind auf ihr jeweiliges Maximum normiert (0–100%) geplottet, da sie auf völlig unterschiedlichen Skalen liegen (kg vs. Satzanzahl) — es geht um die gemeinsame Trendrichtung, nicht absolute Werte auf einer Achse; echte Werte stehen als kompakte Zahlenreihe über dem Chart und im Tooltip. X-Achse jetzt nach Session-Index statt Datums-String (behebt nebenbei Backlog #8, mehrere Sessions am selben Tag). `SetRepository::historyForExercise()` liefert dafür jetzt zusätzlich `sets_count`. Zwei neue CSS-Variablen `--metric-volume` (= brand-accent, konsistent mit der Overview-KPI) und `--metric-sets` (neuer Teal-Ton). Visuell nicht durchgeklickt (kein Zugriff auf Kays Passwort, Versuch über eine gefälschte PHP-Session verworfen — würde Auth-Zustand anfassen) — nur tsc/lint clean + Logik-Review gegen das bereits bewährte `E1rmTrendChart`-Muster.
- **Backlog #9 (MEV/MAV/MRV editierbar):** neue Settings-Karte "Weekly volume targets", ein NumberField-Trio pro Muskelregion, exakt das Trainingsmodi-Editor-Muster. Neu: `GET/PUT /muscle-volume-targets`, `MuscleRepository::listVolumeTargets()/updateVolumeTarget()`.
- **Backlog #4 (Rep-Range-/Increment-Override-UI):** Workout-Editor hat jetzt pro Übung einen einklappbaren "Override rep range / increment"-Bereich (Reps-Von-Bis + Schritt-NumberField + "Reset to workout default"). Backend akzeptierte diese Felder bereits vollständig (`WorkoutRepository::replaceExercises()`), nur die UI fehlte.
- Verifikation: `php api/tests/run.php` auf 141 Checks erweitert, `tsc`/`oxlint` clean, Backend-Rundtrips für Override-Felder und Volume-Targets per PHP-CLI direkt gegen die Live-DB geprüft (danach bereinigt).

**Zurückgestellt aus dieser Runde** (Zeit-/Umfangsgründe, nicht vergessen): Backlog #2 ("In your workouts"/meistgenutzt im Exercise-Picker), #3 (Muskel-Zuordnung im Exercise-Editor neu setzbar), #7 (Naming-Konvention), #15 (Kalorien-Schätzung).

**Nächster Schritt:** Kay testet den neuen Exercise-Scope-Chart, die Volume-Targets-Karte und die Rep-Range-Override-UI live (inkl. nochmal BIA-Import mit der tatsächlich hochgeladenen Datei, falls das Problem weiterhin besteht). Danach ggf. weiter mit #2/#3 aus dem Backlog.

---

## Session 2026-09-02 — Body-Dashboard, Nomenklatur für alle Übungen, Gainsfire-Migration

**Was passiert ist:**
- **Body-Dashboard neu gebaut** (Kay: „sehr lahm", „Karten langweilig", „Zeitraum ändert nichts"): neuer Bulk-Endpoint `GET /bia/series` statt 1+N Requests, FitScore-Halbkreis aus dem Prototyp, Zeitraum-Schalter verdrahtet, Segmentanalyse auf der Body-Figur (Frontansicht, Muskel/Fett-Toggle), Zusammensetzungs-Metriken als Bullet-Charts gegen den Normbereich, BMI auf den vier Kategorien des Ausdrucks, Weight-vs-Target und Muscle-vs-Fat als getrennte Charts. Sichtbar jetzt ~35 statt 5 Werte pro Scan.
- **Farb-Audit** nach Kays Frage: die Detail-Kacheln trugen je eine Muskelgruppen-Farbe — die bedeutet in der App eine Körperregion, und Grün neben einem sich verschlechternden Wert liest sich als Zustimmung. Alle Sparklines jetzt neutral, Farbe nur auf der Veränderung, Richtung explizit („higher is better"). Eigene Farbfamilie `--body-*` deklariert.
- **Nomenklatur für alle 873 Übungen** (Kay: „ich gehe davon aus, dass du allen Übungen einen nominalen Titel zugewiesen hast"): 107 fielen noch auf den FEDB-Rohnamen zurück. `MOVEMENT_BY_NAME` für Gym-Slang (Cocoons, Otis-Up), `MOVEMENT_BY_CATEGORY` als Rückfall (stretching → Stretch). `category` musste in `selectColumns()` — sonst hätte dieselbe Übung im Workout wieder anders geheißen als in der Bibliothek.
- **„My library"-Filter entfernt** — mit Titeln für alle 873 war die Trennung als Browsing-Filter sinnlos. `is_curated` bleibt als Handprüf-Flag und rankt Treffer.
- **Gainsfire-Migration** gebaut: `scripts/gainsfire-to-backup.py` + `scripts/gainsfire-mapping.tsv`, Ergebnis als Backup-JSON in `uploads/`. 2775 Sätze, 122 Sessions, 22 Workouts, Mai 2025 – Juni 2026.
- **BIA vervollständigt**: der März-2026-Scan fehlte, lag nur im XLSX von `kw-gym-performance`; der August-Scan lag in `~/Projects/GYM-Fitness/`. Beide eingearbeitet, sechs Scans vollständig, gegen die Original-Fotos gegengelesen.

**Entscheidungen:**
- Migration läuft über Backup-Restore statt über einen neuen Import-Endpoint — der Pfad ist getestet, upsertet per ID und lässt Bestehendes stehen. Gegen eine Kopie der Live-DB verifiziert: Kays drei aktiven Workouts überleben mit unveränderten IDs.
- `is_curated` heißt weiterhin „von Hand geprüft" und nicht „hat einen Titel" — das sind zwei verschiedene Dinge, und nur Ersteres rechtfertigt eine Sonderbehandlung.

**Gefundene Fehler:**
- Der Gainsfire-Export enthält **jeden Satz doppelt** unter zwei Schreibweisen (15 Gruppen, 380 Zeilen, 12 %). Ungefiltert hätte das jede Volumenzahl verfälscht.
- Erster Testimport verlor **579 Sätze**: zwei Gainsfire-Namen mappen auf dieselbe App-Übung am selben Tag und kollidierten auf der deterministischen Satz-ID. Nummerierung läuft jetzt nach dem Mapping.

**Nächster Schritt:** Kay importiert die Migration und testet im Training. Danach frischer Gainsfire-Export (der vorhandene endet 12.06.2026) und Mapping-Durchsicht in eigener Session.

---

## Session 2026-09-12/13 — „Übung nicht zu finden", verlorene Workout-Edits, Bilder 4:3

**Was passiert ist:**
- Kay konnte im Gym `Abs Rotation Cable` nicht finden und seine Löschung im Friday-Workout war nicht gespeichert. Live-DB mehrfach per `deploy/backup.sh` gezogen (`backups/diag-*`, `pre-/post-restore-20260913`): Übung vorhanden, Suche findet sie in jeder Schreibweise — seit 09.09. war aber **kein einziges Workout** mehr geschrieben worden.
- Ursache: Session-Cookie ohne Lifetime + 24-Min-GC des Hosts → 401 mitten im Training. Suchlisten zeigten den Fehler als „No matches", `handleSave` im Workout- und Übungs-Editor hatte kein `catch` und sah nach Erfolg aus. Fix: Commit `2623f0d` (Details in der Commit-Message).
- `/code-review` fand drei weitere Punkte (Draft-Verlust durch 401-Redirect, veraltete Suchantworten, fixe statt gleitende Cookie-Laufzeit) — alle gefixt, bevor committet wurde.
- Browser-Verifikation gegen eine Kopie der Live-DB: Session getötet → Save → Login-Overlay über dem Editor, Entwurf bleibt, Save danach landet in der DB; derselbe Ablauf mit offenem Übungs-Picker. Bild: 4:3-Box, `object-fit: contain` gemessen.
- Daten live per `deploy/restore.sh` (Payload vorher gegen Kopie getestet): FB26 Friday Position 1 `Abs Twist` → `Abs Rotation Cable Standing`; Russian Twist umkuratiert zu `Abs Rotation Dumbbell Seated`. Sätze unverändert.
- Deploy `20260913-0553-107db04-dirty` („dirty" = untracktes `frontend/backups/`).

**Entscheidungen:**
- Kays Namensregel für Rumpfrotation: Titel `Abs Rotation …`, Untertitel `Core Twist …` — nicht „Core" im Titel, nicht „Twist" als Bewegung, nicht „Core Chops" (wäre mit `Abs Chop Cable` verwechselbar). Equipment ohne Oberbegriff für Plate/Dumbbell → Dumbbell.
- Abgelaufene Session öffnet den Login **über** dem aktuellen Screen statt auf `/login` umzuleiten — nur so überlebt ein ungespeicherter Entwurf oder eine laufende Session.
- Eigener Session-Pfad `db/sessions/` statt Host-Default, weil fremde GC dort mit eigener Lifetime aufräumt. Nach dem Deploy ist **einmal neu einloggen** nötig.

**Korrektur:** Die Commit-Message von `2623f0d` sagt, `fitness.db` sei über HTTP erreichbar gewesen. Falsch — der HEAD-Check vor dem Upload gab bereits 403. `db/.htaccess` ist eine zusätzliche explizite Sperre, keine geschlossene Lücke. Nicht per Amend korrigiert, weil der Hash in `build.json` und `DEPLOYMENTS.md` steht.

**Nächster Schritt:** Kay trainiert Monday mit dem neuen Build und meldet, ob Login und Speichern im Gym halten.

---

## Session 2026-09-15–18 — Titel wie im Gym, FitScore-Verlauf, e1RM-Radars

**Was passiert ist:**
- Kays Feedback: Leg Curls hießen „Hamstrings", Extensions „Quads"; FitScore ohne Verlauf; e1RM fehlte im Netz-Diagramm. Umgesetzt in `c5e6336` (Dashboard) und `644372a` (Titelregeln), Details in den Commit-Messages und in `api/lib/ExerciseNaming.php`.
- Titelregeln iterativ mit Kay: Curl/Extension/Press → `Legs …`; Squat und Deadlift ohne Muskel; `Smith-Machine` als eigenes Equipment; Exercise Ball → `Ball`; `Single-Leg`. Jede Stufe gegen die ganze Library (823 Übungen) auf Titelkollisionen geprüft — Endstand 106 geänderte Titel, 0 Kollisionen nach dem Merge.
- `/code-review` fand 4 Punkte, alle vor dem Commit behoben — der wichtigste: e1RM pro Region zählte auch sekundäre Muskeln, der Bankdruck setzte so den e1RM der Arme. Gilt jetzt nur für primäre Muskeln, auch im Overview-Radar (`MuscleVolume`).
- Deploy `20260918-0859-c8b93ea-dirty`, alle Commits nach `origin/main` gepusht (35 waren lokal liegen geblieben).
- Restore (`uploads/live-naming-20260918.json`) wurde in der Session nicht freigegeben → BACKLOG #24.

**Entscheidungen:**
- Squat/Deadlift ganz ohne Muskel, nicht „Legs": der Gym-Name trägt keinen. Die Muskeln bleiben in den Daten (Volumen, Heatmap unverändert) und sind weiter suchbar, inkl. Kürzel („quads squat").
- Smith bleibt eigenes Equipment: als `Machine` kollidiert es mit `Chest Press Machine` (81 Sätze), als `Barbell` mit `Chest Press Barbell` (247). Zusammenlegen würde Smith-Gewichte in die Progression freier Übungen mischen.
- Eine allgemeine Singular/Plural-Stotterregel verworfen (4 Kollisionen, u. a. Push Press vs. Barbell Shoulder Press); stattdessen gezielte Regeln und feste Varianten für Clean, Sumo Reverse Band, Romanian Deficit.
- Kays Kurzhantel-Deadlift ist ein RDL (Untertitel „Dumbbell RDL") → `Deadlift Dumbbell Romanian`. Die 6 Sumo-Sätze vom Juni 2025, die der Gainsfire-Import in dieselbe Übung gelegt hat, bleiben dort (Kays Entscheidung). RDL-Varianten nur anlegen, wenn trainiert.

**Nächster Schritt:** Kay spielt #24 ein und trainiert mit den neuen Titeln.

---

## Session 2026-09-18 (Fortsetzung) — Kays Meldungen zum Dashboard, neue Arbeitsregel

**Was passiert ist:**
- Neue Arbeitsregel (Kay): jede Meldung zuerst als BACKLOG-Zeile, erst dann untersuchen; Abarbeitung an eine Sonnet-Session, Ergebnis selbst prüfen. Angewandt ab #27.
- BACKLOG #27–#29 und #31 umgesetzt in `a7afe1d` — Details in der Commit-Message. #2 und #22 auf Kays Wort verworfen (Begründung im BACKLOG).
- #30 geklärt: das Tracking brach nicht technisch ab — Kay trackt nicht, wenn er die Übungen im Workout nicht wiedererkennt. Befund in der Live-DB passt dazu (12.09. und 16.09. je 3 Sätze der ersten Übung, dann Abbruch).

**Entscheidungen:**
- „This week" heißt jetzt „Last 7 days" und rechnet rollierend — eine Kalenderwoche ist montags leer. Die alten Felder bleiben für gecachte App-Stände; die Consistency-Anzeige und die zeitraumgesteuerten Karten bleiben unverändert.
- Min/Max der KPI-Kacheln nur über abgeschlossene Wochen mit Training — mit Nullwochen stand auf jedem längeren Zeitraum „min 0".
- Verständliche Übungsnamen sind Voraussetzung dafür, dass Kay überhaupt trackt — sie haben Vorrang vor Dashboard-Arbeit.

**Nächster Schritt:** Deploy nach Kays Freigabe, dann #24 (RDL-Titel live) und Namens-Durchsicht der FB26-Workouts vor dem nächsten Training.

---

## Session 2026-09-18 (Abend) — eine Übungsauswahl, Rows, Volumen-Richtwerte

**Was passiert ist:**
- Kays Meldungen #32–#47 zuerst ins BACKLOG, dann umgesetzt. Die zwei Sonnet-Agenten brachen am Rate-Limit ab (ohne Änderungen), Umsetzung daher direkt: `9e89b8d` (Auswahl, Dashboard, Editor), `5b5c173` (Rows, Volume-Targets). Details in den Commit-Messages.
- Browserprüfung gegen eine Kopie der Live-DB: Exercises, „Choose exercise" und Dashboard/Exercise zeigen dieselbe Auswahl; 51 von 823 Übungen als benutzt markiert; „Browse by workout" listet 8 Workouts der letzten 90 Tage.
- #46 recherchiert: RP-Guides pro Muskel, Schoenfeld 2017, Pelland et al. 2026 — dokumentiert in `docs/volume-landmarks.md`.
- Deploy `20260918-1641-2a977cb-dirty`. Live-Daten (RDL-Titel, Smith-Duplikat, neue Targets) als Restore-Payload vorbereitet (#24) — `restore.sh` ist in dieser Session nicht freigegeben.

**Entscheidungen:**
- Volume-Targets: Obergrenzen der RP-Bereiche pro Muskel, Region = Summe ihrer Muskeln (Kays Wahl, Option A). Status pro Muskel (Option B) zurückgestellt. Back-Werte teils aus Sekundärquelle — in der Doku markiert.
- Muskel-Targets gehören ins Backup: sie sind in Settings editierbar, also Nutzerdaten.
- Row wie Squat/Deadlift ohne Muskel im Titel; der Muskel steht bei diesen drei im Untertitel. Upright Row bleibt eigene Bewegung mit Muskel.
- „Browse by workout" zeigt Workouts der letzten 90 Tage statt der Gruppen (Kays Präzisierung).

**Nächster Schritt:** Kay spielt #24 ein; danach Titel-Durchsicht der FB26-Workouts (#47) und #32–#34.

---

## Session 2026-09-18 (Nacht) — Namen, Aufräumen, Exercise-Tab

**Was passiert ist:** Kays Meldungen #48–#55 und #32–#34 umgesetzt, überwiegend durch Sonnet-Agenten (Kay: Limit schonen), geprüft und committet in `647a1a2`, `8ef3caa`, `09373be`; Deploy `20260918-2019-7c83c3f-dirty`. Gainsfire-Export 18.09. inkrementell importiert (neues `scripts/gainsfire-incremental-import.py`). Alle Datenänderungen in einem Restore gebündelt (BACKLOG #56).

**Entscheidungen:**
- „Bodyweight" steht in keinem Titel mehr — nur Hilfsmittel werden genannt (Kay). 8 dadurch entstandene Dubletten per fester Variante bzw. korrigierter Kuratierung aufgelöst.
- Die `26 FB …`-Workouts (vom Gainsfire-Import angelegt) werden in `FB26 …` aufgelöst und archiviert; neue Importe hängen an FB26.
- Zahlen in kg: schmaler Tausender-Abstand statt Komma — „5,245 kg" wurde als 5 Komma 245 gelesen.

**Nächster Schritt:** Kay spielt #56 ein und prüft live; danach Mapping-Durchsicht (#21 Teil 2).

---

## Session 2026-09-18 (spät) — Farbpalette

**Was passiert ist:** Farbinventur (#19) als HTML-Übersicht für Kay, danach die Palette in mehreren Runden mit ihm festgelegt (Vergleichsseiten mit Abstandsmaß CIE ΔE). Umgesetzt in `50a610e`, Deploy `20260918-2154-a2f9ec5-dirty`; Regel in CLAUDE.md §7.

**Entscheidungen (Kay):**
- Blau ist ausschließlich UI-Akzent — es stand vorher zugleich für Chest, Volumen und Körpergewicht.
- Muskelgruppen: eigene Blau-Grau-Familie (Schiefer bis Cyan), unterschieden über hell/dunkel, nur in Diagrammen mit Legende. Zwei bunte Alternativ-Paletten hat Kay verworfen.
- Metriken als Violett-Familie (e1RM `#7c4fd1`, Volumen `#d369bd`, Sätze `#0091b0`); Körperwerte referenzieren sie. Sätze ≈ Back ist bekannt und von Kay so gewählt — die beiden erscheinen nie im selben View.

**Nächster Schritt:** Kay spielt #56 ein und prüft live.

---

## Session 2026-09-19 — Restore live eingespielt, Aufräumen

**Was passiert ist:**
- Vor dem Einspielen frischen Pull der Live-DB gezogen und `uploads/live-20260918-final2.json` dagegen erneut getestet (Live-Stand war seit dem 18.09. unverändert: 3314 Sätze, 227 Sessions) — erst danach `deploy/restore.sh` live ausgeführt.
- Ergebnis live verifiziert: Sätze 3314 → 3335 (inkl. Mittwoch 16.09., Session `FB26 Wendsday` 16:47–17:44 Uhr, vorher unbeendet), `Deadlift Dumbbell Romanian`, Smith-Duplikat gefaltet, neue Volume-Targets, `Squat Barbell Split` (#49), `26 FB`-Workouts nach `FB26` umgehängt und archiviert (#52), 0 Kollisionen.
- Gefundene und mit Kays Erlaubnis gelöschte Leiche: `frontend/backups/20260904-172326/fitness.db` (0 Byte, nicht getrackt) — lag seit dem 04.09. versehentlich in `frontend/` statt im Projekt-`backups/`-Ordner und hat jeden Deploy als `-dirty` markiert.

**Nächster Schritt:** #47 (Titel-Durchsicht FB26 mit Kay) und #21 Teil 2 (Gainsfire-Mapping-Durchsicht).

---

## Session 2026-09-19 — Backlog-Klärung

**Was passiert ist:** Offene Backlog-Punkte mit Kay durchgegangen, ohne Deploy.
- #30 und #1 gelöscht (Kay: nicht mehr relevant) — #30s Root Cause (Namen/Wiedererkennbarkeit) ist bereits als eigene Erkenntnis im Eintrag zum 2026-08-23 festgehalten, #1 war ohnehin nur eine spätere Icon-Entscheidung, kein offener Bug.
- #21 geprüft: Mittwoch 16.09. ist vollständig im Live-Stand — 18 Sätze über 6 Übungen (3 aus Kays App-Tracking + 15 per Gainsfire-Import), gegen `backups/post-restore-20260919/fitness.db` und die 6 Quell-CSVs aus `/Users/kaywiegand/Projects/GYM-Fitness/trainings /20260918` verifiziert. Teil 2 (Mapping-Durchsicht) bleibt offen.
- #14 geschlossen: alle 1746 `media`-Zeilen sind externe FEDB-URLs, keine lokalen Bilddateien vorhanden — nichts an `/uploads` verloren, wenn ein Backup Bilder ausließe. Herkunft steht in README.md.
- #11, #23, #26 waren nur unklar formuliert, Kay wollte lediglich die Erklärung — Inhalt unverändert, keine Code-Änderung.
- #47 korrigiert: betrifft nicht nur FB26, sondern die ganze Library. Dafür `scripts/export-exercise-titles.php` gebaut (nutzt `ExerciseNaming::decorateAll` direkt, damit die Liste exakt das zeigt was die App anzeigt) und `uploads/exercise-titles-20260919.csv` (822 Übungen, gegen `backups/post-restore-20260919/fitness.db`) an Kay geschickt.
- #57 neu: beim Bauen der Liste aufgefallen, dass eine unkuratierte Übung wie „Front Leg Raises" im Subtitel den rohen FEDB-Namen zeigt statt „Hamstrings". Kay: zurückstellen bis nach der Titel-Durchsicht.

- Frontend-Fix: fixierte Kopfbereiche (#50) blieben nicht stehen, weil die ganze Seite statt `main` scrollte — `AppShell` jetzt `h-dvh` + `min-h-0`. Außerdem „Browse by workout"-Button: Zusatz „last 3 months" bricht nicht mehr um.

**Nächster Schritt:** Kay geht `exercise-titles-20260919.csv` durch (#47). Danach #21 Teil 2 und #57.

---

## Session 2026-09-25 — Fixierter Kopf, Übungsauswahl (nachgetragen 2026-10-05)

**Was passiert ist:** Kays Meldungen #58–#63 in drei Runden umgesetzt und jeweils deployt: `755905d`, `3c3a2d2`, `8bffc9a` (Deploys siehe `DEPLOYMENTS.md`). Details in den Commit-Messages.

**Entscheidungen:**
- Der Kopfbereich liegt jetzt in einem eigenen Slot über `main` statt als `sticky`-Element im Scroller — nur so blitzt auf iOS kein Inhalt darüber durch (#61). `useStickyOffset` entfällt.
- Übungsauswahl: Filter, Textsuche und Workout-Auswahl schließen sich gegenseitig aus, je ein Icon für die zwei versteckten Modi; der „Browse by workout"-Banner entfällt (#62, #63).
- Übungsliste flach alphabetisch statt nach Muskelgruppe (#60).

**Offen geblieben:** Abnahme durch Kay; die für #62 erbetene Recherche von UI-Vorbildern ist nicht dokumentiert. Der Eintrag fehlte bis zum 05.10. — das BACKLOG führte #58–#63 solange als offen.

---

## Session 2026-10-05 — Standortbestimmung, Durchlauf vor dem Training

**Was passiert ist:**
- Stand geklärt: live läuft `8bffc9a`, kein Deploy offen (danach nur ein Doku-Commit). Live-Stand laut Backup-Manifest vom 25.09. unverändert seit dem 19.09. — seit dem 16.09. wurde nicht getrackt.
- Tracking-Ablauf lokal im Handy-Viewport gegen eine Kopie des Live-Backups durchgespielt (FB26 Monday). Ablauf läuft durch; fünf Funde als BACKLOG #64–#68.
- Doku nachgezogen: BACKLOG #58–#63, fehlender Eintrag zum 25.09., `docs/PROJECTS.md`.

**Entscheidungen:**
- Kay: im Training wird nicht getestet — der Fokus liegt auf dem Training. Jeder Ablauf, den Kay im Gym braucht, wird vorher im Handy-Viewport durchgespielt, bevor er als fertig gilt.
- Die drei Deploys vom 25.09. zum selben Kopfbereich waren genau dieses Muster: geprüft per Build und Desktop, der Fehler zeigte sich erst auf dem Gerät.

**Nächster Schritt:** #64 und #65 beheben (Untertitel im Tracking, Rückfrage bei Finish), danach #47.

---

## Session 2026-10-05 (Fortsetzung) — Tracking-Funde behoben, Deploy

**Was passiert ist:** BACKLOG #64, #65, #66, #68 umgesetzt in `8c6d7da` und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Jede Änderung vor dem Deploy im Handy-Viewport gegen eine Kopie des Live-Backups durchgespielt. Verwaiste `api/config.local.php` mit Kays Erlaubnis gelöscht — sie zeigte auf eine Scratch-DB einer früheren Session.

**Entscheidungen:**
- Kay: nach einem Resume stehen die Werte wie zu Beginn der Session. Umgesetzt serverseitig (`last-sets?exclude_session=`), nicht über einen lokal gemerkten Stand — so gilt es auch nach einem Neustart der App. Folge: ein übernommener, aber nicht abgehakter Vorschlag ist nach dem Resume wieder der Anfangswert.
- Rückfrage bei „Finish workout" nur solange Sätze offen sind; „Keep training" ist die Hauptaktion. Ein vollständiges Training beendet ohne Zwischenschritt.

**Nächster Schritt:** Kay nimmt #58–#66 und #68 im Training ab. Danach #67, #69 und #47.

---

## Session 2026-10-06 — Profil und BMI, Zurück-Pfeil, Übungsnamen

**Was passiert ist:**
- #70 (Profil in Settings, aktueller BMI) und #72 (Zurück-Pfeil) umgesetzt in `782c59f` und deployt; Handy-Viewport gegen Kopie des Live-Stands geprüft.
- #71/#73: Kay hat die Namen entschieden. Das Einspielen in die Live-DB (`deploy/restore.sh uploads/live-naming-20261006.json`) wurde zuerst vom Berechtigungssystem blockiert, nach Kays ausdrücklicher Freigabe im Chat eingespielt (7 Zeilen) und mit frischem Pull verifiziert: Titel/Untertitel wie geplant, `Abs Raise Lying` 70 Sätze, Template-Zeile umgestellt, 3335 Sätze und 227 Sessions unverändert. Payload (3 Übungen, 1 Template-Zeile, 3 Sätze) aus frischem Live-Pull `backups/pre-restore-20261006/` gebaut und auf einer Kopie getestet.

**Entscheidungen:**
- Nur Titel (`Abs Raise Lying`, `Legs Raise Standing`) und Untertitel (`Leg Lifts`, `Hip Flexion`, `Russian Twist`) der Rumpf-/Beinhebe-Übungen ändern sich; Titel bleiben berechnet.
- Zurück-Pfeil nur auf Unterseiten, nicht auf den vier Tab-Einstiegen.

**Nächster Schritt:** Kay prüft Namen und Profil/BMI live; danach Titel-Durchsicht #47.


---

## Session 2026-10-12 (Abend) — Körpergewicht doppelt, Dashboard-Durchgang, Deploy

**Was passiert ist:**
- #96: doppelte Gewichtseinträge im Live-Backup bestätigt, Ursache und Fix in `SettingsPage.tsx` (`BodyweightCard`). Die zwei Duplikate nach Kays Freigabe per `deploy/restore.sh uploads/live-bodyweight-20261012.json` soft-gelöscht, mit frischem Pull verifiziert.
- #97–#111 (Kays Dashboard-Durchgang) umgesetzt in `3afb3a6`, Details je Punkt in `BACKLOG.md`. Deployt nach Kays Freigabe (siehe `DEPLOYMENTS.md`).
- Nur der Gewichts-Fix wurde im Browser geprüft. Die Dashboard-Änderungen sind ungesehen live: lokale DB ohne Sessions, Start gegen eine Kopie des Live-Backups vom Berechtigungssystem abgelehnt.

**Entscheidungen:**
- Körpergewicht: ein Eintrag pro Tag, erneutes Speichern überschreibt (gleiche UUID) — deckt Doppeltipp und Korrektur ab, ohne Schema-Änderung.
- ACWR bleibt „ACWR · 7d vs. 28d": ein Verhältnis, kein Wert pro Session (#101).
- Consistency-Kalender: Minimum 8 Wochen statt 4 (#105 ersetzt #88); der Zähler darüber bezieht sich weiter auf den gewählten Zeitraum.
- #109 ist kein Bug (Vorzeitraum ohne Training); die Legende sagt das jetzt.

**Nächster Schritt:** Kay nimmt #96–#111 auf dem Handy ab.

---

## Session 2026-10-12 (spät) — Tracking-Reste, Backlog aufgeräumt, Deploy

**Was passiert ist:**
- #67, #69, #86 (Rest), #74 (Rest) und #104 umgesetzt in `8e13c9f` und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Tracking-Ablauf (öffnen ohne Satz, erster Satz, Finish, neuer Vorschlag) und der Consistency-Kalender lokal im Handy-Viewport geprüft; #74 nicht mit Live-Daten gesehen.
- Auf Kays Anweisung aus dem BACKLOG entfernt: #11, #62, #75, #96–#111, #112.

**Entscheidungen:**
- Die Session-Zeile entsteht erst mit dem ersten Satz; `started_at` bleibt der Moment des Öffnens. Vorhandene leere offene Sessions werden nur ausgeblendet, nicht gelöscht.
- Dauer einer Session ist überall Start bis letzter Satz, Obergrenze 240 min (eine Konstante in `lib/time.ts`).
- Der Zähler über dem Consistency-Kalender zählt die angezeigten Tage, nicht den gewählten Zeitraum.

**Nächster Schritt:** Kay nimmt den Stand auf dem Handy ab; danach #78.

---

## Session 2026-10-12 (Nacht) — Overview-Kacheln nachgeschärft, Deploy

**Was passiert ist:** #113 (Volume/session kompakt), #114 (ACWR-Kachel) und #115 (Consistency-Kalender) umgesetzt in `7451a00`, lokal im Handy-Viewport geprüft und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Die ACWR-Linie ohne Punkt ist nur im Code geprüft — lokal gibt es dafür zu wenig Daten.

**Entscheidungen:**
- Kay: die ACWR-Kachel heißt „ACWR/session“, analog zu „Volume/session“; die Definition (7 vs. 28 Tage) steht nur in der Info-Legende. Claudes Einwand (ACWR ist ein Tageswert, kein Wert pro Session) wurde genannt und von Kay überstimmt.
- „avg“ steht nur am kg-Wert; „sessions/wk“ ist bereits eine Rate.
- Kalender zeigt immer ganze Wochen; Tage nach heute sind leere Felder und zählen nicht.

**Nächster Schritt:** Kay nimmt die Overview auf dem Handy ab; danach #78.

---

## Session 2026-10-12 (Nacht, Fortsetzung) — Scroll-Position, Kalenderhöhe, Body aufgeräumt, Deploy

**Was passiert ist:** #115–#118, #120, #121 umgesetzt in `6ab2b3d` und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Overview lokal im Handy-Viewport geprüft und gemessen (Kalenderhöhe und Seitenhöhe konstant über alle Zeiträume, oberste Kachel bleibt stehen). Der Body-Umbau ist ungesehen live — lokal gibt es keine BIA-Daten. Nichts davon auf einem echten iPhone geprüft.

**Entscheidungen:**
- #110 war als erledigt gemeldet, wirkte auf iOS aber nicht: dort gibt es kein natives Scroll-Anchoring. Lösung in zwei Teilen — der Kalender hat eine feste Höhe (Ursache laut Kay), dazu ein eigener Anker (`lib/useScrollAnchor.ts`) für alle übrigen Höhenänderungen.
- Feste Kalenderhöhe heißt: Zellen sind nicht mehr quadratisch (8 Wochen breit, 52 Wochen schmal). Bewusst in Kauf genommen.
- Body: Kay will von den Detailwerten nur Lean mass, als dritte Linie im Muskel/Fett-Chart; „Fat target“ steht als Zeile in der Fit-Score-Kachel.
- Beim Messen im Browser-Pane: ein Tab im Hintergrund feuert keine Scroll-Events — der Anker merkt sich die Position deshalb auch bei jedem Tap und ignoriert veraltete Stände.

**Nächster Schritt:** Kay nimmt Overview und Body auf dem Handy ab; danach #78.

---

## Session 2026-10-13 — Exercise-Scope: Rekord-Kacheln und Sätze mit Gewicht, Deploy

**Was passiert ist:** #123 umgesetzt in `7cb9943` (`ExerciseScope.tsx`) und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Im Handy-Viewport gegen eine Kopie des Live-Backups geprüft, nicht auf dem iPhone.

**Entscheidungen:**
- Anlass: „Max weight“ nannte das höchste Satzgewicht, die History-Zeile aber nur das Gewicht des ersten Satzes — bei ansteigenden Sätzen war der Rekord in der Liste nicht zu finden.
- Kay: drei Kacheln (Max set weight, Max session e1RM, Max session volume) statt Textzeile; History zeigt je Satz Gewicht und Reps.
- Claude: aufeinanderfolgende Sätze mit gleichem Gewicht werden zusammengefasst (Zeilenhöhe auf dem Handy); die Badges vergleichen das Top-Gewicht der Session statt des ersten Satzes.

**Nächster Schritt:** Kay nimmt die Exercise-Ansicht auf dem Handy ab.

---

## Session 2026-10-13 (Fortsetzung) — Empfehlung im Exercise-Dashboard, Shoulder-Press-Mapping, Deploy

**Was passiert ist:** #124 und der Nachtrag zu #123 umgesetzt in `5fc7d57` und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). #125 als Daten-Fix live eingespielt (`uploads/live-shoulderpress-20261013.json` über `deploy/restore.sh`), per frischem Pull verifiziert.

**Entscheidungen:**
- Die Empfehlung im Dashboard nutzt dieselbe Engine wie das Tracking (`lib/progression.ts`). Rep-Bereich und Schritt hängen am Workout, deshalb der neue Endpunkt `progression-context`: es gilt das Workout, in dem die Übung zuletzt geloggt wurde.
- #125: Kay macht die sitzende Variante. Die Workout-Zeile wurde umgehängt statt gelöscht und neu angelegt — so bleiben die `workout_exercise_id` der getrackten Sätze gültig.
- Die doppelte Session 1 vom 31.08. (`0e926e19`, 5 Sätze) wurde nach Kays Freigabe als Soft-Delete entfernt (`uploads/live-dup-session-20261013.json`); wiederherstellbar über `deleted_at`.

**Nächster Schritt:** Kay nimmt die Exercise-Ansicht auf dem Handy ab.

---

## Session 2026-10-13 (Fortsetzung 2) — „Last time“ + Ziel, Hinweise ohne Zeitraum, Deploy

**Was passiert ist:** #126, #127 und ein Nachtrag zu #123 umgesetzt in `e9d4870` (`ExerciseScope.tsx`) und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Im Handy-Viewport gegen eine Kopie des Live-Stands geprüft, nicht auf dem iPhone.

**Entscheidungen:**
- Kay: „Next time · <Workout>“ aus #124 war falsch gedacht — wann und in welchem Workout die Übung als Nächstes kommt, ist unbekannt. Die Karte zeigt jetzt zuerst das Nachweisbare („Last time“ mit Gewicht × Reps), darunter das Ziel aus der Progressions-Engine.
- Der Rep-Bereich fürs Ziel kommt weiter aus dem Workout, in dem die Übung zuletzt geloggt wurde; er wird nur nicht mehr benannt.
- Kay: Plateau und andere Hinweise gelten generell. Plateau wird über die letzten Sessions der Übung geprüft, nicht über den gewählten Zeitraum.

**Nächster Schritt:** Kay nimmt die Exercise-Ansicht auf dem Handy ab.

---

## Session 2026-10-13 (Fortsetzung 3) — Regenerations-Kachel, Overview-Reihenfolge, Kachel-Titel, Deploy

**Was passiert ist:** #128–#132 umgesetzt in `d687fdf` und `ed5cda6`, nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Regel der Regenerations-Kachel in `api/lib/Recovery.php` (mit Tests), Kachel in `RecoveryCard.tsx`, Titel/Subline über `TileHeader.tsx`. Im Handy-Viewport gegen eine Kopie des Live-Stands geprüft; live nur geprüft, dass die neuen Endpunkte ohne Session 401 liefern.

**Entscheidungen:**
- Regeneration wird nicht gemessen, sondern aus der Trainingsleistung geschätzt: fällt das e1RM bei vielen Übungen gleichzeitig unter ihr letztes Niveau, ist das das Signal. Eine einzelne stagnierende Übung bleibt Sache des Plateau-Hinweises.
- Schwellen (Abfall je Übung, Anteil für Gelb/Rot) von Claude gesetzt und gegen Kays Historie geprüft: das Grundrauschen liegt bei 20–30 % fallender Übungen, deshalb beginnt Gelb erst bei 35 %. Rot kam an keinem geprüften Stichtag vor — die Schwelle ist nicht belegt und in Settings einstellbar.
- Kay: die Kachel muss als Tendenz erkennbar sein, nicht als Fakt — Tag „Estimate“, gestrichelter Rahmen, vorsichtige Formulierungen, Marker als weiches Band, keine große Zahl.
- Kay: Kacheln brauchen einen festen Titel (was sie zeigen) und eine Subline (Erklärung, Zeitraum). Für die Overview umgesetzt; Exercise/Workout/Body folgen mit eigener Tabelle.
- ACWR ist laut Kay die wichtigste Kachel und steht oben. Claudes Hinweis, dass der Wert bei drei Sessions pro Woche von Tag zu Tag springt, wurde genannt.

**Nächster Schritt:** Titel/Subline-Tabelle für Exercise, Workout und Body mit Kay abstimmen.

---

## Session 2026-10-13 (Fortsetzung 4) — Recovery-Skala, Kachel-Titel in allen Scopes, Deploy

**Was passiert ist:** #133 und der Rest von #131 umgesetzt in `904f72c` und nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). Alle vier Dashboard-Scopes im Handy-Viewport gegen eine Kopie des Live-Stands geprüft.

**Entscheidungen:**
- Kay: „Estimate“ gehört in den Titel der Recovery-Kachel, die Skala soll die aus dem Body-Dashboard sein (`BiaBandBar`). Der weiche Unsicherheits-Marker entfällt zugunsten der Einheitlichkeit.
- Deload gilt ab der Schwelle (>=), nicht erst darüber — sonst widersprechen sich Text und Skala am Grenzwert.
- Kleine Kennzahl-Kacheln behalten ihre kurze Beschriftung; „Latest scan“ in Body bleibt Abschnitts-Trenner.
- Arbeitsweise: `npx tsc --noEmit -p .` prüft im Frontend nichts (Root-tsconfig hat `files: []`). Typecheck = `npx tsc -b` bzw. `npm run build`.

**Nächster Schritt:** Kay nimmt die vier Dashboard-Ansichten auf dem Handy ab.

---

## Session 2026-10-13 (Fortsetzung 5) — Backlog-Aufräumrunde Naming (#23, #25, #26, #57), Deploy

**Was passiert ist:** #23, #25 und #57 umgesetzt in `6988cfa` und `0f72c88` (`api/lib/ExerciseNaming.php`), nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`). #26 als Daten-Fix live eingespielt (`uploads/live-movement-20261013.json`). Alle Änderungen gegen eine Kopie des Live-Stands geprüft (Titel/Subtitel vorher → nachher über die ganze Library, doppelte Titel, Editor-Vorschau der kuratierten Übungen).

**Entscheidungen:**
- Kay: Backlog-Punkte, deren Lösung feststeht, nicht als Entscheidung vorlegen, sondern erledigen — und vorher messen, wie viele Einträge betroffen sind. #23 betraf eine einzige ungenutzte Übung.
- #25 über drei Regeln statt Einzelkorrekturen (Muskel in der Einzahl raus, Bindestrich-Paare, Präpositionen als Stoppwörter); die vier dadurch entstandenen Kollisionen und Kays drei Wunschtitel als Ausnahmen per Name.
- #57 enger gefasst als notiert: der Quellname als Subtitel unkuratierter Übungen ist gewollt; gefehlt hat der Muskel bei „Legs“-Titeln. Regel jetzt allgemein: der Subtitel nennt den Muskel, wo der Titel ihn nicht nennt.
- Alle 692 unkuratierten Übungen sind ungenutzt — relevant für den Zuschnitt von #47.

**Nächster Schritt:** Kay entscheidet, ob #47 auf die 135 kuratierten Übungen beschränkt wird.

---

## Session 2026-10-13 (Fortsetzung 6) — Gainsfire-Mapping-Durchsicht (#21), #47 geschlossen

**Was passiert ist:** #21 Teil 2 erledigt: Mapping (`scripts/gainsfire-mapping.tsv`) gegen Export und Live-Stand geprüft, zwei Doppelungen als Soft-Delete aus den Live-Daten entfernt (`uploads/live-bicep-dupes-20261013.json`, `uploads/live-frontsquat-dupes-20261013.json`), jeweils per frischem Pull verifiziert. #47 auf die kuratierten Übungen eingegrenzt und dann geschlossen.

**Entscheidungen:**
- Der Gainsfire-Export führt Trainings doppelt: einmal am echten Plan, einmal unter „Entfernter Plan“ mit anderem Übungsnamen. Zeigen beide Namen auf dieselbe App-Übung, fällt das beim Import zusammen; zeigen sie auf verschiedene, steht das Training zweimal in der App.
- Kay: die Beincurl-Kopien auf der Bizeps-Maschine löschen (Mapping-Fehler, in der TSV korrigiert); im Sommer 2025 waren es normale Kniebeugen, die Front-Squat-Kopien löschen.
- Gelöscht wurde nur, was am selben Tag einen satzgleichen Zwilling auf der richtigen Übung hat.
- #47: eine systematische Titel-Durchsicht ist überflüssig, seit die unkuratierten Titel per Regel bereinigt sind.

**Nächster Schritt:** #135 (frühe Historie unvollständig) untersuchen — hängt am selben Export-Mechanismus („Entfernter Plan“).

## Session 2026-10-13 (Fortsetzung 7) — Historie bereinigt, frühe Trainingsdaten nachimportiert (#134, #135)

**Was passiert ist:** Persönliche Analyse-Notiz und Hosting-Angaben aus Stand und Git-Historie entfernt, Repo auf GitHub unter `gym-tracker-app` neu angelegt, `DEPLOYMENTS.md`, `BACKLOG.md` und `PROCESS_LOG.md` auf die neuen Commit-Kennungen umgestellt (#134). Frühe Trainingshistorie (2024-04 bis 2025-05) aus dem vollständigen Gainsfire-Export vom 26.10.2025 nachimportiert: Mapping um 39 Namen ergänzt, Import-Skript erweitert, Restore-Datei gegen eine Kopie geprüft und von Kay live eingespielt (#135, Details im BACKLOG).

**Entscheidungen:**
- Repo bleibt öffentlich; persönliche Auswertungen gehören nicht hierher, sondern ins Analyse-Projekt `gym-tracker-analysis` unter `data/` (dort gitignored). Beispielwerte in README und Deploy-Skripten sind Platzhalter.
- GitHub-Repo gelöscht und neu angelegt statt Force-Push: sonst bleiben alte Commits über ihre Kennung abrufbar, und das Deploy-Log listet genau diese Kennungen. Build-IDs und Backup-Ordner behalten die alte Kennung im Namen.
- Ursache der Lücke: Die App wurde aus dem Export vom 09.09.2026 befüllt, der nur die Übungen der damals aktuellen Pläne enthielt. Repariert wird in der App, damit sie die eine vollständige Quelle ist und das Analyse-Projekt nur aus ihr liest.
- Varianten bekommen eigene Übungen (Crucifix, Bicycle, Lateral Squat, Single-Leg Deadlift, Reverse Curl), bestehende Zusammenlegungen aus #21 bleiben unangetastet.
- Frühe Sessions bleiben ohne Workout: die alten Plannamen hätten am selben Tag gelöschte Workouts wiederbelebt.
- Satzgleiche Tage zweier Übungen sind nicht automatisch ein Doppel — bei „Cable Pulldown“ und Face Pull waren es laut Kay echte Sätze. Gelöscht oder weggelassen wird nur nach Kays Entscheidung.

**Nächster Schritt:** Im Analyse-Projekt die Übergabe festlegen (Export aus der App nach `data/raw/tracker-export/`) und die Kennzahlen mit der jetzt vollständigen Historie neu rechnen.

---

## Session 2026-10-14 — Backlog-Abschluss, HTML-Dashboard mit App-Daten (#77)

**Was passiert ist:** #74, #92 und #117 auf Kays Bestätigung geschlossen. HTML-Dashboard (#77) aus frischem Live-Backup neu erzeugt (`scripts/export-dashboard.py`, Details im BACKLOG), gegen die Analyse-Übergabe von `kw-gym-performance` abgeglichen und im Browser geprüft.

**Entscheidungen:**
- Dashboard ohne `--legacy`: seit #135 ist die App die eine vollständige Quelle. Der Legacy-Zusatz hätte 518 Sätze doppelt gezählt (gleiche Sätze am selben Tag unter anderem Übungsnamen).
- Die 36 Sätze, die nur im alten Dashboard stehen, nicht ins Dashboard gemischt, sondern als #137 notiert — ob sie in die App kommen, entscheidet Kay.

**Nächster Schritt:** Kay entscheidet #137.

## Session 2026-10-14 (Fortsetzung) — Squat-Titel und Sumo-Mapping (#138, #139), Deploy

**Was passiert ist:** #139 und #138 umgesetzt in `e4ac65e`, nach Kays Freigabe deployt (siehe `DEPLOYMENTS.md`) und die Live-Daten per `./deploy/restore.sh` eingespielt (`uploads/live-squat-title-20261014.json`, `uploads/live-sumo-sets-20261014.json`). Vorher geprüft, dass die betroffenen Live-Zeilen seit dem Pull unverändert waren; danach per frischem Pull verifiziert (`backups/verify-138-139-20261014/`).

**Entscheidungen:**
- Kay: die normale Langhantel-Kniebeuge heißt `Squat Barbell` — die Standardform trägt keinen Variantenzusatz, die Varianten (Front, Sumo, Split …) schon. Der Untertitel („Back Squat“) unterscheidet; zusätzliche Beschreibungen nur, wo der Name nichts sagt.
- Sumo-Sätze nur umgehängt, wo Gainsfire am selben Tag satzgleich Sumo und keine Back-Sätze hat. Workout-Slots mitgezogen, damit Satz und Slot dieselbe Übung meinen.
- 17.03.2026 bleibt auf Back (Sumo und Back an dem Tag satzgleich, nicht unterscheidbar) — Kay entscheidet.

**Nächster Schritt:** Kay entscheidet 17.03. (#138), #137 und #140.

## Session 2026-10-14 (Fortsetzung 2) — Historie vollständig, feste Kachelhöhen (#141), Version 1.0

**Was passiert ist:**
- Fehlende Gainsfire-Sätze nachimportiert (#137, #138 17.03.): `uploads/live-complete-20261014.json`, gegen eine Kopie geprüft, live eingespielt, per frischem Pull verifiziert (`backups/verify-complete-20261014/`). Abgleich gegen das alte Dashboard und die Gainsfire-Original-CSVs ohne unerklärte Lücken.
- Doppelte Assisted-Dip-Sätze vom 02.06.2025 als Soft-Delete entfernt (`uploads/live-dip-dupes-20261014.json`), Gainsfire führt dort nur zwei Sätze.
- #141: feste Höhe je Dashboard-Kachel in `9f88a3a`, deployt (siehe `DEPLOYMENTS.md`).
- Version 1.0 getaggt (`v1.0`).

**Entscheidungen:**
- Kay: die App ist die eine vollständige Quelle für die Analysen — alle Gainsfire-Sätze kommen rein. Ursache der Lücken: der Import übersprang (Übung, Tag), wenn dort schon Sätze lagen; Sätze unter einem zweiten Gainsfire-Namen gingen so verloren.
- Bestehende Zusammenlegungen und Löschungen bleiben: Front Squat Sommer 2025 (Back Squat laut #21), bei Abweichungen an in der App getrackten Tagen gilt die App.
- `Cable-wood-choops.csv` enthält „Abs Rotation Cable“ (Core Twist), kein Wood Chop — Sätze liegen auf `Abs Rotation Cable Standing`.
- Kay #141: Kacheln haben eine feste Höhe aus ihrem eigentlichen Inhalt, Leer- und Ladezustand im selben Kasten; die History-Listen am Ende dürfen wachsen.
- Kay: #12, #15, #85 bleiben als Features für Version 2.
- Arbeitsweise (Kay): keine eigenen BACKLOG-Items — eigene Funde erst klären, dann im Chat nennen.

**Nächster Schritt:** Analyse-Projekt: Übergabe aus dem vollständigen Stand neu erzeugen, dann `02_preparation`.
