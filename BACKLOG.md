# BACKLOG.md — kw_gym-tracker
### Projektspezifische offene Tasks + Ideen

Offene Punkte die während der Arbeit auffallen aber nicht sofort umgesetzt werden.
Erledigte Items → als Pointer in PROCESS_LOG dokumentieren, hier entfernen.

Prio: `1` = hoch · `2` = mittel · `3` = niedrig

---

## Aus Stufe 1 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 2 | ~~"In your workouts" / Most trained im Exercise-Picker~~ — ✅ verworfen 2026-09-18: Kay — „Most trained" gibt es schon im Dashboard-Overview; der Picker soll allein über die Suche gut funktionieren. | — |
| 3 | ~~Muskel-Zuordnung im Exercise-Editor~~ — ✅ verworfen 2026-09-02: Kay — die FEDB-Zuordnung ist richtig (Deadlift auf Lower Back, RDL auf Hamstrings), keine Relevanz. | — |

---

## Naming-Konvention für Exercises — ✅ erledigt 2026-08-30

Umgesetzt als Struktur-Felder statt Freitext-Namen: `movement` + `variant`
(+ `display_alias` für den gängigen Namen) auf `exercises`; der Anzeigename
wird daraus plus primärem Muskel und Equipment **berechnet**
(`api/lib/ExerciseNaming.php`) — nie getippt, damit keine zwei Schreibweisen
derselben Übung entstehen können.

Kein Massen-Rename (die Analyse vom 2026-08-14 hatte 176 nicht ableitbare
Namen und 127 Kollisionen ergeben). Stattdessen: 123 Übungen per Seed
vorkuratiert (`db/seed/exercise_naming.php`) — Standard-Compounds plus
gängige Isolationsübungen, kollisionsfrei geprüft. Seit 2026-09-02 bekommt
jede Übung einen Titel (Bewegung/Variante werden aus dem Quellnamen abgeleitet),
der „My library"-Filter ist entfernt. Titelregeln seit 2026-09-18: siehe
PROCESS_LOG und `ExerciseNaming.php`.

## Aus Stufe 4 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 10 | ~~Heatmap-Historie zeigt nur die aktuelle Woche~~ — ✅ hinfällig seit der Gainsfire-Migration (122 Sessions ab Mai 2025). | — |

---

## Aus Stufe 5 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 11 | **BIA-Referenzbereiche nicht strukturiert gespeichert** — `bia_values.ref_low`/`ref_high` bleiben beim Import `NULL`; die "Bereich"-Zeile liegt als Text daneben. Das Frontend paart sie seit 2026-09-02 zur Laufzeit (`pickBanded`), damit bereits importierte Scans keine Neuimport brauchen. Sauberer wäre Parsing beim Import — dann bräuchte es aber einen Backfill für vorhandene Daten. | 3 |
| 12 | **Kein "Strength × Composition"-Decouple-Chart** — Prototyp überlagert e1RM-Trend mit BIA-Verlauf; bräuchte echte Korrelationslogik zwischen zwei unterschiedlich getakteten Zeitreihen (Training wöchentlich, BIA-Scans ein paar Mal im Jahr). Bewusst zurückgestellt, keine erfundene Formel. | 3 |
| 13 | **Body-Scope-Zeitraum-Switch** — ✅ erledigt 2026-09-02, filtert jetzt Chart, Segmente, Kennzahlen und Historie. | — |
| 14 | ~~Backup enthält keine Bilddateien~~ — ✅ geprüft und geschlossen 2026-09-19: geprüft, es gibt keine lokalen Bilddateien. Alle 1746 `media`-Zeilen sind `exercise_photo` mit vollem `raw.githubusercontent.com`-Pfad zur vendored FEDB-Kopie, kein lokaler Datei-Upload; `/uploads` enthält aktuell nur Daten-Exports (CSV/JSON), keine Bilder. Herkunft ist in README.md dokumentiert. Nichts an `/uploads` verloren, wenn ein Backup es ausließe. | — |

---

