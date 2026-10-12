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
| 58 | **Sticky Header: durchgehender Hintergrund** — der fixierte Kopfbereich hat nur hinter den einzelnen Elementen Hintergrund, dazwischen scheint der gescrollte Inhalt durch. Der ganze Header-Block braucht einen durchgehenden Hintergrund. — ✅ live seit 2026-09-25 (`ddc2dbe`), abgenommen 2026-10-08. Lokal im Handy-Viewport geprüft 2026-10-05: Kopf deckend. | 1 |
| 59 | **Übungsauswahl kompakter (Dashboard/Exercise + Hauptmenü Exercises)** — Textsuche, Filter und Workout-Auswahl nehmen zu viel Platz. Initial nur die Filter-Chips, Liste darunter; daneben zwei Icons: Lupe öffnet das Suchfeld, Bizeps-Icon öffnet die Workout-Auswahl — beide in derselben Fläche über den Filtern. Eine Komponente, man schaltet zwischen den drei Suchen um. — ✅ live seit 2026-09-25 (`ddc2dbe`, umgebaut in `6380dea`), abgenommen 2026-10-08. | 1 |
| 60 | **Übungsliste flach alphabetisch** — statt nach Muskelgruppe sortiert mit Trennern eine flache alphabetische Liste, sonst kann man nicht sinnvoll scrollen. Gilt für Dashboard/Exercise und Hauptmenü Exercises. — ✅ live seit 2026-09-25 (`ddc2dbe`), abgenommen 2026-10-08. Lokal geprüft 2026-10-05: flache A–Z-Liste. | 1 |
| 61 | **Über dem fixierten Header blitzt der Inhalt durch** — nach #58 (live `ddc2dbe`) scheint oberhalb des Headers beim Scrollen noch Inhalt durch. Kays Idee: Header-Bereich etwas höher ziehen und/oder alles oben in ein Element. — ✅ live seit 2026-09-25 (`6380dea`): Kopf liegt außerhalb des Scrollers. abgenommen 2026-10-08. | 1 |
| 63 | **„Browse by workout": großer Button/Banner entfällt** — mit Icon-Umschaltung überflüssig. — ✅ live seit 2026-09-25 (`6380dea`). | 1 |

---

## Durchlauf vor dem Training 2026-10-05

