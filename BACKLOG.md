# BACKLOG.md — kw_gym-tracker
### Projektspezifische offene Tasks + Ideen

Offene Punkte die während der Arbeit auffallen aber nicht sofort umgesetzt werden.
Erledigte Items → als Pointer in PROCESS_LOG dokumentieren, hier entfernen.

Prio: `1` = hoch · `2` = mittel · `3` = niedrig

---

## Aus Stufe 1 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 1 | **Muskel-Icon-Set** — Prototyp-Icons sind bewusst Platzhalter (CLAUDE.md §7). Listen sind in Stufe 1 bewusst ohne Icons gebaut (Namen reichen). Falls später ein besserer Original-Icon-Satz kommt: Entscheidung treffen ob er in Listen zurückkommt oder nur in Detail-Ansichten bleibt. | 3 | ~~Muskel-Zuordnung im Exercise-Editor~~ — ✅ verworfen 2026-09-02: Kay — die FEDB-Zuordnung ist richtig (Deadlift auf Lower Back, RDL auf Hamstrings), keine Relevanz. | — |
| 2 | **"In your workouts" im Exercise-Picker** — Prototyp zeigt eine "Most trained"-Sektion oben im Picker. Aktuell zeigt der Picker nur Suche + Gruppierung nach Region. Seit Stufe 2 gibt es echte Session/Sets-Historie — "meistgenutzt" oder "zuletzt verwendet" wäre jetzt berechenbar, aber bewusst noch nicht gebaut (kein UI-Auftrag dafür). Bei Bedarf nachziehen. | 2 |
| 3 | **Muskel-Zuordnung im Exercise-Editor** — "Duplicate & edit" kopiert primary/secondary Muskeln 1:1, aber es gibt noch keine UI um sie für die Kopie neu zuzuordnen (nur Skalarfelder editierbar: Name/Equipment/Category/Mechanic/Increment). Für eigene Custom-Übungen mit abweichender Muskel-Verteilung müsste das nachgezogen werden — bewusst Overengineering-Vermeidung für Stufe 1. | 2 |

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
gängige Isolationsübungen, kollisionsfrei geprüft. Der Rest bleibt unkuratiert mit
Originalnamen und wird beim ersten Verwenden im Editor kuratiert. Die
Exercises-Liste zeigt per Default nur kuratierte Übungen ("My library"),
Toggle auf "All exercises" für die vollen 873.

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
| 19 | **Farb-Dubletten in der Palette** — `--body-weight`/`--body| 21 | **Frischer Gainsfire-Export** — der vorhandene endet am 12.06.2026, es fehlen ~3 Monate. Danach Mapping-Durchsicht (`uploads/gainsfire-exercise-mapping.csv`, 94 Zeilen). Eigene Session, Kay will den Export selbst ziehen. | 1 |
-muscle` teilen ihren Hex mit `--brand-accent`/`--metric-e1rm`, ebenso `--muscle-chest` = `--metric-volume`. Keine Datei nutzt zwei Bedeutungen desselben Tons gleichzeitig, also heute nicht mehrdeutig; echte Eindeutigkeit wäre eine Paletten-Entscheidung. | 3 |
| 20 | ~~Maskable-Icon 5 % zu groß~~ — ✅ bewusst so belassen 2026-09-02: Kay nutzt iOS, dort wird nicht beschnitten. Auf Android würden G und M an den Außenkanten fehlen. | — |

---

## Offen aus Kays Testrunde 2026-08-24

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 16 | ~~BIA-Import „0 imported"~~ — ✅ erledigt 2026-09-02, sechs Scans erfolgreich importiert. Ursache war vermutlich der kaputte PHP-Prozess nach dem Ordner-Rename. | — |
| 17 | **Exercise-Scope-Redesign (3-Linien-Chart) nicht live durchgeklickt** — `MultiMetricTrendChart` ersetzt die alten KPI-Kacheln + Einzel-Chart. Nur per tsc/lint/Code-Review geprüft, kein Zugriff auf Kays Passwort für einen echten Browser-Durchlauf. Sollte als erstes bei der nächsten Testrunde angeschaut werden. | 1 |
