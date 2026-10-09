# Prompt: Konzept für die tiefe Auswertung der Gym-App-Daten

> Zum Einfügen in eine neue Claude-Session (Chat oder Code, Workspace `/Users/kaywiegand/Workspace`).
> Ergebnis soll ein **Konzept** sein, noch keine Umsetzung.

---

Du bist mein Sparringspartner und Architect für Daten-Projekte (Rollen: Data Analyst, Data Engineer, Architect, PM).
Lies zuerst `docs/personal/STYLE.md`, `docs/personal/PROFILE.md`, `docs/PROJECTS.md`, `docs/CONVENTIONS.md`.

## Ziel

Ich habe eine selbst gehostete Workout-App (`kw-gym-tracker`) mit eigenen, exportierbaren Daten.
Ich will diese Daten **detaillierter** auseinandernehmen können, auf **drei Wegen**, die dieselbe Datenbasis nutzen:

1. **Data-Projekt** (`kw-gym-performance`, Notebooks): tiefe, individuelle Analysen, Hypothesen, Modelle.
2. **Individuelle Notebooks**: einzelne Fragestellungen ad hoc, ohne das ganze Projekt umzubauen.
3. **Fertiges Dashboard** (`~/Projects/GYM-Fitness/dashbaord/Fitness-Dashboard.html`, Chart.js, eine Datei): schnelle Standardansichten, immer aktuell, ohne Code.

Das Konzept soll beantworten, wie aus **einer** Quelle der Wahrheit (der App-DB) alle drei Wege gespeist werden, ohne Doppelarbeit und ohne dass Zahlen auseinanderlaufen.

## Ausgangslage (bitte selbst prüfen, nicht nur glauben)

- **App-DB** (SQLite, Schema `kw-gym-tracker/db/schema.sql`): `sessions`, `sets`, `exercises` (+ `exercise_muscles`, `muscles`), `workouts`, `bodyweight`, `body_measurements`, `bia_measurements`/`bia_values` (Long-Format), `hr_samples`. Live-Stand per `deploy/backup.sh` als `backups/<id>/fitness.db`.
- **Dashboard-Generator** existiert: `kw-gym-tracker/scripts/export-dashboard.py` (DB → `RAW`-Block im HTML, plus flache CSV). Das Dashboard rechnet alles im Browser aus `RAW` (`exMeta`, `rows`, `bia`).
- **`kw-gym-performance`**: Notebooks `ETL_workouts`, `EDA_workouts`, `ETL_bia-analysis`, `EDA_bia-analysis-plots`, `ETL_health-data`; Daten liegen als Gainsfire-CSV/Excel unter `data/raw`, bereinigt unter `data/processed` (nur bis 10/2025). Es arbeitet **nicht** auf der App-DB.
- Das Dashboard und das Data-Projekt behandeln dieselben Themen (Volumen, e1RM, Intensität, Muskelgruppen, BIA), aber auf verschiedenen, eingefrorenen Exporten.

## Bekannte Datenqualitäts-Themen (müssen im Konzept vorkommen)

- **Pfund statt kg:** Mehrere Maschinen zeigen dauerhaft Pfund an (Lat Pulldown, Rear Delt Fly / Reverse Butterfly, Hip Abduction, Dips). `ETL_workouts.ipynb` korrigiert das mit „Gewicht > 50 → × 0,4536" für genau diese Übungen. In der App-DB ist es **nicht** korrigiert (BACKLOG #75). Frage: Wo wird bereinigt (DB, ETL-Schicht, pro Gerät als Stammdatum)?
- **Verlauf vor 12/2025 ist lückenhaft** in der App-DB (selektiver Import aus Gainsfire); ältere Gainsfire-Exporte enthalten mehr, teils doppelt (zwei Schreibweisen derselben Übung).
- **Übungsnamen:** normierte Titel (berechnet) gegen Gainsfire-Namen; Mapping in `kw-gym-tracker/scripts/gainsfire-mapping.tsv`.
- **Sessions-Zeiten** bei Importen sind künstlich (fester Startzeitpunkt, 150 s pro Satz) — Dauer-Auswertungen sind dort nicht belastbar.
- Aufwärmsätze sind nur in neuen Sessions markiert.

