# Produkt-Strategie & Konkurrenz — Workout-Tracking-App

**Stand:** 13.08.2026 · gehört zu `workout-app-konzept.md`
Konsolidiert Positionierung, Konkurrenzanalyse, Feature-Priorisierung (P0–P2) und die Entscheidungen zu neuen Ideen.

## 1. Positionierung / USP

Leitsatz: **„Ich verstehe deine Trainingshistorie und sage dir, was du daraus machen sollst."**
Wir konkurrieren **nicht** über Social/Community (Hevy) oder generative Blackbox-KI (Fitbod), sondern über **Entscheidungshilfe auf deinen eigenen Daten** + **Datenhoheit**:
- **Coaching-Intelligenz statt nur Zahlen:** Progressions-Engine mit „Warum" (Double Progression), Plateau-/Deload-Erkennung, Muskel-Balance, Belastungssteuerung (ACWR) — sagt *was zu tun ist*, nicht nur *was war*.
- **Datenhoheit:** self-hosted, exportierbar (CSV/PDF), Open-Source-fähig, **kein Abo, keine Cloud-Bindung, Privacy**.
- **Modular/erweiterbar** — die Analytik wächst mit.

## 2. Konkurrenz (Positionierung & Stärken)

**Hevy — „Der schnelle, moderne digitale Gym-Log + Community."** Extrem schnelles Set-Logging, vorherige Werte sichtbar, Auto-Rest-Timer, Supersets, Drop Sets, RPE, PRs, 1RM, Volumen, Muskelgruppen-Analyse, Frequenz, Apple Watch/Wear OS, Social Feed/Profile/Leaderboards. Pro Übung Graphen für Gewicht, 1RM, Best-Set-Volume, Session-Volume, Reps. Muskelanalyse: 7-Tage-Übersicht, Sätze/Muskel, Verteilung, Historie, Konsistenz.

**Strong — „Notebook. Reinvented."** USP: **extrem wenig Reibung**. Supersets, Custom Exercises, CSV-Export, Apple Health, RPE, Advanced Charts, Body Measurements, Scheduling, Muscle Heat Map, Custom Timers, Apple Watch.

**Fitbod — KI-getriebene Analytik.** Overall/Muscle Strength, Estimated Strength/1RM, PRs, Volumen, Muskel-Recovery, Trends, Workout-Insights; generiert/adaptiert Workouts nach Recovery. Nachteil: geschlossen, Abo, Daten bei ihnen.

**Unser Take:** Hevys Logging-Speed + Strongs Reibungsarmut als Pflicht; darüber Fitbods Analytik-Tiefe — aber **offen, erklärend, self-hosted**. Der Unterschied ist nicht „Du hast 15 Sätze Brust gemacht", sondern „Deine Brust ist im MAV, deine Beine unter MEV — heute Beine, und Bench ist progressionsreif."

## 3. Feature-Priorisierung → Bau-Stufen

### 🔴 P0 (≈ Stufe 1–3)
1. Extrem schnelles Logging *(Stufe 2)* · 2. Previous Set/Workout *(Prototyp)* · 3. Auto Rest Timer *(Stufe 2)* · 4. Templates/Routinen *(Stufe 1)* · 5. PR Tracking *(Stufe 3)* · 6. e1RM *(Stufe 3)* · 7. Exercise Progress Chart *(Stufe 3)* · 8. Workout History *(Stufe 2/3)* · 9. Volumenberechnung *(Stufe 3)* · 10. Progressive-Overload-Empfehlung *(Prototyp — Engine + „Warum")* ← **Vorsprung**

### 🟠 P1 (≈ Stufe 4–5)
11. Muscle Volume · 12. Muscle Balance (Radar) · 13. RIR/RPE (`rpe` reserviert) · 14. Recovery (ACWR) · 15. Weekly Report · 16. Exercise Substitution (FEDB) · 17. Workout Summary · 18. Progress Pictures (media) · 19. Body Measurements · 20. Wearable/HR-Import

### 🟣 P2 (≈ Stufe 6+, Differenzierung)
21. Training Score · 22. Strength Score · 23. **Plateau Detection** · 24. Automatic Deload Detection · 25. Training Quality Score · 26. AI Coach · 27. **„Why?" bei Empfehlungen** *(schon im Prototyp!)* · 28. Adaptive Programming · 29. Goal-based Dashboards · 30. Long-term Training Intelligence

**Beobachtung:** Großteil von P0 ist bereits designt; „Why?" (P2) haben wir schon → wir starten stark und differenzieren früh.

## 4. Entscheidungen zu neuen Ideen

- **Rest Timer** *(P0):* Standard-Ruhezeit in Settings (pro Übung überschreibbar), im Workout Start/Stop mit Anzeige; optional Auto-Start nach „Satz erledigt". `settings.rest_seconds`.
- **Plateau Detection** *(P2, hoher Wert):* Flag, wenn e1RM/Top-Satz über N Sessions (3–4) nicht steigt → „Deload/Variation". Direkt an realem Problem (Incline/Dips seit April).
- **Zeitraum-Filter Stats:** 1 / 3 / 6 / 12 Monate / Alle — globaler Control im Analyse-Tab.
- **Puls/HR-Matching** *(P1/P2):* Set-Timestamps ↔ importierte HR-Zeitreihe (CSV) über die Zeitachse legen → HR-Kurve, Ø/Max-HR je Übung, Zeit in Zonen. `hr_samples(ts, bpm)`.
- **Kalorien** *(P2):* HR-basiert (Keytel; Gewicht/Alter aus BIA) — ehrlich als **Schätzung**; ohne HR nur grobe MET-Schätzung.
- **Bildmaterial:** Übungs-Demos aus **FEDB (Public Domain, 2 Winkel)**; eigene Bilder privat in `/uploads`. Eigener Muskelgruppen-Icon-Satz on-brand (Backlog).

## 5. Farb-/Color-Governance (App-weit)

- **Grün / Gelb / Rot reserviert** für Status: positiv / Warnung / negativ (Ampel MEV/MAV/MRV, ACWR, PR/Regress). Nie als Serienfarbe.
- **Muskelgruppen = fixe Kategorial-Palette**, überall identisch: Chest = Blau, Back = Orange, Shoulders = Aqua, Arms = Gelb, Legs = Magenta, Core = Grün.
- **Metriken = feste Farben** (Gewicht, Reps, 1RM je eine); Fett/Muskel/Wasser fest. Wiedererkennung über alle Charts.
- Neutrales Schwarz-Weiß-Chrome (shadcn-Stil) + Light/Dark-Umschalter; **Farbe gehört den Daten**.

## 6. Status

Design-/Planungsphase abgeschlossen. Prototyp v3 (`docs/references/workout-app-v3.html`), Chart Lab (`docs/references/chart-lab.html`), Bau-Briefing (`CLAUDE.md`). Nächster Schritt: Claude Code Stufe 1 → testen → iterieren.