Tracking-Ablauf lokal im Handy-Viewport (375×812) gegen eine Kopie des Live-Stands durchgespielt
(FB26 Monday: Start, Sätze loggen, Vorschlag übernehmen, Rest-Timer, verlassen, Resume, Finish).
Ablauf funktioniert, Sätze und Session-Ende kommen in der DB an. Funde:

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 64 | **Tracking zeigt keine Untertitel** — auf dem Tracking-Screen steht nur der normierte Titel (`Abs Rotation Dumbbell Seated`), der gängige Name aus dem Untertitel fehlt. Alle anderen Listen nutzen `ExerciseRow` mit Untertitel, `TrackingPage.tsx` nicht. Wiedererkennbarkeit ist laut PROCESS_LOG 2026-09-18 die Voraussetzung dafür, dass Kay trackt. — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-05 (`5af4ce4`), abgenommen 2026-10-08: Untertitel unter dem Titel (`TrackingPage.tsx`, `useTrackingStore.ts`). | 1 |
| 65 | **„Finish workout" ohne Rückfrage** — beendet die Session sofort, auch bei 3 von 24 Sätzen. Nach Finish gibt es kein Resume mehr (siehe #22). Ein Fehltipp beendet das Training. — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-05 (`5af4ce4`), abgenommen 2026-10-08: Rückfrage nur bei offenen Sätzen, „Keep training“ ist die Hauptaktion. | 1 |
| 66 | **Vorschlag kippt nach Resume** — vor dem Verlassen „12.5 kg × 6 · You hit 10 reps on all sets last time", nach Resume „12.5 kg × 10 · Same weight as last time": die Sätze der laufenden Session zählen als „last time". — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-05 (`5af4ce4`), abgenommen 2026-10-08: `last-sets` schließt die fortgesetzte Session aus (`exclude_session`), nach Resume stehen Vorschlag und offene Sätze wieder wie zu Beginn (Kays Vorgabe). | 2 |
| 67 | **Vorschlagstext auf dem Handy abgeschnitten und ungenau** — die Begründung endet mit „…"; sie nennt die Rep-Obergrenze („10 reps") statt der tatsächlich geloggten 16. — ✅ umgesetzt 2026-10-12: Begründung bricht um statt abzuschneiden und nennt die geloggten Reps („Last time 12, 12, 11 reps (top of range: 10) — try +2.5kg.“); `progression.ts`, `TrackingPage.tsx`. Im Handy-Viewport geprüft, live seit 2026-10-12 (`8e8f04f`). | 3 |
| 68 | **Finish-Sheet: Zahlenformat uneinheitlich** — „8,100 kg" mit Komma, „-7740 kg" ohne Trenner; #53 hatte den schmalen Tausender-Abstand festgelegt. — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-05 (`5af4ce4`), abgenommen 2026-10-08: Finish-Sheet nutzt `formatNumber`. | 3 |
| 69 | **Leere Session beim Öffnen** — der Tracking-Screen legt die Session schon beim Öffnen an, nicht beim ersten Satz. Ein Reload ohne geloggten Satz hinterlässt eine „Unfinished session · 0 sets logged“, die erst über Resume oder Discard verschwindet. — ✅ umgesetzt 2026-10-12: Session-Zeile entsteht erst mit dem ersten Satz (`useTrackingStore.ts`), `started_at` bleibt der Moment des Öffnens; vorhandene leere offene Sessions werden nicht mehr angeboten (nicht gelöscht). Im Handy-Viewport geprüft (öffnen → 0 Zeilen, 3 Sätze → 1 Session), live seit 2026-10-12 (`8e8f04f`). | 3 |

---