## Was das Konzept liefern soll

1. **Datenschicht:** Welche Ebene sitzt zwischen App-DB und den drei Verbrauchern (z. B. ein versionierter Export `sets_clean`, `sessions`, `exercises`, `bia` als Parquet/CSV, erzeugt durch ein Skript)? Welche Bereinigungen gehören dort hinein (Pfund, Duplikate, Namen), welche nicht? Wie wird jede Bereinigung nachvollziehbar (Regel + Protokoll)?
2. **Kennzahlen-Katalog:** Einheitliche Definitionen an **einer** Stelle (e1RM, Volume Load, Sätze pro Muskel/Woche, ACWR, Plateau, Konsistenz, Körperkomposition-Deltas). Jede Kennzahl: Formel, Quelle, Einheit, bekannte Grenzen. Abgleich mit dem, was App, Dashboard und Notebooks heute je anders rechnen.
3. **Notebook-Landkarte** für `kw-gym-performance`: Welche Notebooks (nach `docs/CONVENTIONS.md` nummeriert), mit welcher Fragestellung je Notebook. Vorschläge für tiefere Analysen, z. B.:
   - Progression je Übung und Muskelgruppe, Plateau-Erkennung, Reps-in-Reserve-Schätzung aus Rep-Abfall
   - Volumen-Dosis gegen Veränderung der Körperkomposition (BIA) mit ehrlicher Unsicherheit bei nur ~6 Scans
   - Trainingskonsistenz, Pausen, Deloads, Wochentags-Muster
   - Last-Verteilung über Bewegungsmuster (Push/Pull/Beine)
   - Gerätewechsel und Einheiten als Fehlerquelle
   - Erholung/Herzfrequenz, sobald HR-Daten da sind
   Pro Vorschlag: Frage, benötigte Spalten, erwarteter Nutzen, Aufwand, Priorität.
4. **Dashboard-Konzept:** Welche Ansichten bleiben „fertig und statisch generiert" (Dashboard), welche nur im Notebook? Wie wird das Dashboard aktualisiert (ein Befehl, idempotent, datierte Archivkopie)? Welche Ansichten fehlen heute (z. B. Einzelübungs-Vergleich, Gerätewechsel-Warnung, Datenqualitäts-Panel)?
5. **Ablauf & Verantwortung:** Wer erzeugt was, wann (z. B. nach jedem Training / wöchentlich), und wo steht die Single Source of Truth für Definitionen. Kein Fakt darf in zwei Dateien stehen (`CLAUDE.md`-Regel: MD-Files sind Meta, Zahlen gehören in Notebooks).
6. **Phasen:** 3–4 Phasen mit je einem klaren, kleinen Ergebnis (Reihenfolge begründen, was zuerst den größten Hebel hat — mein Tipp: Pfund-Bereinigung und Datenschicht vor neuen Analysen).
7. **Risiken & offene Entscheidungen** für mich, jeweils mit deiner Empfehlung.

## Rahmen

- Code ist Englisch, Doku darf Deutsch sein. Zahlenformat und Wording nach `docs/CONVENTIONS.md`.
- Metrisch, kg/cm. Keine unnötigen Abhängigkeiten; das Dashboard bleibt **eine** HTML-Datei.
- Daten verlassen den Rechner nicht (self-hosted, Datenhoheit).
- Keine Umsetzung, keine Änderungen an Live-Daten. Erst Konzept, ich bestätige.

## Antwortformat

Kurz und direkt. Beginne mit deiner Gesamtempfehlung in fünf Sätzen, danach die sechs Abschnitte oben als Tabellen oder knappe Listen. Widersprich, wo mein Ansatz schlecht ist. Zum Schluss: die drei wichtigsten Entscheidungen, die ich treffen muss.
