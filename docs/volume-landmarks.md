# Weekly Volume Targets (MEV / MAV / MRV)

Stand 2026-09-18 · Entscheidung Kay (BACKLOG #46) · Code: `api/lib/VolumeLandmarks.php`
(Tabelle hier und Konstante dort immer gemeinsam ändern)

## Wofür die Werte da sind

„Volume · last 7 days" im Dashboard vergleicht pro Region die gewichteten Sätze
der letzten 7 Tage mit drei Schwellen und färbt danach die Ampel:

| Bereich | Status |
| :--- | :--- |
| unter MEV | Below MEV — zu wenig für Fortschritt |
| MEV bis MAV | Optimal |
| MAV bis MRV | Near limit |
| über MRV | Over MRV — mehr, als man sich erholen kann |

## Was vorher nicht stimmte

1. **Keine Quelle.** Der Seed sagte nur „approximate starting points".
2. **Richtwerte pro Muskel wurden auf Regionen angewendet.** Die Literatur gibt
   Werte pro Muskel an. Die App zählt aber pro Region — und „Legs" bündelt
   Quads, Hamstrings, Glutes und Waden. Deren Sätze landen alle in derselben
   Summe, der Zielwert war aber der eines einzelnen Muskels (Legs MAV 16).

## Methode

1. **Richtwerte pro Muskel** aus den muskelspezifischen Guides von Renaissance
   Periodization (RP) für fortgeschrittene Trainierende mit Ganzkörpertraining —
   nicht die „*P"-Spalten, die gelten, wenn ein Muskel priorisiert wird.
2. **Pro Schwelle die Obergrenze des RP-Bereichs.** RP gibt Bereiche an
   (z. B. Brust: MEV 4–6, MAV 6–16, MRV 16–24), weil die Schwelle individuell
   schwankt. Die Obergrenzen passen direkt auf die Ampel: unter 6 ist man
   sicher unter MEV, bis 16 im Wachstumsbereich, bis 24 am Limit, darüber drüber.
3. **Region = Summe ihrer Muskeln**, weil auch die angezeigte Satzzahl einer
   Region die Summe ihrer Muskeln ist.
4. **Zählweise:** Die App zählt mitarbeitende (sekundäre) Muskeln mit 0,5 Sätzen —
   die „fractional"-Methode aus Pelland et al. 2026. RP zählt für seine Werte nur
   direkte Sätze und hat die indirekte Arbeit bereits eingerechnet. Die Anzeige
   ist dadurch eher etwas großzügiger als RP.

## Werte pro Muskel

| Muskel (App) | Region | RP MEV | RP MAV | RP MRV | App MEV / MAV / MRV | Quelle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Chest | chest | 4–6 | 6–16 | 16–24 | 6 / 16 / 24 | [RP Chest][chest] |
| Shoulders | shoulders | 6–8 | 8–24 | 24–30 | 8 / 24 / 30 | [RP Side Delts][delts] — vordere Schulter wird über Drücken abgedeckt |
| Biceps | arms | 8–10 | 14–20 | 20–26 | 10 / 20 / 26 | [RP Biceps][biceps] |
| Triceps | arms | 4–6 | 6–16 | 16–20 | 6 / 16 / 20 | [RP Triceps][triceps] |
| Forearms | arms | 0–8 | 8–24 | 24–30 | 8 / 24 / 30 | [RP Forearms][forearms] |
| Lats + Middle Back | back | – | 14–22 | – | 10 / 22 / 25 | RP zeigt „Back" nur als Grafik. MAV aus [The Strength Equation][tse] (Sekundärquelle), MEV 10 / MRV 25 = bisheriger App-Wert, **nicht direkt verifiziert** |
| Traps | back | 0–4 | 4–12 | 12–20 | 4 / 12 / 20 | [RP Traps][traps] |
| Lower Back | back | – | – | – | 0 / 0 / 0 | keine RP-Quelle |
| Quadriceps | legs | 4–6 | 6–14 | 14–18 | 6 / 14 / 18 | [RP Quads][quads] |
| Hamstrings | legs | 2–4 | 2–8 | 8–14 | 4 / 8 / 14 | [RP Hamstrings][hams] |
| Glutes | legs | 6–8 | 8–24 | 24–30 | 8 / 24 / 30 | [RP Glutes][glutes] |
| Calves | legs | 4–6 | 6–16 | 16–24 | 6 / 16 / 24 | [RP Calves][calves] |
| Abductors, Adductors | legs | – | – | – | 0 / 0 / 0 | keine RP-Quelle |
| Abdominals | core | 0–4 | 4–12 | 12–20 | 4 / 12 / 20 | [RP Abs][abs] |
| Neck | core | – | – | – | 0 / 0 / 0 | keine Quelle |

## Ergebnis pro Region

| Region | vorher | jetzt |
| :--- | :--- | :--- |
| Chest | 8 / 16 / 22 | 6 / 16 / 24 |
| Back | 10 / 18 / 25 | 14 / 34 / 45 |
| Shoulders | 8 / 16 / 24 | 8 / 24 / 30 |
| Arms | 6 / 14 / 22 | 24 / 60 / 76 |
| Legs | 8 / 16 / 22 | 24 / 62 / 86 |
| Core | 6 / 12 / 18 | 4 / 12 / 20 |

## Bekannte Grenzen

- **Die Region verdeckt Lücken einzelner Muskeln.** Viel Quads und keine Waden
  kann in Summe „Optimal" ergeben. Genauer wäre ein Status pro Muskel
  (Option B) — bewusst zurückgestellt, weil Body-Map und Liste dafür umgebaut
  werden müssten.
- **Nicht direkt trainierte Muskeln heben das Ziel ihrer Region.** Wer Waden
  oder Unterarme bewusst nicht trainiert, sieht Legs bzw. Arms eher bei „Below MEV".
- **Back stammt teilweise aus einer Sekundärquelle** (siehe Tabelle).
- **Richtwerte sind Durchschnitte.** RP selbst: einzelne Personen liegen
  „significantly higher or lower". Die Werte sind in Settings → Weekly volume
  targets überschreibbar.

## Größenordnung und Zählweise — Belege

- [Schoenfeld, Ogborn & Krieger 2017][schoenfeld] (J Sports Sci, 15 Studien):
  mehr wöchentliche Sätze → mehr Muskelwachstum; etwa 10 Sätze pro Muskel und
  Woche als Richtmarke für nahezu maximale Hypertrophie.
- [Pelland et al. 2026][pelland] (Sports Medicine, 67 Studien, 2.058 Teilnehmende):
  Dosis-Wirkung von Volumen und Frequenz; zählt indirekte Sätze als halbe Sätze
  ([Zusammenfassung][biolayne]) — dieselbe Zählweise wie die App.
- [RP: Training Volume Landmarks][rp] — Definition von MV/MEV/MAV/MRV, Hinweis
  dass nur Sätze mit dem Muskel als Hauptbeweger zählen.

## Ändern

`PER_MUSCLE` in `api/lib/VolumeLandmarks.php` und die Tabelle oben gemeinsam
anpassen. Neue Installationen seeden daraus (`db/seed/muscle_volume_targets.php`);
eine bestehende Datenbank übernimmt neue Werte nur per Restore oder über
Settings — der Seed überschreibt nie Werte, die schon da sind.

[chest]: https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips
[delts]: https://rpstrength.com/blogs/articles/side-delt-hypertrophy-training-tips
[biceps]: https://rpstrength.com/blogs/articles/biceps-hypertrophy-training-tips
[triceps]: https://rpstrength.com/blogs/articles/triceps-hypertrophy-training-tips
[forearms]: https://rpstrength.com/blogs/articles/forearm-hypertrophy-training-tips
[traps]: https://rpstrength.com/blogs/articles/trap-hypertrophy-training-tips
[quads]: https://rpstrength.com/blogs/articles/quad-hypertrophy-training-tips
[hams]: https://rpstrength.com/blogs/articles/hamstring-hypertrophy-training-tips
[glutes]: https://rpstrength.com/blogs/articles/glute-hypertrophy-training-tips
[calves]: https://rpstrength.com/blogs/articles/calves-hypertrophy-training-tips
[abs]: https://rpstrength.com/blogs/articles/ab-hypertrophy-training-tips
[tse]: https://thestrengthequation.com/post/volume-landmarks.html
[rp]: https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth
[schoenfeld]: https://pubmed.ncbi.nlm.nih.gov/27433992/
[pelland]: https://link.springer.com/article/10.1007/s40279-025-02344-w
[biolayne]: https://biolayne.com/reps/issue-31/the-king-of-volume-metas/
