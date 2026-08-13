# Visualisierungs-Backlog — Workout-Tracking-App

**Stand:** 13.08.2026 · gehört zu `workout-app-konzept.md`
Bewertete Sammlung möglicher Charts. Bibliothek: **Nivo** + eigene SVG-Körperkomponente. „Daten-Voraussetzung" = ab wann der Chart sinnvoll Substanz hat.

## Tier 1 — Muss (klare Frage, sofort wertvoll)

| Chart | Beantwortet | Daten-Voraussetzung | Status |
|---|---|---|---|
| **Linie (Trend)** | Kraft-/e1RM-/Volumen-Entwicklung + Prognose | ab ~3 Sessions | im Prototyp |
| **Körper-Heatmap (anatomisch)** | Belastung pro Muskel vs. MEV/MAV/MRV | 1 Woche | im Prototyp (Signature) |
| **Radar / Netz** | Muskel-Balance (Sets/Weight/1RM umschaltbar) | 4 Wochen | im Prototyp |
| **Kalender-Heatmap** | Konsistenz/Frequenz, Lücken | mehrere Wochen | im Prototyp |
| **Heatmap-Matrix Workout × Muskel** | welches Workout vernachlässigt welchen Muskel | 2–4 Wochen | im Chart Lab (Idee Kayo) |
| **Bullet-Chart** | Ist vs. Ziel-Bereich (Modus-Range / MEV·MAV·MRV) | 1 Woche | im Chart Lab (Idee Kayo) |
| **Stacked Bars nach Muskelgruppe** | Wochenvolumen je Muskel → Arme vs. Beine | 2–4 Wochen | im Chart Lab (Idee Kayo) |

## Tier 2 — Nett (wertvoll, braucht mehr Historie)

| Chart | Beantwortet | Daten-Voraussetzung | Notiz |
|---|---|---|---|
| **Boxplot** | Streuung/Ausreißer je Übung | ~10+ Sessions/Übung | im Chart Lab |
| **Small Multiples / Sparklines** | Mini-Trend je Übung | mehrere Sessions | KPI-Sparklines im Prototyp |
| **Circle Packing** | Volumen-Hierarchie Muskel→Übung→Sätze | 2–4 Wochen | explorativ |
| **Slope-Chart** | BIA Messung A → B über Metriken (inkl. L/R) | ≥2 BIA-Messungen | im Chart Lab; ehrl. Alternative zu Sankey |
| **Waterfall** | Körperkomposition-Veränderung | ≥2 BIA-Messungen | ehrl. Alternative zu Sankey |
| **Bump-Chart** | Rang-Verlauf der Lifts über lange Zeit | Monate/Jahre | ersetzt „Chord" |
| **Scatter „Kraftkurve"** | Gewicht × Reps je Übung | mehrere Sessions | speist e1RM |
| **PR-/kum.-Volumen-Timeline** | Rekord-Verlauf, Momentum | laufend | motivierend |

## Überdenken / umgelenkt

- **Sankey (Fett→Muskel):** falsche Metapher (kein Massentransfer). → Waterfall/Slope. Sankey passt für „Volumen fließt Workout → Muskelgruppe".
- **Chord (Übungs-Verschiebung):** schwer lesbar → Bump-Chart.

## UI-Assets / Icons (Backlog)

- **Muskelgruppen-Icons neu gestalten:** aktuelle abstrakte SVG-Glyphs sind Platzhalter → später cooler, konsistenter Icon-/Illustrations-Satz (on-brand, themebar, farbcodiert). Original erstellen — nicht aus modux ableiten (Urheberrecht).
- Listen (Exercises, Picker) & Workouts bewusst **ohne Icons** (Namen reichen).
- Übungs-Demos: FEDB-Fotos (Public Domain); eigene Bilder privat in `/uploads`.

## Status Chart Lab

Erledigt: `docs/references/chart-lab.html` (Tier-1 + ausgewählte Tier-2, Light/Dark). Auswahl fürs finale Dashboard beim Bau der Analyse-Stufe → Umsetzung in Nivo.
