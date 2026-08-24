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
| 4 | **Workout-Exercise Rep-Range-Override — UI fehlt weiterhin** — Die Progression-Engine (Stufe 3) liest `rep_low_override`/`rep_high_override`/`increment_override_kg` bereits korrekt aus (fällt sauber auf Workout-Modus bzw. `settings.default_increment_kg` zurück), aber es gibt weiterhin keine UI im Workout-Editor um sie zu *setzen* — Felder bleiben für jede Übung `NULL`. Erst relevant sobald eine Übung tatsächlich einen abweichenden Rep-Bereich/Schritt braucht. | 2 |

---

## Naming-Konvention für Exercises

Kay-Vorschlag: einheitliches Namensschema `Muskel_Übung_Hilfsmittel_Variante`
(z.B. "Decline Bench Press" → `Chest_Press_Bench_Decline` intern, "Chest
Press Bench Decline" als App-Anzeigename) statt der oft chaotischen
FEDB-Originalnamen ("Zottman Preacher Curl", "Conan's Wheel", ...).

**Analyse 2026-08-14** (Trockenlauf gegen alle 873 FEDB-Namen, nichts an
DB/Code verändert): Muskel lässt sich sauber aus der bestehenden
primary-muscle-Zuordnung ableiten. Übung (Press/Curl/Squat/...) und
Variante (Incline/Seated/...) stehen aber nirgends strukturiert in den
Daten, nur im freien Namenstext — automatische Ableitung per
Keyword-Matching auf den Originalnamen ergab:
- 176/873 (20%) ohne erkennbares Bewegungs-Wort → nicht automatisch ableitbar
- 127 von 429 generierten Namen kollidieren — unterschiedliche Übungen
  landen auf demselben Standard-Namen (z.B. "Barbell Curl", "Finger Curls",
  "Palms-Down Wrist Curl Over A Bench" und "Palms-Up Barbell Wrist Curl
  Over A Bench" würden alle zu `arms_curl_barbell`)

Kay-Entscheidung: nicht auf alle 873 anwenden (würde an >100 Stellen echte
Informationsverluste erzeugen, nicht nur Kosmetik).

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 7 | **Naming-Konvention organisch statt komplett** — Neues Feld `standardized_name` auf `exercises` (nullable, Fallback auf FEDB `name` solange leer). Nur für Übungen pflegen, die tatsächlich in eigenen Workouts verwendet werden (typischerweise 15–40 statt 873) — direkt im Exercise-Editor korrigierbar, Kollisionen fallen dort sofort auf statt unbemerkt in der ganzen Bibliothek zu stecken. Muskel-Teil aus der bestehenden Region-Zuordnung, Übung/Hilfsmittel/Variante manuell oder mit Vorschlag aus dem bestehenden Keyword-Parser (Script lag nur im Scratchpad, nicht committed — bei Bedarf neu bauen). | 2 |

---

## Aus Stufe 3 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 8 | **e1RM-Chart: mehrere Sessions am selben Kalendertag verschmelzen** — `E1rmTrendChart` gruppiert x-Achse nach Datum (`YYYY-MM-DD`), nicht nach Session. Bei mehreren Sessions derselben Übung am selben Tag (z.B. beim Testen) überlappen die Punkte auf der x-Achse. Bei normaler Nutzung (max. 1 Session/Tag pro Übung) tritt das nicht auf — bei Bedarf auf Session-Reihenfolge statt Datum umstellen. | 3 |

---

## Aus Stufe 4 zurückgestellt

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 9 | **MEV/MAV/MRV nicht editierbar** — `muscle_volume_targets` wird mit vertretbaren Default-Werten geseedet (siehe PROCESS_LOG), aber es gibt keine Settings-UI um sie pro Region anzupassen. Gleiche Situation wie schon bei den Workout-Exercise-Rep-Range-Overrides (#4) — Datenmodell + Auswertung fertig, Editier-UI fehlt noch. | 2 |
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
