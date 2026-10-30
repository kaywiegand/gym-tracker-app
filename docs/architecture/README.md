# Architektur-Doku `kw-gym-tracker` — Status quo

| | |
| :--- | :--- |
| Stand | 2026-10-30 |
| Version | 1.2 (Stabilisierung, Status in [07](07-refactoring.md)) |
| Commit der Zeilenbelege | `b1e47b8` (`b1e47b829694ec9ad798185d0f3d6e1338948fb5`) |
| Letzter Deploy | `20261023-1127-a6d5935` (`DEPLOYMENTS.md`) |
| Tags | `v1.0`, `v1.1`, `v1.2` (lokal) |

## Kurzfassung

- Self-hosted Trainings-App als installierbare PWA: Frontend React 19 / Vite / TypeScript, Backend PHP 8 ohne Abhängigkeiten, Datenhaltung SQLite.
- Betrieb auf Hetzner Webhosting Level 1 per FTP-Deploy. Ein Nutzer, ein Passwort.
- Im Gym: Workout starten, Sätze abhaken, Rest-Timer, Vorschlag aus Double Progression. Jeder Satz landet zuerst in IndexedDB, dann per Push-Sync auf dem Server.
- Am Desktop: Dashboard mit vier Scopes (Overview, Exercise, Workout, Body), CSV-Export, Druck-Report, JSON-Backup.
- Es gibt bereits Bausteine fürs Briefing (`progression.ts`, `plateau.ts`, `Recovery.php`, ACWR), aber keine Stelle, die sie zusammenführt.
- Stärkste Risiken: Backup deckt `workout_groups` und FEDB-Kuration nicht ab (R-03), das Upload-Verzeichnis außerhalb des Docroots ist in keiner Sicherung, Offline-Start auf dem iPhone nicht geprüft.
- Tests: PHP 335 Prüfungen, Frontend 38 Tests, alle grün. `tsc -b` grün. `deploy.sh` stoppt bei Rot.

## Index

| Datei | Inhalt |
| :--- | :--- |
| [01-overview.md](01-overview.md) | Zweck, Stack, Laufzeit, Build/Run |
| [02-features.md](02-features.md) | Feature-Inventar, Trainingstag |
| [03-architecture.md](03-architecture.md) | Schichten, Komponenten, Datenfluss |
| [04-data-model.md](04-data-model.md) | Entitäten, Felder, Füllgrade |
| [05-api.md](05-api.md) | Endpunkte, Funktionen, Kern-Flows |
| [06-code-structure.md](06-code-structure.md) | Baum, Abhängigkeiten, Kennzahlen, Zustände |
| [07-refactoring.md](07-refactoring.md) | Befunde R-01 ff., Nutzen vs. Aufwand |
| [08-v2-touchpoints.md](08-v2-touchpoints.md) | Andockpunkte für die vier v2-Bausteine |
| [09-open-questions.md](09-open-questions.md) | Annahmen und offene Fragen |

## Lesehilfe

- Belege stehen als `pfad:zeile` im Text. Zeilen gelten für den Commit oben, nicht für v1.2.
- `⚠️ Annahme` markiert, was nicht sicher aus dem Repo folgt.
- Füllgrade stammen aus der Live-Kopie vom 2026-10-26 (`backups/20261026-analysis/`, nur lesend abgefragt). Sie stehen nur als Prozent. Echte Trainings- oder Körperwerte sind nicht enthalten.