## Kays Meldungen 2026-10-05

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 70 | **Profil in Settings: Alter, Größe, Geschlecht** — in Settings lässt sich das Gewicht eingeben, Alter, Größe und Geschlecht aber nicht. Mit der Größe könnte die App den BMI selbst berechnen und aktuell halten, auch wenn der letzte Bodycheck (BIA-Scan) länger her ist — wie jetzt. — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-06 (`0b87148`), abgenommen 2026-10-08: Profil-Block in Settings (Größe, Geburtsdatum, Geschlecht; `settings`-Keys `profile_*`), Body-Ansicht zeigt einen BMI — berechnet aus dem geloggten Gewicht, sobald es neuer ist als der letzte Scan, sonst den Scan-Wert. Alter und Geschlecht werden nur gespeichert (für #15). | 2 |
| 71 | **Untertitel von `Abs Rotation Dumbbell Seated`** — Kay: warum steht dort nicht „Russian Twist Dumbbell"? Das wäre der umgangssprachliche Name. — Entscheidung Kay 2026-10-06: `Abs Rotation Dumbbell Seated` → Untertitel „Russian Twist“; Kabel-Variante bleibt „Core Twist Cable“. ✅ live eingespielt 2026-10-06 und per frischem Pull verifiziert (`uploads/live-naming-20261006.json`). | 2 |
| 72 | **Workouts: aus einem geöffneten Workout gibt es kein Zurück** — geht man unter Workouts in ein Workout, fehlt der Weg zurück zur Liste. — ✅ umgesetzt 2026-10-05, im Handy-Viewport geprüft, live seit 2026-10-06 (`0b87148`): Zurück-Pfeil im `PageHeader`, einheitlich in Workout-Editor, Übungs-Editor, Workout-Gruppen und Report. Die vier Tab-Einstiege (Dashboard, Exercises, Workouts, Settings) brauchen keinen — die Tab-Leiste ist ihr Ausgang. | 1 |
| 73 | **FB26 Wendsday: `Legs Raise Front` ist die falsche Übung** — Kay macht immer das liegende Leg Raise. Die Übung fehlt offenbar in der Library — warum? — Kay 2026-10-06: gemeint ist das liegende. Plan: `Abs Raise Lying` bekommt Untertitel „Leg Lifts“, FB26 Wendsday nutzt es statt `Legs Raise Front`, die 3 Sätze vom 02.09. wandern um; `Legs Raise Front` wird `Legs Raise Standing` mit Untertitel „Hip Flexion“. ✅ live eingespielt 2026-10-06 und per frischem Pull verifiziert (`uploads/live-naming-20261006.json`, gegen Kopie des Live-Stands geprüft: 3 Titel ändern sich, keine Kollision). | 1 |

---

## Kays Meldungen 2026-10-09

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 74 | **Zeitliche Gesamtansicht: langer „Schwanz" ohne Werte** — in der Gesamtansicht über die Zeit hängt rechts (bzw. am Rand) ein riesiger Bereich ohne Daten. Der leere Bereich soll abgeschnitten werden. — Befund 2026-10-12: die überlange „All“-Achse war bereits mit `2c89417` (live seit 2026-10-09) behoben; keine falsch datierten Zeilen im Live-Backup. Rest ✅: ACWR-Chart beginnt am ersten Tag mit Wert (`AcwrCard.tsx`). Nicht mit Live-Daten gesehen, live seit 2026-10-12 (`8e8f04f`). Falls Kay den leeren Bereich weiter sieht: welcher Chart? | 2 |
| 76 | ~~Doppelte Übung „Reverse Machine Flyes" zusammenlegen~~ — ✅ verworfen 2026-10-09: Kay — Irrtum, es gibt nur eine. | — |
| 77 | **HTML-Dashboard (`~/Projects/GYM-Fitness/dashbaord/Fitness-Dashboard.html`) mit aktuellen App-Daten füttern** — Kay 2026-10-09: soll mit den Daten der App laufen statt mit dem Gainsfire-Stand vom 07.08.2026. Vergleich mit `~/Workspace/kw-gym-performance` (Notebooks). Plan: Generator-Skript `scripts/export-dashboard.py` (Live-Backup → `RAW`-Block im HTML). | 2 |
| 78 | **Dashboard/Exercise: nach Auswahl einer Übung über „Workout" kommt man nicht zurück in die Workout-Auswahl** — wählt man dort ein Workout und daraus eine Übung, gibt es keinen Weg zurück zur Workout-Ansicht, um eine andere Übung desselben Workouts zu nehmen; man muss den ganzen Weg (Workout-Auswahl → Workout → Übung) neu klicken. | 2 |
| 79 | **Consistency-Kalender / Sessions/wk: nur beendete Sessions zählen, am lokalen Starttag** — Kay 2026-10-12: Donnerstag wurde als Trainingstag angezeigt, obwohl nur Di/Mi/Fr trainiert wurde (vermutlich abgebrochene Session). Regel: nur Sessions mit `ended_at` zählen; Tag = lokaler Kalendertag des `started_at` (nicht UTC-Datum, nicht Endzeit). Betrifft `SessionRepository::recentDates` (Kalender, Sessions/wk, `weekly_sessions`). — ✅ umgesetzt 2026-10-12, Tests + Build grün, noch nicht committet/deployt. | 1 |
| 90 | **Session zählt auch ohne „Finish", wenn Arbeitssätze geloggt sind** — Kay 2026-10-12: Regel aus #79 angepasst. Eine Session zählt (Kalender, Sessions/wk, Volume/session), wenn sie beendet ist ODER mindestens einen Arbeitssatz (kein Warmup, nicht gelöscht) hat; leere offene Sessions (0 Sätze) zählen nicht. Anlass: Fr 09.10. wurde nie beendet (24 Sätze) und fiel durch #79 heraus. — ✅ umgesetzt 2026-10-12, Tests grün. | 1 |
| 91 | **PWA zieht neue Version nicht zuverlässig (Cache-Buster)** — Kay 2026-10-12: nach Deploy zeigt die Handy-PWA noch den alten Build (About: `acb9400-dirty` statt `69b2aae`), obwohl der Server den neuen ausliefert. Gewünscht: App erkennt eine neue Version selbst und lädt sie ohne Zutun (Version-Check gegen `build.json` bei Start und beim Zurückkehren in den Vordergrund; bei Abweichung Service-Worker-Update/Cache leeren + Reload, ohne offene lokale Eingaben/Sync-Queue zu verlieren). Außerdem: `deploy.sh` soll `DEPLOYMENTS.md` bei der „dirty"-Prüfung ignorieren. — ✅ umgesetzt 2026-10-12 (`versionCheck.ts`, `UpdateBanner`, `public/.htaccess`, `deploy.sh` ignoriert DEPLOYMENTS.md), Typecheck + Build grün, nicht auf echtem iOS geprüft, nicht committet/deployt. Nach Deploy `curl -I …/sw.js` auf Cache-Control prüfen (mod_headers am Host?). | 1 |
| 92 | **BIA: Download des CSV-Templates funktioniert nicht** — Kay 2026-10-12 (vor Ort beim BIA-Check): „Download CSV template" in Settings lädt die Vorlage nicht. Ursache suchen (Link `/api/bia/template`, iOS-PWA-Download, Auth/Cookie, Header), beheben und Workaround für heute nennen. — Ursache: der Service Worker beantwortete Navigationen auf `/api/...` mit der App-Shell (`index.html`) statt mit der Datei; betraf auch Backup-Export und Training-Log-CSV. ✅ Fix 2026-10-12: `navigateFallbackDenylist: [/^\/api\//]` in `vite.config.ts`. | 1 |
| 93 | **Consistency-Kalender: Woche beginnt am Montag** — Kay 2026-10-12: Spalten sollen Kalenderwochen Mo–So sein (Zeilen fest Mon…Sun), nicht rollierende 7-Tage-Blöcke ab heute. War vor dem Umbau #82 schon so. Letzte Spalte = aktuelle Woche, Tage nach heute nicht zeichnen. — ✅ umgesetzt 2026-10-12, Typecheck + Build grün, nicht committet/deployt. | 2 |
| 94 | **ACWR in Ortszeit statt UTC-Tagen** — Kay 2026-10-12: ACWR (Zeitreihe und aktueller Wert) bucketet nach UTC-Tag (`performed_at`) und läuft gegen UTC-„heute"; soll wie Kalender/Sessions den lokalen Tag (`tz`-Param) nutzen. — ✅ umgesetzt 2026-10-12, Tests + Build grün, nicht committet/deployt. | 2 |
| 95 | **Overview: Körperkarte und Muskel-Status-Liste folgen dem Zeitraum** — Kay 2026-10-12: beide sind fest auf 7 Tage und ignorieren die Chips. Sollen dem gewählten Zeitraum folgen (7D unverändert; sonst Ø Sätze pro Woche im Zeitraum gegen die MEV/MAV/MRV-Wochenwerte). — ✅ umgesetzt 2026-10-12 (7D unverändert, sonst Ø Sätze/Woche), Tests + Build grün, visuell nicht geprüft, nicht committet/deployt. | 2 |
| 80 | **Dashboard/Overview „Last 7 days vs. previous 7": Farblegende fehlt** — Kay 2026-10-12: es ist nicht erkennbar, was blau und was grau ist. Legende ergänzen (vorab im Code prüfen, welche Serie welche Farbe hat). — ✅ umgesetzt 2026-10-12 in `MuscleRadar` (Legende ab 2 Serien), Typecheck + Build grün, nicht im Browser geprüft, noch nicht committet/deployt. | 2 |
| 81 | **Vergleichsfarben einheitlich: Blau = aktueller Zeitraum, Grau = vorheriger** — Kay 2026-10-12: überall, wo „aktuelle 7 Tage vs. vorherige 7 Tage" (bzw. aktuell vs. vorher) verglichen wird, soll Blau der aktuelle und Grau der vorherige Zeitraum sein. Alle Stellen suchen, an denen das vorkommt, und angleichen; Farben zentral definieren, nicht je Chart. — ✅ geprüft 2026-10-12: es gibt nur eine Stelle (Overview-Radar), Farben dort bereits richtig (Blau aktuell, Grau vorherig), keine Änderung nötig. Kommt ein zweiter Vergleichs-Chart, Farben dann zentral definieren. | 2 |
| 82 | **Globaler Zeitraum 7D · 14D · 1M · 3M · 6M · 12M · All, Vergleich immer „gewählter Zeitraum vs. gleich langer Vorzeitraum"** — Kay 2026-10-12: das feste „7 Tage vs. prev 7" im 3M–All-Screen ist verwirrend. Konzept: Chips um 7D/14D/1M erweitern (eine Zeile); bestehende Anzeigen für 3M–All bleiben, Anzeigen werden für 7–14 Tage angepasst; Vergleichsansichten nutzen immer den gewählten Zeitraum (7D → 7D vs. prev 7D, 3M → 3M vs. prev 3M). Farben: Blau = aktuell, Grau = Vorzeitraum. Consistency-Kalender zeigt immer aktuell + Vorzeitraum (7D → 14 Tage, … , All → alles, ohne Vorzeitraum), Trainingstage Blau bzw. Grau. Zeitfenster rollierend in ganzen Wochen (1M = 4 Wochen). ACWR bleibt fix 7/28. Entschieden Kay 2026-10-12: bei unvollständigem Vorzeitraum den Vergleich ausblenden (sonst Fehlinterpretation). Offen: Volume/wk wird durch Volume/session ersetzt (Ø kg je Session, Total als Zusatzzeile; Sessions/wk wird bei 7D/14D zu Anzahl im Zeitraum) — Kay 2026-10-12. Hängt an #79 (Sessions-Zählung). — ✅ umgesetzt 2026-10-12, Tests + Build grün, visuell nicht geprüft, nicht committet/deployt. | 1 |
| 83 | **KPI-Kacheln als Linien-Charts mit Referenzlinien; ACWR verständlich** — Kay 2026-10-12: die ACWR-Anzeige sagt nicht, wann man im Ziel (0,8–1,3) ist. Gewünscht: Liniendiagramm mit unterer Grenze 0,8, oberer Grenze 1,3 und dem aktuellen Wert als Linie dazwischen; Grün im Zielbereich, darunter/darüber Orange bzw. Rot. Beschriftung „ACWR 7d vs. 28d" (Definition fest, unabhängig vom gewählten Zeitraum; der Chart zeigt den Verlauf über den gewählten Zeitraum). Dasselbe Prinzip für Volume/session und Sessions: Linie mit Min, Max und aktuellem Wert, hier ohne Ampel, aktuell einfach Blau. Hängt an #82. — ✅ umgesetzt 2026-10-12, Tests + Build grün, visuell nicht geprüft, nicht committet/deployt. | 1 |
| 84 | **Dashboard/Exercise: Zeitnavigation fehlt** — Kay 2026-10-12: nach Auswahl einer Übung fehlt die Zeit-Navigation (Chips); einzelne Übungen will Kay ebenfalls über verschiedene Zeiträume ansehen. Soll denselben globalen Zeitraum nutzen wie #82 (7D … All), Verlauf/e1RM/Vergleich folgen dem gewählten Zeitraum. — ✅ umgesetzt 2026-10-12, Tests + Build grün, visuell nicht geprüft, nicht committet/deployt. | 2 |
| 85 | **Übungen vergleichen** — Kay 2026-10-12: im Dashboard mehrere Übungen nebeneinander vergleichen können (z. B. e1RM-Verlauf zweier Übungen über denselben Zeitraum). Idee, noch nicht ausgearbeitet: Auswahl 2+ Übungen im Exercise-Scope, gemeinsame Zeitachse (globaler Zeitraum #82), Farben je Übung (nicht Blau/Grau — das bleibt aktuell/vorherig). Offen: welche Kennzahl (e1RM, Top-Gewicht, Volumen), wie viele Übungen maximal. | 3 |
| 86 | **Workout-Ansicht: Linien-Diagramme bei Sessions und Avg duration überflüssig; Dauer mit Ausreißern (5508 min)** — Kay 2026-10-12: in der Workout-Ansicht sind die Kacheln Sessions und Avg duration informativ, das Liniendiagramm dort aber unnötig — nur die Zahlenwerte anzeigen. Avg duration zeigt 5508 Minuten, was Unsinn ist (erwartet 30–120 min): Ausreißer behandeln (vermutlich offen gelassene Session, die erst Tage später beendet wurde). Ursache im Code suchen, Daten in der Live-DB nur nach Freigabe bereinigen. — ✅ umgesetzt 2026-10-12: Sparklines bei Sessions/Avg duration entfernt; Dauer = `started_at` bis letzter Satz (`last_set_at`), > 240 min verworfen. Tests + Build grün, live seit 2026-10-12 (`8e8f04f`). Rest ✅ 2026-10-12: Finish-Summary rechnet Start bis letzter Satz, über 240 min „—“ (`useTrackingStore.ts`, Konstante in `lib/time.ts`). Im Handy-Viewport geprüft, live seit 2026-10-12 (`8e8f04f`). | 1 |
| 87 | **Workout-Ansicht: Entwicklung des einzelnen Workouts** — Kay 2026-10-12: die Workout-Signatur (Radar) zeigt den Charakter, es fehlt die zeitliche Entwicklung nur dieses Workouts: e1RM, Volumen, Sets über den gewählten Zeitraum (wie bei Exercises) und das Radar nach Muskelgruppen zusätzlich als aktuell vs. Vorzeitraum (Blau/Grau). Entwurf: Radar-Karte mit Umschalter „Character / vs. previous", darunter drei Trend-Panels pro Session; Vergleich je Session gemittelt (nicht Summe), Vorzeitraum nur bei vollständigen Daten. Hängt an #82. — ✅ umgesetzt 2026-10-12, Tests + Build grün, visuell nicht geprüft, nicht committet/deployt. | 2 |
| 88 | **Consistency-Kalender: kein Vergleich mit Vorzeitraum** — Kay 2026-10-12 (nach erstem Blick auf die Live-Version): im Kalender braucht es keinen Vergleich zwischen vorher und nachher. Ersetzt die Regel aus #82 („immer aktuell + Vorzeitraum"). Kalender zeigt nur den gewählten Zeitraum, alle Trainingstage in Blau, ohne Grau/Trennlinie/Legende; mindestens der letzte Monat (4 Wochen), auch bei 7D/14D — kürzer ist sinnlos (Kay, selber Tag). — ✅ umgesetzt 2026-10-12, Typecheck + Build grün, nicht committet/deployt. | 2 |
| 89 | **Overview: Volume/session prüfen (Rechenfehler?) + Kacheln zusammenlegen** — Kay 2026-10-12: bei 1M zeigt „Volume/session" evtl. falsche Werte; eine Session = ein Training = ein Workout pro Tag? Prüfen, ob Sessions pro Tag mehrfach vorkommen und wie Volumen/Session gerechnet wird. Außerdem: „Volume/session" und „Sessions/wk" in eine Kachel zusammenlegen; für Sessions/wk reicht der Durchschnitt — kein Min, kein Max, kein Liniendiagramm. — Befund 2026-10-12 (Live-Backup): Rechnung korrekt (8 beendete Sessions an 8 Tagen in 28 Tagen), aber die echte Fr-Session 09.10. (24 Sätze) wurde nie beendet und fällt durch #79 raus; Entscheidung offen (Regel: beendet ODER ≥1 Arbeitssatz). Kachel-Zusammenlegung ✅ umgesetzt, nicht committet/deployt. | 1 |
