# 08 · v2-Andockpunkte

Nur Ist-Analyse und Vorbereitung, keine Umsetzung. Die Reihenfolge ist die aus dem Auftrag.

## Vorab für alle Bausteine

| Refactoring | Warum zuerst |
| :--- | :--- |
| R-02 Sync-Quittung | Jede neue syncbare Tabelle erbt den Fehler |
| R-03 Backup | Neue Tabellen sonst ungesichert. `UPSERT_ORDER` muss sie führen |
| R-06 Tests | Schutz, bevor Engine und Tracking wachsen |
| R-20 Migration | Bausteine 2 und 3 bringen neue Tabellen |

## 1 · Status und Briefing fürs nächste Training

**Was es schon gibt**

| Baustein | Ort | Liefert |
| :--- | :--- | :--- |
| Ziel je Übung | `lib/progression.ts:27`, `pages/TrackingPage.tsx:71-88` | Gewicht, Reps, Begründung |
| Kontext ohne offenes Workout | `GET /exercises/:id/progression-context` | Rep-Range, Schritt |
| Plateau | `lib/plateau.ts:81` | none, stalling, plateau |
| Recovery | `GET /dashboard/recovery` | Status, fallende Übungen |
| ACWR | `GET /dashboard/acwr` | Ratio |
| Volumen vs. Ziele | `GET /dashboard/muscle-volume` | Sätze je Region, MEV/MAV/MRV |
| Letztes Training | `/dashboard/consistency`, `session-volumes` | Tage, Volumen |

**Wo andocken**

- UI: neue erste Kachel im `OverviewScope` oder eigener Scope `Today` in `pages/DashboardPage.tsx:11`. Einstieg zusätzlich auf `WorkoutsPage`, wo der Start-Button sitzt.
- API: neuer Endpoint `GET /briefing?workout_id=&tz=`, Handler in `api/endpoints/dashboard.php`, Route in `api/index.php`.
- Logik: neues pures Modul `api/lib/Briefing.php` nach Vorbild `Recovery.php`.

**Empfehlung:** Progression und Plateau serverseitig nachziehen und den Client die Antwort anzeigen lassen. Sonst lädt das Briefing je Übung vier Requests wie heute der Exercise-Scope (`ExerciseScope.tsx:144-147`).

Risiko dabei: zwei Implementierungen der Progression. Entweder portieren und TS entfernen, oder das Briefing bleibt im Client mit einem Batch-Endpoint `POST /exercises/context`, der `last-sets` plus Kontext für n Übungen liefert. Der zweite Weg ist günstiger und erhält das Offline-Verhalten im Tracking. Ich empfehle ihn für die erste Stufe.

**Was im Datenmodell fehlt**

