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
| 2 | **"In your workouts" im Exercise-Picker** — Prototyp zeigt eine "Most trained"-Sektion oben im Picker. Ohne Tracking-Historie (kommt erst Stufe 2) gibt es dafür noch keine sinnvolle Datengrundlage; aktuell zeigt der Picker nur Suche + Gruppierung nach Region. Nach Stufe 2 (Sessions/Sets vorhanden) neu bewerten — dann ließe sich "meistgenutzt" oder "zuletzt verwendet" echt berechnen. | 2 |
| 3 | **Muskel-Zuordnung im Exercise-Editor** — "Duplicate & edit" kopiert primary/secondary Muskeln 1:1, aber es gibt noch keine UI um sie für die Kopie neu zuzuordnen (nur Skalarfelder editierbar: Name/Equipment/Category/Mechanic/Increment). Für eigene Custom-Übungen mit abweichender Muskel-Verteilung müsste das nachgezogen werden — bewusst Overengineering-Vermeidung für Stufe 1. | 2 |
| 4 | **Workout-Exercise Rep-Range-Override** — Schema hat `rep_low_override`/`rep_high_override`/`increment_override_kg` pro `workout_exercise`, UI setzt sie in Stufe 1 nirgends (immer `NULL`, Workout erbt den Modus). Bewusst minimal gehalten, da Akzeptanzkriterium nur "Modus + Übungen + geplante Sätze" fordert. Für Stufe 2/3 (wenn Progression-Engine live ist) relevant. | 2 |

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

## Stufe 2 — Vorbereitung

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 5 | **IndexedDB Offline-Queue** — Stufe 1 hat nur ein installierbares PWA-App-Shell-Manifest (`vite-plugin-pwa`), aber noch keinen Offline-Datenspeicher. Das "verlustsicher offline"-Prinzip (CLAUDE.md §2) greift erst mit dem Tracking-Loop in Stufe 2. | 1 |
| 6 | **Sync-Service + UUID-Upsert-Logik** — Schema ist bereits UUID-first + `updated_at`/`deleted_at` vorbereitet, aber es gibt noch keinen Sync-Endpoint/-Service. Kommt mit Stufe 2. | 1 |
