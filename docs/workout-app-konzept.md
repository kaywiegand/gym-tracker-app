# Workout-Tracking-App — Konzept & Entscheidungen

**Status:** Konzeptphase · **Stand:** 13.08.2026 · **Autor:** Kayo + Claude
**Zweck:** Single Source of Truth für die Planung. Hält Anforderungen und Architektur-Entscheidungen fest und dient als Briefing für die Umsetzung in Claude Code.
**Verwandtes Dokument:** `datenmodell.md` (vollständiges Datenschema).

---

## 1. Ziel & Kontext

Ablösung der bisherigen App (Gainfire), deren Datenexport zu aufwendig ist. Ziel ist eine eigene, schlanke, self-hosted **Web-App**, die

1. Workouts & Übungen einrichtet,
2. Trainings live trackt (mobil im Gym),
3. jederzeit tiefe Statistiken/Trends/Prädiktionen liefert (am Desktop zu Hause),
4. BIA-Werte (extern per AI aus Fotos extrahiert) als strukturierte Zeitreihe importiert und in Trends einbezieht,
5. modular und erweiterbar bleibt und
6. so sauber dokumentiert ist, dass sie via GitHub von anderen nachgenutzt werden kann.

**Leitplanken:** smart · schlank · file-basiert · metrisch (kg, cm) · mobil im Gym / Desktop für Auswertung · verlustsicher offline · modular erweiterbar · GitHub-freundlich.

---

## 2. Verfeinerte Anforderungen

### Funktional

**A — Einrichtung**
- **Übung** = Name (Nomenklatur: Muskelgruppe · Übung · Hilfsmittel · Variation), 1..n Bilder als Schnell-Visual, Zuordnung zu 1..n Muskelgruppen mit Rolle (primär/sekundär), Flag *Komplex- vs. Isolationsübung*.
- **Workout** = Name + **Trainingsmodus** + beliebige Übungen; je Übung: Anzahl geplanter Sätze (kein festes Zielgewicht — siehe F).

**B — Tracking**
- Workout starten (Start-Timestamp), Übungen abarbeiten, je Satz Gewicht + Reps erfassen; Ende-Timestamp.
- Beim Start jeder Übung sind die **echten Werte vom letzten Mal vorausgefüllt** + ein Progressions-Vorschlag (siehe F).
- **Manuelle Eingabe von Körpergewicht.**
- Eingaben werden **sofort lokal** gespeichert (§5).

**C — Analyse (frei wählbar: Übung / Workout / BIA / Gesamt-Übersicht)**
- Retrospektive **und** Prädiktion von Trends.
- **e1RM** je Übung; Volumen/Tonnage/Intensität (§6).
- **Belastung pro Muskelgruppe** (Heatmap).
- **Verletzungsprävention** über Belastungssteuerung (ACWR).
- **BIA-Trends** aus importierten Messreihen, parallel zum Krafttrend.
- **PR-/Performance-Erkennung pro Workout** (Steigerung Gewicht/Reps/e1RM vs. letztes Mal) als Schnellübersicht am Workout.

**D — BIA-Import (kein In-App-Capture)**
- BIA-Werte werden **extern per AI aus dem Foto extrahiert** und als strukturierte Daten **importiert** (Long-Format, CSV/JSON). Original-Foto optional als Beleg ablegbar.

**E — Export/Dokumentation**
- Auswertungen als **Export**, u. a. **PDF** (Desktop).

**F — Trainingssteuerung & Progression** *(neu)*
- **Settings-Page** definiert die Rep-Bereiche je Trainingsmodus (frei editierbar). Seed:
  - Maximalkraft: **3–5** · Hypertrophie: **6–10** · Ausdauer: **10–12**
- Jedes **Workout wählt einen Modus** → alle Übungen erben dessen Rep-Bereich (pro Übung überschreibbar). So: Warmup-Workout = Ausdauer, Hauptübungen = Hypertrophie, Peak-Block = Maximalkraft.
- **Progression = Double Progression** (Standard-Methode): Gewicht bleibt, bis **alle Arbeitssätze das obere Bereichsende** erreichen → dann Gewicht + Schritt, Reps fallen und werden hochgearbeitet.
- Die App **schlägt vor** (Gewicht halten & Reps drauf / steigern), der Nutzer **bestätigt** — kein Automatismus.
- Gewichtsschritt: Default **+2,5 kg**, **pro Übung anpassbar** (Geräteabhängig: KH/LH/Kabel/Maschine).
- **Progressions-Engine als austauschbares Modul** (heute Double Progression; später z. B. RPE- oder %-1RM-Logik ohne Umbau danebenstellbar).

