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

## Stufe 2 — Vorbereitung

| # | Beschreibung | Prio |
| :--- | :--- | :--- |
| 5 | **IndexedDB Offline-Queue** — Stufe 1 hat nur ein installierbares PWA-App-Shell-Manifest (`vite-plugin-pwa`), aber noch keinen Offline-Datenspeicher. Das "verlustsicher offline"-Prinzip (CLAUDE.md §2) greift erst mit dem Tracking-Loop in Stufe 2. | 1 |
| 6 | **Sync-Service + UUID-Upsert-Logik** — Schema ist bereits UUID-first + `updated_at`/`deleted_at` vorbereitet, aber es gibt noch keinen Sync-Endpoint/-Service. Kommt mit Stufe 2. | 1 |