## Aus Stufe 6 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 15 | **Kalorien-Schätzung** — HR-Daten fehlen. Über BIA allein geht nur eine MET-Faustformel (Krafttraining 3–6 MET × Gewicht × Dauer), die je nach Annahme um Faktor 2 streut. Zurückgestellt bis HR-Daten da sind. | 3 |
| 18 | ~~Workouts gruppieren~~ — ✅ erledigt 2026-09-02: `workout_groups` + optionale `workouts.group_id`, aufklappbare Abschnitte in der Liste, Verwaltung unter /workout-groups. | — |
| 19 | ~~Farb-Dubletten in der Palette~~ — ✅ erledigt 2026-09-18: Blau nur UI-Akzent; Muskeln eigene Blau-Grau-Palette; Metriken e1RM `#7c4fd1` / Volumen `#d369bd` / Sätze `#0091b0`, Körperwerte teilen sie. Regel in CLAUDE.md §7. Sätze `#0091b0` ≈ Back `#0891b2` bewusst von Kay so gewählt (erscheinen nie im selben View). | — |
| 21 | **Frischer Gainsfire-Export** — Import erledigt und geprüft 2026-09-19: Mittwoch 16.09. ist vollständig drin — 18 Sätze über 6 Übungen (Cable Rows, Incline Bench, Lat Pulldown, Bicep Curl, Rear Delt Fly, Overhead Tricep Extension), 3 davon schon aus Kays App-Tracking (Cable Rows), 15 per Gainsfire-Import nachgezogen; im Post-Restore-Backup gegen die 6 Quell-CSVs verifiziert. Offen bleibt Teil 2: Mapping-Durchsicht (`uploads/gainsfire-exercise-mapping.csv`). | 2 |
| 20 | ~~Maskable-Icon 5 % zu groß~~ — ✅ bewusst so belassen 2026-09-02: Kay nutzt iOS, dort wird nicht beschnitten. Auf Android würden G und M an den Außenkanten fehlen. | — |

---

## Offen aus Kays Testrunde 2026-08-24

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 16 | ~~BIA-Import „0 imported"~~ — ✅ erledigt 2026-09-02, sechs Scans erfolgreich importiert. Ursache war vermutlich der kaputte PHP-Prozess nach dem Ordner-Rename. | — |
| 17 | ~~Exercise-Scope-Redesign (3-Linien-Chart) nicht live durchgeklickt~~ — hinfällig: `MultiMetricTrendChart` wurde mit `f8853c2` durch vier Einzel-Panels in echten Einheiten ersetzt (`MetricTrendPanels`). | — |

---

## Offen aus dem Gym 2026-09-12

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 22 | ~~Übung während einer laufenden Session hinzufügen~~ — ✅ verworfen 2026-09-18: Kay — Session verlassen, Workout bearbeiten, zurück und „Resume" reicht. Geprüft: `TrackingPage` lädt das Workout bei jedem Öffnen frisch, `resume()` baut die Übungen aus dem aktuellen Template und hängt die geloggten Sätze wieder an. Voraussetzung: vorher nicht „Finish workout". | — |
| 23 | **Bewegungs-Inferenz: „Twist" schlägt „Fly"** — `MOVEMENT_PATTERNS` in `api/lib/ExerciseNaming.php` prüft `Twist` vor `Fly`, daher wird „Incline Dumbbell Flyes - With A Twist" zu `Chest Twist Dumbbell Incline`. Betrifft nur unkuratierte Übungen; per `MOVEMENT_BY_NAME` oder Reihenfolge lösen, danach Titelkollisionen prüfen. | 3 |

---

## Offen aus der Naming-/Dashboard-Runde 2026-09-18

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 24 | ~~Live-Daten nachziehen~~ → ersetzt durch #56 | — |
| 25 | **Titel-Feinschliff unkuratierter Übungen** — Quellschreibweise ohne Bindestrich (`Deadlift Barbell Stiff Legged` neben kuratiertem `Stiff-Legged`), Muskel-Stotterer in der Variante (`Shoulders Press Barbell Shoulder`, `Calves Raise Smith-Machine Calf`), Füllwörter (`Abs Rollout Barbell From`). Eine allgemeine Singular/Plural-Regel wurde verworfen: sie erzeugte 4 Titelkollisionen. Jede Einzelkorrektur braucht einen Kollisionscheck gegen die ganze Library. | 3 |
| 26 | **Editor-Vorschau nicht im Browser geprüft** — `previewTitle()` in `ExerciseEditPage.tsx` spiegelt die Regeln aus `ExerciseNaming::displayName()`; nur per tsc verifiziert. Beim nächsten Kuratieren einer Squat/Smith/Legs-Übung Vorschau gegen gespeicherten Titel vergleichen. | 3 |