### Nicht-funktional
- **Mobil-first** fürs Gym; **Desktop** für Analyse/Export.
- **Verlustsicherheit** höchste Priorität (§5).
- **Modularität/Erweiterbarkeit** in Datenmodell, Code, Architektur.
- **Einheiten** durchgängig metrisch (kg, cm).
- **Zugriffsschutz:** einfacher Passwortschutz (ein Login für die ganze App).
- **Portabilität:** „klonen & starten", ohne DB-Server.

---

## 3. Architektur-Entscheidungen (Decision Log)

| # | Entscheidung | Begründung | Verworfene Alternativen |
|---|---|---|---|
| D1 | **Datenhaltung: eine SQLite-Datei** | File-basiert, kein DB-Server, Backup = Datei kopieren. Echtes SQL für Analytik; eine Datei bleibt **joinbar** (Sätze × Übungen × Muskeln × BIA). | Mehrere `.db` (bricht Joins); JSON (Analytik zu aufwendig); MySQL/PostgreSQL (Overkill/unportabel). |
| D2 | **Modularität über Tabellen + Code**, nicht getrennte Dateien | Ladezeit bei Single-User nie Problem; Erweiterbarkeit aus Schema + Code. | DB-Splitting „für Performance". |
| D3 | **Backend: PHP** | Einziges serverseitig Lauffähige auf Hetzner Webhosting Level 1. Nimmt HTTP entgegen, bedient SQLite, hält Login. | Node/Python (bräuchte Extra-Server). |
| D4 | **Frontend: React als PWA** | Großes Ökosystem für Analyse-UI, installierbar & offline. Build = statische Dateien. | Svelte (weniger Chart-Bausteine); Vanilla (zu viel Handarbeit). |
| D5 | **Analytik im Browser (JS)** | Bei Single-User rechnet der Browser 1RM/Volumen/Trends/ACWR sofort & offline. | Python/pandas serverseitig (Weg B, zurückgestellt). |
| D6 | **Offline: Local-first mit Sync-Queue** | Eingaben zuerst lokal (IndexedDB), Sync später. Verlustsicher bei Funkloch/Absturz. | Online-only (Verlustrisiko). |
| D7 | **Hosting: Weg A** (alles auf Level-1, 0 € extra) | Nutzt Vorhandenes; VPS-Upgrade (Weg B) bleibt offen. | Weg B (~5 €/Monat) zurückgestellt. |
| D8 | **Übungs-DB aus offenem Datensatz seeden** | *Free Exercise DB* (Public Domain, primär/sekundär Muskeln, Bilder) → GitHub-tauglich. | Eigenbau der Übungs-DB. |
| D9 | **Muskelmodell: primär/sekundär, Sekundär = 0,5** | Etablierte Konvention; Sekundär = halber Satz fürs Volumen. Faktor konfigurierbar. | Eigenes Intensitätsschema. |
| D10 | **DB-Fallback: MySQL** (die 1 verfügbare DB) | Falls `PDO_SQLite` am Host aus ist. Beim Deploy prüfen. | — |
| D11 | **BIA = Import (Long-Format)**, kein In-App-Capture | Foto→Werte macht externe AI; App importiert nur. Long-Format bildet jeden InBody-Report flexibel ab (inkl. Referenzbereiche, segmentale Werte). | Foto-Capture-Modul; feste Wide-Tabelle. |
| D12 | **Kein festes Zielgewicht — dynamisches Ziel** | Statische Zielgewichte sind in der Praxis nutzlos (zu viel Streuung). Ziel wird aus **Historie + Modus** berechnet. | Feste Ziel-Gewicht/-Reps in der Vorlage. |
| D13 | **Trainingsmodus pro Workout, Rep-Bereiche in Settings** | Ein Workout erbt seinen Rep-Bereich vom gewählten Modus → Warmup/Hypertrophie/Maximalkraft ohne Regel-Duplikate. | Globaler Einzelmodus; Rep-Ziele je Übung hart kodiert. |
| D14 | **Progressions-Engine als austauschbares Modul** | Double Progression heute; RPE/%-1RM später danebenstellbar, ohne Rest anzufassen. | Progression fest im Tracking-Code verdrahtet. |

---

## 4. System-Architektur (Überblick)

```
[ React-PWA im Browser ]  ──HTTP/JSON──▶  [ PHP-API auf Hetzner ]  ──▶  [ SQLite-Datei ]
   Handy (Gym) / Desktop                     (Login · Sync · Import ·        (+ /uploads für
   + IndexedDB (Offline-Puffer)               Export)                          Übungs-Bilder)
```

