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
| 10 | **Body-Map/Radar/Heatmap-Historie zeigen nur die aktuelle Woche mit echten Daten** — alle bisherigen Testdaten stammen von heute, ältere Wochen sind entsprechend leer (0.0). Kein Bug, wird sich mit echter mehrwöchiger Nutzung von selbst auflösen. | 3 |

---

## Aus Stufe 5 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 11 | **BIA "Bereich"-Zeilen ohne strukturierte Referenzbereiche** — `bia_values.ref_low`/`ref_high` bleiben beim CSV-Import immer `NULL`; die "Bereich"-Zeilen der echten InBody-CSV (z.B. "37.0 - 45.2") landen 1:1 als Text in `value_text`, nicht als geparstes Min/Max. Verliert keine Information (jede Zelle bleibt sichtbar in der Detail-Ansicht), aber ein Chart mit Referenzband bräuchte das geparst. | 3 |
| 12 | **Kein "Strength × Composition"-Decouple-Chart** — Prototyp überlagert e1RM-Trend mit BIA-Verlauf; bräuchte echte Korrelationslogik zwischen zwei unterschiedlich getakteten Zeitreihen (Training wöchentlich, BIA-Scans ein paar Mal im Jahr). Bewusst zurückgestellt, keine erfundene Formel. | 3 |
| 13 | **Body-Scope-Zeitraum-Switch (3M/6M/12M/All) filtert nichts** — bleibt nur für UI-Konsistenz mit den anderen drei Scopes bestehen. BIA-Scans sind zu selten für eine sinnvolle Zeitraum-Filterung. Nachziehen falls die Scan-Frequenz mal deutlich steigt. | 3 |
| 14 | **Backup enthält keine Bilddateien** — `media`-Zeilen (Pfade) sind im JSON-Backup enthalten, die eigentlichen Bild-Dateien in `/uploads` nicht. Für echte Portabilität müsste `/uploads` klassisch per Dateisystem-Backup (rsync o.ä.) gesichert werden. | 3 |

---

## Aus Stufe 6 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 15 | **Kalorien-Schätzung (Keytel, HR-basiert) nicht gebaut** — CLAUDE.md §8 nennt sie explizit "(später)". Voraussetzungen sind seit Stufe 5 vorhanden (HR-Samples pro Session, Alter/Geschlecht/Gewicht aus BIA), aber noch offene Entscheidungen: Gewichtsquelle (Bodyweight vs. BIA, welches wenn beide vorhanden), Geschlecht-Parsing aus dem BIA-Freitext ("Männlich"/"Weiblich" → Keytel-Formel-Zweig), eigene UI-Fläche (wo genau angezeigt). Bewusst als eigene Runde zurückgestellt statt in Stufe 6 Runde 1 mit reingepackt. | 2 |

---

## Offen aus Kays Testrunde 2026-08-24

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 16 | **BIA-Import "0 imported" noch nicht final geklärt** — Kay meldete `Imported 0 scan(s), skipped 0` nach dem Ausfüllen der heruntergeladenen Vorlage. Der bekannte Semikolon-Bug ist gefixt; ein zusätzlich gefundener Bug (kaputter PHP-Prozess nach dem Ordner-Rename, siehe PROCESS_LOG) könnte die eigentliche Ursache gewesen sein. Die vermutete Datei in `~/Downloads/bia-template.csv` war beim Nachtesten aber eine unausgefüllte Vorlage — nicht zweifelsfrei reproduziert. Erneut mit der tatsächlich hochgeladenen Datei prüfen. | 1 |
| 17 | **Exercise-Scope-Redesign (3-Linien-Chart) nicht live durchgeklickt** — `MultiMetricTrendChart` ersetzt die alten KPI-Kacheln + Einzel-Chart. Nur per tsc/lint/Code-Review geprüft, kein Zugriff auf Kays Passwort für einen echten Browser-Durchlauf. Sollte als erstes bei der nächsten Testrunde angeschaut werden. | 1 |