---

## Kays Meldungen 2026-09-18

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 27 | ~~Metrik-Reihenfolge e1RM → Volume → Sets~~ — ✅ erledigt 2026-09-18 (`ca29b75`): beide Radar-Schalter; Trend-Panels passten schon. | — |
| 28 | ~~Overview-Kacheln: Min/Max statt „avg over …"~~ — ✅ erledigt 2026-09-18 (`ca29b75`): Min/Max über abgeschlossene Trainingswochen, ACWR behält seinen Status. | — |
| 29 | ~~Dashboard-Trenner deutlicher~~ — ✅ erledigt 2026-09-18 (`ca29b75`): gemeinsame `SectionDivider`-Komponente. | — |
| 31 | ~~„This week" → rollierende 7 Tage~~ — ✅ erledigt 2026-09-18 (`ca29b75`): Muscle load, Volume vs. MEV und Radar vergleichen die letzten 7 mit den 7 Tagen davor; Consistency unberührt. | — |
| 32 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Trainingslast als Prozent des 4-Wochen-Schnitts | — |
| 33 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Top-Weight-Panel raus, Max-Gewicht über der History | — |
| 34 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Volumen je Session in der History | — |
| 35 | ~~Dashboard/Workout: Workout-Gruppen anzeigen~~ — ✅ erledigt 2026-09-18 (`f1975a6`) | — |
| 36 | ~~Zeitraum-Schalter erst nach der Auswahl~~ — ✅ erledigt 2026-09-18 (`f1975a6`), Workout und Exercise | — |
| 37 | ~~Legende für „Muscle split per session"~~ — ✅ erledigt 2026-09-18 (`f1975a6`) | — |
| 38 | ~~Benutzte Übungen dezent markieren~~ — ✅ erledigt 2026-09-18 (`f1975a6`): Linie links, `is_used` auf `/exercises` | — |
| 39 | ~~Exercises-Übersicht: kleiner Trenner zwischen Titel und Untertitel~~ — ✅ verworfen 2026-09-18: Kay — erledigt sich mit #41 (das kompakte Element der Exercises-Seite wird Standard, dort stehen Titel und Untertitel schon nah beieinander). | — |
| 40 | ~~Übungsauswahl überall gleich~~ — ✅ erledigt 2026-09-18 (`f1975a6`): `ExerciseSelector` in Exercises, „Choose exercise", Dashboard/Exercise | — |
| 41 | ~~Einheitliches Listenelement~~ — ✅ erledigt 2026-09-18 (`f1975a6`): `ExerciseRow` | — |
| 42 | ~~Übungsauswahl über Workouts~~ — ✅ erledigt 2026-09-18 (`f1975a6`): Workouts der letzten 90 Tage, `/workouts/recent` | — |
| 43 | ~~Rows ohne Muskel im Titel, Muskel in den Untertitel~~ — ✅ erledigt 2026-09-18 (`2a977cb`): gilt für Row, Squat, Deadlift; Upright Row behält den Muskel | — |
| 44 | ~~Edit Workout: Untertitel fehlen~~ — ✅ erledigt 2026-09-18 (`f1975a6`) | — |
| 45 | ~~Edit Workout: „no fixed target weight"~~ — ✅ erledigt 2026-09-18 (`f1975a6`): Hinweis entfernt | — |
| 46 | ~~Weekly volume targets begründen~~ — ✅ erledigt 2026-09-18 (`2a977cb`): Richtwerte pro Muskel (RP), Region = Summe; Methode und Quellen in `docs/volume-landmarks.md`. Live-Werte kommen mit #24 | — |
| 47 | **Titel-Durchsicht — nicht nur FB26, die ganze Library** — Kay 19.09.: betrifft nicht nur die FB26-Workouts, sondern alle Übungen. Braucht dafür eine Liste aller Übungen mit Titel, Subtitel und Original-Name — exportiert als `uploads/exercise-titles-20260919.csv` (822 Übungen, aus `scripts/export-exercise-titles.php` gegen den Post-Restore-Live-Stand). Kay geht die Liste durch, danach hier weiter. Separat: „Front Leg Raises" zeigt aktuell den rohen Quellnamen im Subtitel statt „Hamstrings" — Fix zurückgestellt, siehe #57. | 1 |
| 48 | ✅ erledigt 2026-09-18 (`3519720`): `Legs Raise Front`, „Bodyweight" aus allen Titeln | — |
| 49 | ~~`Squat Barbell Bulgarian` generischer benennen~~ — ✅ erledigt 2026-09-19 (live eingespielt): `Squat Barbell Split` · „Bulgarian Squat". | — |
| 50 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Kopfbereiche fixiert | — |
| 51 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Gruppen wie auf der Workouts-Seite | — |
| 52 | ~~Workouts doppelt in Dashboard/Exercise~~ — ✅ erledigt 2026-09-19 (live eingespielt): `26 FB` → `FB26` umgehängt, `26 FB` archiviert. | — |
| 53 | ✅ erledigt 2026-09-18 (`8d4fbd8`): kg mit schmalem Tausender-Abstand, max. 1 Nachkommastelle | — |
| 54 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Min/Max: Wert oben, Beschriftung darunter | — |
| 55 | ✅ erledigt 2026-09-18 (`8d4fbd8`): neutrale Nutzungslinie | — |
| 56 | ~~Live-Daten einspielen~~ — ✅ erledigt 2026-09-19: `./deploy/restore.sh uploads/live-20260918-final2.json` live eingespielt (frisch gegen Live-DB re-verifiziert vor dem Einspielen). Deadlift Dumbbell Romanian, Smith-Duplikat gefaltet, Volume-Targets (#46), Bulgarian (#49), 21 Gainsfire-Sätze inkl. Mittwoch 16.09. + 2 Sessions beendet (#21), `26 FB` → `FB26` (#52), Push-Up-Variante. Sätze 3314 → 3335, 0 Kollisionen. | — |

---

## Kays Meldungen 2026-09-19 (Backlog-Klärung)

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 57 | **Uncurated Subtitle zeigt Quellname statt Muskel** — Fund bei #47: `displaySubtitle()` (`api/lib/ExerciseNaming.php`) zeigt für eine unkuratierte Übung wie „Front Leg Raises" (Titel `Legs Raise Front`) den rohen FEDB-Namen im Subtitel, nicht „Hamstrings". Kay 19.09.: aktueller Stand passt so nicht, aber erstmal zurückgestellt bis nach der großen Titel-Durchsicht (#47). | 3 |

---

## Kays Meldungen 2026-09-25

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 58 | **Sticky Header: durchgehender Hintergrund** — der fixierte Kopfbereich hat nur hinter den einzelnen Elementen Hintergrund, dazwischen scheint der gescrollte Inhalt durch. Der ganze Header-Block braucht einen durchgehenden Hintergrund. | 1 |
| 59 | **Übungsauswahl kompakter (Dashboard/Exercise + Hauptmenü Exercises)** — Textsuche, Filter und Workout-Auswahl nehmen zu viel Platz. Initial nur die Filter-Chips, Liste darunter; daneben zwei Icons: Lupe öffnet das Suchfeld, Bizeps-Icon öffnet die Workout-Auswahl — beide in derselben Fläche über den Filtern. Eine Komponente, man schaltet zwischen den drei Suchen um. | 1 |
| 60 | **Übungsliste flach alphabetisch** — statt nach Muskelgruppe sortiert mit Trennern eine flache alphabetische Liste, sonst kann man nicht sinnvoll scrollen. Gilt für Dashboard/Exercise und Hauptmenü Exercises. | 1 |
