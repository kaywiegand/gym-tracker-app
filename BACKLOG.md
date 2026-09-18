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
| 2 | **"In your workouts" im Exercise-Picker** — Prototyp zeigt eine "Most trained"-Sektion oben im Picker. Aktuell zeigt der Picker nur Suche + Gruppierung nach Region. Seit Stufe 2 gibt es echte Session/Sets-Historie — "meistgenutzt" oder "zuletzt verwendet" wäre jetzt berechenbar, aber bewusst noch nicht gebaut (kein UI-Auftrag dafür). Bei Bedarf nachziehen. | 2 |
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
| 21 | **Frischer Gainsfire-Export** — der vorhandene endet am 12.06.2026, es fehlen ~3 Monate. Danach Mapping-Durchsicht (`uploads/gainsfire-exercise-mapping.csv`, 94 Zeilen). Eigene Session, Kay will den Export selbst ziehen. | 1 |
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
| 22 | **Übung während einer laufenden Session hinzufügen** — `TrackingPage` kann nur Sätze ergänzen, keine Übung. Fehlt eine Übung im Template, muss man die Session verlassen und das Workout editieren. War Teil des Problems am 12.09. | 1 |
| 23 | **Bewegungs-Inferenz: „Twist" schlägt „Fly"** — `MOVEMENT_PATTERNS` in `api/lib/ExerciseNaming.php` prüft `Twist` vor `Fly`, daher wird „Incline Dumbbell Flyes - With A Twist" zu `Chest Twist Dumbbell Incline`. Betrifft nur unkuratierte Übungen; per `MOVEMENT_BY_NAME` oder Reihenfolge lösen, danach Titelkollisionen prüfen. | 3 |

---

## Offen aus der Naming-/Dashboard-Runde 2026-09-18

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 24 | **Live-Daten nachziehen** — `./deploy/restore.sh uploads/live-naming-20260918.json` (gegen frischen Pull getestet). Setzt `Deadlift Dumbbell Romanian` (Kays RDL, bisher Variante „Stiff-Legged") und faltet das Smith-Duplikat „Smith Machine Decline Press" in „Decline Smith Press". Lief nicht mit, weil der Restore in der Session nicht freigegeben war. | 1 |
| 25 | **Titel-Feinschliff unkuratierter Übungen** — Quellschreibweise ohne Bindestrich (`Deadlift Barbell Stiff Legged` neben kuratiertem `Stiff-Legged`), Muskel-Stotterer in der Variante (`Shoulders Press Barbell Shoulder`, `Calves Raise Smith-Machine Calf`), Füllwörter (`Abs Rollout Barbell From`). Eine allgemeine Singular/Plural-Regel wurde verworfen: sie erzeugte 4 Titelkollisionen. Jede Einzelkorrektur braucht einen Kollisionscheck gegen die ganze Library. | 3 |
| 26 | **Editor-Vorschau nicht im Browser geprüft** — `previewTitle()` in `ExerciseEditPage.tsx` spiegelt die Regeln aus `ExerciseNaming::displayName()`; nur per tsc verifiziert. Beim nächsten Kuratieren einer Squat/Smith/Legs-Übung Vorschau gegen gespeicherten Titel vergleichen. | 3 |