- **Frontend** = statische Dateien (React-Build), als PWA installierbar.
- **Übungs-Bilder** als Dateien in `/uploads`; in SQLite nur der Pfad.
- **Analytik & Progression** im Client; PHP macht Login, Sync, BIA-Import, schwere Exporte (PDF).

---

## 5. Offline- & Sync-Konzept (verlustsicher)

Oberste Regel: **Der Server ist nie der erste Speicherort.**

1. **Sofort lokal schreiben:** Satz eingetippt → sofort IndexedDB. Netzverlust/Absturz/Akku leer → Satz ist da.
2. **PWA startet offline:** Service Worker cached die App.
3. **Sync-Queue:** bei Netz → Push an PHP-API (im Hintergrund, spätestens bei „Workout beenden"); Fehler bleiben in der Queue, Retry.
4. **Idempotenter Sync:** jeder Satz bekommt **am Gerät** UUID + Timestamp → keine Duplikate, Reihenfolge rekonstruierbar.

---

## 6. Fitness-Domänenmodell & Kennzahlen

- **Muskelzuordnung:** primär (Agonist) / sekundär (Synergist). ~15–17 Standard-Muskelgruppen.
- **e1RM:** Epley `1RM ≈ Gewicht × (1 + Reps/30)`; alt. Brzycki. Basis für Kraft-Trend & Prädiktion.
- **Volume Load / Tonnage:** `Σ (Sätze × Reps × Gewicht)`.
- **Volumen pro Muskelgruppe/Woche:** Sätze je Muskel, Sekundär × 0,5. Bewertung an **MEV/MAV/MRV**.
- **Intensität:** % e1RM pro Satz.
- **Progression (Double Progression):** Gewicht +Schritt, wenn alle Arbeitssätze das obere Ende des Modus-Rep-Bereichs erreichen; sonst Reps draufpacken.
- **Verletzungsprävention — ACWR:** Last 7 Tage / 28-Tage-Schnitt; Sweet Spot ~0,8–1,3, Ampel bei Anstieg.
- **PR-Erkennung:** Vergleich zum letzten Mal (Gewicht/Reps/e1RM ↑) → Badge am Workout.
- **BIA-Zeitreihe:** importierte Messreihen + Referenzbereiche, parallel zum Krafttrend.

---

## 7. Datenhaltung — Entitäten (Details: `datenmodell.md`)

Eine `fitness.db`, modular in Tabellen: `settings`, `training_modes`, `muscles`, `exercises`, `exercise_muscles`, `media`, `workouts`, `workout_exercises`, `sessions`, `sets`, `bodyweight`, `bia_measurements`, `bia_values` (+ `hr_samples`, `body_measurements` für spätere Stufen). **Kein festes Zielgewicht** in `workout_exercises`.

---

## 8. UX/UI-Leitplanken

- **Gym-Modus (mobil):** minimale Klicks, große Touch-Targets, letzte Werte + Vorschlag sichtbar, offline-fähig.
- **Analyse-Modus (Desktop):** frei wählbare Auswertung (Übung / Workout / BIA / Übersicht), Charts, Export/PDF.
- **Übersicht/Dashboard:** wichtigste Kennzahlen auf einen Blick.
- **Chrome neutral (shadcn), Dark/Light, Farbe gehört den Daten** (Farb-Governance s. `produkt-strategie.md §5`).

---

## 9. Roadmap — modulare Ausbaustufen

- **Stufe 1 (Start):** **Settings (Modi + Rep-Bereiche)** und Einrichtung von **Übungen & Workouts** (Seed aus Free Exercise DB, Muskelzuordnung, Modus-Auswahl, Bilder).
- **Stufe 2:** **Tracking-Loop** — Workout starten, Sätze erfassen (letzte Werte vorausgefüllt), lokal speichern + Sync, Session-Ende, Körpergewicht, Rest-Timer.
- **Stufe 3:** **Progression + Analyse-Grundlage** — Double-Progression-Vorschlag, e1RM, Volumen, PR-Badge, erste Charts.
- **Stufe 4:** **Muskel-Heatmap + Radar + ACWR**, Übersicht-Dashboard.
- **Stufe 5:** **BIA-Import + HR-Import/-Matching + Body-Measurements**.
- **Stufe 6:** **Export/PDF + Plateau-/Deload-Detection + Feinschliff**.

---

## Anhang — Referenzen & Testdaten

- Free Exercise DB (Public Domain): https://github.com/yuhonas/free-exercise-db
- wger / exercemus: https://github.com/exercemus/exercises
- Kennzahlen: e1RM (Epley/Brzycki), Volume Load, MEV/MAV/MRV, ACWR, Double Progression.
- **Test-Seed BIA:** `FitnessExportBIA.csv` — 4 Messungen (2025-05-27 … 2026-06-12), InBody-Style.
