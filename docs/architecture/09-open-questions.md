# 09 · Offene Fragen und Annahmen

## Fragen an den Auftraggeber

| # | Frage | Warum wichtig | Empfehlung |
| :--- | :--- | :--- | :--- |
| F-01 | Muss ein Workout im Gym ohne Empfang startbar sein? | R-01 kostet M. Ohne Bedarf reicht ein klarer Fehlerhinweis | Ja, verlustsicher offline ist in `CLAUDE.md` §2 nicht verhandelbar |
| F-02 | Soll das Briefing das nächste Workout selbst wählen oder ergänzt es den manuellen Start? | Entscheidet, ob eine Plan-/Rotationstabelle nötig ist | Erst vom gewählten Workout aus briefen |
| F-03 | Wird RPE/RIR und Warm-up künftig im Gym erfasst? | Ohne Eingabe bleibt die Engine bei Reps und Gewicht, und die Spalten sind Ballast | Nur RIR am letzten Satz (#156), Warm-up weglassen |
| F-04 | Wie sollen Nutrition-Fotos ausgewertet werden: nur Ablage, extern per Hand oder per KI-API aus der App? | Größte Architekturfrage. API bedeutet Fremddienst, Kosten, Gesundheitsdaten extern | Erst nur Ablage, Erkennung als getrennter Schritt |
| F-05 | Gibt es einen festen Wochenplan oder laufen Workouts frei? | Ohne Frequenz lässt sich Plan-Volumen nicht berechnen, Baustein 2 hängt daran | Pro Workout eine Soll-Frequenz |

## Weitere offene Punkte

| # | Punkt | Art |
| :--- | :--- | :--- |
| F-06 | Wird `/uploads/` auf dem Host wirklich direkt ausgeliefert? Nicht live getestet (R-05) | Prüfen |
| F-07 | Warum hat keine Session einen HR-Datensatz? Import nie benutzt oder Upload-Limit gescheitert? | Klären |
| F-08 | Ist der Status "wackelig/stabil" im Alltag so spürbar? Bewertung stammt aus dem Code, keine Nutzungsdaten | Im Alltag bewerten |
| F-09 | Welche Backlog-Einträge #79 bis #95, #118 bis #122, #143 sind real erledigt? Text sagt "nicht deployt" oder "ungesehen". Deploys danach sprechen dagegen | Backlog-Hygiene |
| F-10 | #140 steht im `PROCESS_LOG.md:607` als offen, fehlt im Backlog | Klären |
| F-11 | Plan `shimmering-snacking-boot` (`PROCESS_LOG.md:270-272`) liegt nicht im Repo, #156 bis #158 beziehen sich darauf | Datei suchen |
| F-12 | Soll der MySQL-Fallback bleiben? `CLAUDE.md` §3 fordert ihn, er funktioniert aber nicht (R-14) | Entscheidung |
| F-13 | Sollen `recovery_*`-Settings live per Migration angelegt werden? Defaults greifen, Speichern in Settings legt sie an | Niedrig |
| F-14 | Bleibt `kw-gym-performance` von Spalten abhängig, die v2 ändert? Nicht geprüft, Repo liegt außerhalb | Vor Schema-Änderungen prüfen |

## Annahmen

| Annahme | Ort | Grundlage |
| :--- | :--- | :--- |
| ⚠️ `backups/20261026-analysis/` spiegelt den aktuellen Live-Stand ausreichend | `04-data-model.md` | Manifest nennt Live-Quelle, Integrität ok. Vier Tage alt |
| ⚠️ `recovery_*` fehlt live, weil seit Einführung keine Migration lief | `04-data-model.md`, R-20 | Seed legt sie an, Kopie enthält sie nicht |
| ⚠️ `workouts.notes` stammen aus Seed oder Import | `04-data-model.md` | Kein UI schreibt das Feld. Inhalte nicht gelesen |
| ⚠️ `/uploads` ist öffentlich erreichbar | R-05 | Keine Regel im Repo sperrt es, Host nicht getestet |
| ⚠️ Fehlende Rate-Limits gelten auch serverseitig | R-13 | Kein Code im Repo, Hosting-Schutz unbekannt |
| ⚠️ iOS-Verhalten (Offline-Start, Finish) | R-01, R-02 | Aus Code abgeleitet, nicht auf Gerät reproduziert |
| ⚠️ Bedarfs- und Foto-Vorschläge für Nutrition | `08-v2-touchpoints.md` | Keine Anforderungen im Repo. `grep` nach Ernährung findet nichts |

## Grenzen dieser Analyse

- Funktionszahlen sind Regex-Näherungen.
- Nicht jede der 200 Dateien wurde vollständig gelesen. Vollständig gelesen: Router, Endpunkte, Kern-Repositories, Sync, Store, Tracking, Domänen-Libs. Stichprobenartig: Chart-Komponenten, `ui/`, `ExerciseNaming`-Regeltabellen, `scripts/`.
- `BACKLOG.md` und `PROCESS_LOG.md` wurden über eine Verdichtung ausgewertet, zitierte Zeilen sind dort nicht einzeln geprüft.
- Die App lief für diese Doku nicht im Browser. Keine Laufzeit- und Performance-Messung, keine Bundle-Größe.
