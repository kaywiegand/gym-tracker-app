# BACKLOG.md — kw_gym-tracker
### Projektspezifische offene Tasks + Ideen

Offene Punkte die während der Arbeit auffallen aber nicht sofort umgesetzt werden.
Erledigte Items → als Pointer in PROCESS_LOG dokumentieren, hier entfernen.

Prio: `1` = hoch · `2` = mittel · `3` = niedrig

---

## Aus Stufe 1 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 1 | **Muskel-Icon-Set** — Prototyp-Icons sind bewusst Platzhalter (CLAUDE.md §7). Listen sind in Stufe 1 bewusst ohne Icons gebaut (Namen reichen). Falls später ein besserer Original-Icon-Satz kommt: Entscheidung treffen ob er in Listen zurückkommt oder nur in Detail-Ansichten bleibt. | 3 |
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
| 14 | **Backup enthält keine Bilddateien** — `media`-Zeilen (Pfade) sind im JSON-Backup enthalten, die eigentlichen Bild-Dateien in `/uploads` nicht. Für echte Portabilität müsste `/uploads` klassisch per Dateisystem-Backup (rsync o.ä.) gesichert werden. | 3 |

---

## Aus Stufe 6 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 15 | **Kalorien-Schätzung** — HR-Daten fehlen. Über BIA allein geht nur eine MET-Faustformel (Krafttraining 3–6 MET × Gewicht × Dauer), die je nach Annahme um Faktor 2 streut. Zurückgestellt bis HR-Daten da sind. | 3 |
| 18 | ~~Workouts gruppieren~~ — ✅ erledigt 2026-09-02: `workout_groups` + optionale `workouts.group_id`, aufklappbare Abschnitte in der Liste, Verwaltung unter /workout-groups. | — |
| 19 | **Farb-Dubletten in der Palette** — `--body-weight`/`--body-muscle` teilen ihren Hex mit `--brand-accent`/`--metric-e1rm`, ebenso `--muscle-chest` = `--metric-volume`. Keine Datei nutzt zwei Bedeutungen desselben Tons gleichzeitig, also heute nicht mehrdeutig; echte Eindeutigkeit wäre eine Paletten-Entscheidung. | 3 |
| 21 | **Frischer Gainsfire-Export** — Kay 18.09.: die Übungen aus `/Users/kaywiegand/Projects/GYM-Fitness/trainings /20260918` in die Datenbank übernehmen (enthält u. a. das nur in Gainsfire getrackte Training vom 16.09., #30). Danach Mapping-Durchsicht (`uploads/gainsfire-exercise-mapping.csv`). | 1 |
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
| 30 | **Tracking am Mi 16.09. wieder nicht möglich** — Kay: das Training vom Mittwoch musste er wieder in Gainsfire tracken, in der App ging es „leider wieder nicht". Ursache noch unklar (was genau ging nicht?). Folge: die Sätze fehlen in der App, „Muscle load this week" zeigt alles unter MEV. Sätze später über den Gainsfire-Export nachziehen (#21). **Befund Live-DB 18.09.:** gleiches Muster wie Fr 12.09. — Session „FB26 Wendsday" 16.09. 16:47Z, genau 3 Sätze der ersten Übung, danach nichts, nie beendet. Der Session-Fix vom 13.09. (`107db04`) war da schon live — Ursache also woanders. **Kay 18.09.:** er startet das Workout, die Übungsnamen passen nicht oder sind missverständlich, und während des Trainings sucht er nicht herum — dann trackt er nicht. Kein Mechanik-Bug, sondern Namen/Wiedererkennbarkeit: die Titelregeln (`c8b93ea`) kamen erst am 18.09. live, #24 (RDL-Titel) steht noch aus. Verständliche Namen haben höchste Priorität. | 1 |
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
| 47 | **Titel-Durchsicht der aktiven Workouts** — Befund bei der Browserprüfung 18.09.: die erste Übung in FB26 Wendsday heißt `Hamstrings Raise Bodyweight Front` (Front Leg Raise) — genau die Art Titel, an der Kay im Gym aussteigt (#30). Alle Übungen der FB26-Workouts mit Kay durchgehen und unklare Titel kuratieren, zusammen mit #43. | 1 |
| 48 | ✅ erledigt 2026-09-18 (`3519720`): `Legs Raise Front`, „Bodyweight" aus allen Titeln | — |
| 49 | ✅ Daten vorbereitet: `Squat Barbell Split` · „Bulgarian Squat" — kommt mit #56 | — |
| 50 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Kopfbereiche fixiert | — |
| 51 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Gruppen wie auf der Workouts-Seite | — |
| 52 | ✅ Daten vorbereitet: `26 FB` → `FB26`, `26 FB` archiviert — kommt mit #56 | — |
| 53 | ✅ erledigt 2026-09-18 (`8d4fbd8`): kg mit schmalem Tausender-Abstand, max. 1 Nachkommastelle | — |
| 54 | ✅ erledigt 2026-09-18 (`8d4fbd8`): Min/Max: Wert oben, Beschriftung darunter | — |
| 55 | ✅ erledigt 2026-09-18 (`8d4fbd8`): neutrale Nutzungslinie | — |
| 56 | **Live-Daten einspielen (Kay)** — `./deploy/restore.sh uploads/live-20260918-final2.json`: Deadlift Dumbbell Romanian, Smith-Duplikat, Volume-Targets (#46), Bulgarian (#49), 21 Gainsfire-Sätze + 2 Sessions beendet (#21), `26 FB` → `FB26` (#52), Push-Up-Variante. Gegen Backup 18.09. 16:41 getestet. | 1 |