| Lücke | Folge | Vorschlag |
| :--- | :--- | :--- |
| Keine Reihenfolge oder Zuordnung "nächstes Training" | App kann nicht wissen, welches Workout dran ist | Heuristik aus letzter Session, sonst `training_plan`-Tabelle |
| RPE/RIR fehlen (0 %) | Vorschlag kennt die Anstrengung nicht | Entscheidung R-09, passt zu #156 |
| Sessions ohne Workout (61 %) | Historie je Workout kurz | Briefing übungsbasiert rechnen, nicht workoutbasiert |
| Kein PR-Verlauf | "Neuer PR möglich" muss live gerechnet werden | Aus `history` ableiten, nicht speichern |
| Keine Readiness-Eingabe (Schlaf, Muskelkater) | Recovery sieht nur Leistung (`Recovery.php:8-9`) | Optional `session_checkins`, erst bei echtem Bedarf |
| Regeneration je Muskel fehlt (#159) | Keine Aussage "Brust noch müde" | Aus `sets` plus `exercise_muscles` berechenbar, keine neue Tabelle |

**Nötige Refactorings:** R-11, R-07, R-08, R-01 (Briefing im Gym ohne Empfang), R-09 (Entscheidung).

## 2 · Übungs-Merkliste und Einpuzzeln in den Plan

**Was es schon gibt**

| Baustein | Ort |
| :--- | :--- |
| Picker mit Modi Filter, Suche, Workout | `components/ExerciseSelector.tsx:55-168` |
| Marker "used" | `api/lib/Repository/ExerciseRepository.php:21-27` |
| Plan-Editor | `pages/WorkoutEditPage.tsx`, `ExercisePickerSheet.tsx` |
| Abgleich von Plan-Zeilen | `WorkoutRepository::syncExercises`, `:174` |
| Muskelzuordnung, Regionen | `exercise_muscles`, `muscles.region` |
| Volumen je Region vs. Ziele | `GET /dashboard/muscle-volume` |

**Wo andocken**

- Vormerken: Button im `ExerciseDetailSheet.tsx` (dort sitzen schon Edit und Duplicate).
- Liste: neuer Filter im `ExerciseSelector`, damit Bibliothek und Picker sie gemeinsam bekommen.
- Einpuzzeln: neuer Screen `/planner` oder Bereich in `WorkoutEditPage`. Zeigt je Region die Lücke und gemerkte Übungen, schlägt Workouts mit passender Region vor.
- Backend: Plan-Volumen je Region aus `workout_exercises.planned_sets` × `exercise_muscles.weight` in neuer Methode `WorkoutRepository::plannedVolumeByRegion`.

**Was im Datenmodell fehlt**

| Lücke | Vorschlag |
| :--- | :--- |
| Merkliste | Umgesetzt (#166): Tabelle `exercise_watchlist`, Bookmark im Detail-Sheet, Modus „Saved“ im `ExerciseSelector`, Schreiben nur online. Noch offen: `note`, `target_region` |
| Status der Merkung | `status`: `saved`, `planned`, `tried`, `dropped` |
| Herkunft | `source_note` ⚠️ Annahme, klären, ob Links oder Fotos dazugehören |
| Aktiver Plan | Es gibt nur lose Workouts. Für "Wochenplan" fehlt eine Klammer wie `training_plan` plus Wochenfrequenz je Workout. Ohne sie lässt sich Plan-Volumen pro Woche nicht berechnen |
| Unique je Workout/Übung | Index, heute nur Picker-Regel (R-21) |

`planned_sets` allein reicht nicht für die Wochenlast: Wie oft ein Workout pro Woche läuft, steht nirgends. Das ist die wichtigste Modelllücke dieses Bausteins.

**Nötige Refactorings:** R-03, R-20, R-02 falls die Merkliste offline syncen soll. Empfehlung: Sie online-only bauen wie Workouts, dann entfällt das. Zusätzlich R-07 nicht nötig, R-16 hilfreich.

## 3 · Nutrition als eigenständiges Modul

**Was es schon gibt**

| Baustein | Ort | Nutzbar für |
| :--- | :--- | :--- |
| Grundumsatz aus BIA | `lib/biaMetrics.ts:18`, Metrik `Grundumsatz (kcal)` | Bedarf |
| Gewichtsverlauf | `bodyweight` | Bilanz-Trend |
| Profil | `lib/bodyProfile.ts`, `ProfileCard` | Formel-Fallback. Live nur Geburtsdatum |
| Upload-Muster | `api.upload`, `api/endpoints/bia.php` | Fotos |
| `media`-Tabelle | `db/schema.sql`, Felder `kind`, `path`, `mime` | Fotos, Spalte `meal_id` fehlt |
| Local-first-Muster | `localDb.ts`, `syncService.ts` | Mahlzeiten-Log |
| Trainingslast | `dailyTotals` | Aktivitätszuschlag, nur grob |

**Wo andocken**

- Navigation: 5. Tab in `components/BottomNav.tsx:7-12`, Routen in `App.tsx`. Platz wird eng, beim Design-Refactor prüfen.
- Modulgrenze: `api/endpoints/nutrition.php`, `api/lib/Repository/Nutrition*Repository.php`, `api/lib/Nutrition.php`, `frontend/src/pages/nutrition/`, `lib/nutrition/`. Kein Import aus Tracking. Verbindung nur über Tagesdaten.
- Sync: Stores in `localDb.ts` ergänzen (Version 4), Zweig in `sync.php` und `syncService.ts`.

**Was im Datenmodell fehlt**

| Tabelle | Inhalt |
| :--- | :--- |
| `nutrition_targets` | Gültig ab, kcal, Protein, Fett, Kohlenhydrate, Quelle der Berechnung |
| `foods` | Name, Nährwerte je 100 g, Quelle |
| `meals` | Zeitpunkt, Typ, Notiz, Sync-Felder |
| `meal_items` | Mahlzeit, Lebensmittel, Menge, berechnete Werte als Snapshot |
| `media` erweitern | `meal_id`, oder eigene `meal_photos` |
| Profil | Größe und Geschlecht fehlen live, Aktivitätsfaktor gar nicht |

**Fotos: offene Architekturfrage.** Hetzner Level 1 hat kein Node und keinen Worker. Ein Foto-Upload per PHP geht, offline nur mit Blob-Queue in IndexedDB, die heute nicht existiert. Automatische Erkennung braucht einen externen KI-Dienst, die App hat aktuell keinen (`05-api.md`) und das widerspräche dem bisherigen Prinzip "extern per Hand" (`docs/konzept.md:85`). Details in `09-open-questions.md`.

**Nötige Refactorings:** R-03, R-13, R-15, R-20. Fotos laufen über `Uploads::storeUploaded()` plus `media`-Zeile und kommen per `GET /media/:id` zurück (R-05, v1.2). Offen: Sicherung des Upload-Verzeichnisses, das FTP-Konto erreicht es nicht.

## 4 · Design/UI-Refactor (zuletzt)

**Was es schon gibt**

| Baustein | Ort |
| :--- | :--- |
| Farb-Tokens, Dark/Light | `frontend/src/index.css`, `CLAUDE.md` §7 |
| Basis-Komponenten | `components/ui/` |
| Kachel-Muster | `TileHeader`, `TileBody`, `KpiTile`, `Card` |
| Header-Slots | `AppShell.tsx`, `PageHeader`, `DashboardStickyBar` |
| Chart-Ticks, Trendlinien | `lib/chartTicks.ts`, `TrendlineLayer.tsx` |
| Referenzen | `docs/references/workout-app-v3.html`, `chart-lab.html` |

**Wo andocken:** Tokens in `index.css`, dann `components/ui`, dann Kacheln, zuletzt Screens.

**Was fehlt**

- Typo- und Spacing-Skala. Heute Arbitrary Values wie `text-[12.5px]` in den Screens (R-17).
- Desktop-Layout: `AppShell` und `TrackShell` deckeln auf 460 px, obwohl `CLAUDE.md` §1 tiefe Auswertung am Desktop nennt.
- Geteilte Zustände für Laden, Leer, Fehler (R-16).
- Nav-Struktur für einen möglichen 5. Tab und das Briefing.
- Icon-Satz: `CLAUDE.md` §7 verweist aufs Backlog, dort gibt es keinen Eintrag.

**Datenmodell:** keine Änderung nötig. `theme` reicht.

**Nötige Refactorings:** R-15, R-16, R-17, R-18, R-22. Zuletzt ist richtig, weil Bausteine 1 bis 3 neue Screens und Navigation bringen. Vorziehen würde doppelte Arbeit erzeugen.
