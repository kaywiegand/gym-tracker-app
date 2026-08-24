<?php
declare(strict_types=1);

// Parses the InBody-style wide-format BIA CSV export (CLAUDE.md §9 /
// Stage-5 plan §2: one header row of scan dates, then one row per
// category/subcategory/metric with one value per date column). Pure
// parsing, no DB access -- kept testable in isolation.
final class BiaImport
{
    private const UNIT_SUFFIXES = ['kg', 'cm', '%', 'kcal'];

    // Every row of the real export, in order -- also the source of truth
    // for the downloadable CSV template (see handleBiaTemplate()).
    public const TEMPLATE_ROWS = [
        ['Allgemeine Daten', '-', 'ID'],
        ['Allgemeine Daten', '-', 'Körpergrösse'],
        ['Allgemeine Daten', '-', 'Alter'],
        ['Allgemeine Daten', '-', 'Geschlecht'],
        ['Allgemeine Daten', '-', 'Datum / Testzeit'],
        ['Fitnessbewertung', '-', 'Punktzahl'],
        ['Fitnessbewertung', '-', 'Skala'],
        ['Körperzusammensetzungsanalyse', 'Gesamtkörperwasser (L)', 'Wert'],
        ['Körperzusammensetzungsanalyse', 'Gesamtkörperwasser (L)', 'Bereich'],
        ['Körperzusammensetzungsanalyse', 'Proteine (kg)', 'Wert'],
        ['Körperzusammensetzungsanalyse', 'Proteine (kg)', 'Bereich'],
        ['Körperzusammensetzungsanalyse', 'Mineralien (kg)', 'Wert'],
        ['Körperzusammensetzungsanalyse', 'Mineralien (kg)', 'Bereich'],
        ['Körperzusammensetzungsanalyse', 'Körper-fettmasse (kg)', 'Wert'],
        ['Körperzusammensetzungsanalyse', 'Körper-fettmasse (kg)', 'Bereich'],
        ['Körperzusammensetzungsanalyse', '-', 'Weiche fettfreie Körpermasse (kg)'],
        ['Körperzusammensetzungsanalyse', '-', 'Fettfreie Masse (kg)'],
        ['Körperzusammensetzungsanalyse', '-', 'Gewicht (kg)'],
        ['Muskel-Fett Analyse', '-', 'Gewicht'],
        ['Muskel-Fett Analyse', '-', 'Skelettmuskelmasse'],
        ['Muskel-Fett Analyse', '-', 'Körperfettmasse'],
        ['Adipositas-Analyse (Kennzahlen)', '-', 'BMI'],
        ['Adipositas-Analyse (Kennzahlen)', '-', 'Anteil an Körperfett (%)'],
        ['Adipositas-Analyse (Kennzahlen)', '-', 'Taille-Hüfte-Verhältnis'],
        ['Adipositas-Analyse (Kennzahlen)', '-', 'Adipositas-Rate (%)'],
        ['Segmentale Mageranalyse (kg / %)', 'Rechter Arm', 'kg'],
        ['Segmentale Mageranalyse (kg / %)', 'Rechter Arm', '%'],
        ['Segmentale Mageranalyse (kg / %)', 'Linker Arm', 'kg'],
        ['Segmentale Mageranalyse (kg / %)', 'Linker Arm', '%'],
        ['Segmentale Mageranalyse (kg / %)', 'Rumpf', 'kg'],
        ['Segmentale Mageranalyse (kg / %)', 'Rumpf', '%'],
        ['Segmentale Mageranalyse (kg / %)', 'Rechtes Bein', 'kg'],
        ['Segmentale Mageranalyse (kg / %)', 'Rechtes Bein', '%'],
        ['Segmentale Mageranalyse (kg / %)', 'Linkes Bein', 'kg'],
        ['Segmentale Mageranalyse (kg / %)', 'Linkes Bein', '%'],
        ['Gewichtsempfehlung', '-', 'Ziel Gewicht'],
        ['Gewichtsempfehlung', '-', 'Gewichtsempfehlung (Änderung)'],
        ['Gewichtsempfehlung', '-', 'Fett Kontrolle'],
        ['Gewichtsempfehlung', '-', 'Muskel Kontrolle'],
        ['Segmentanalyse (Muskel kg / %)', 'Rechter Arm', 'kg'],
        ['Segmentanalyse (Muskel kg / %)', 'Rechter Arm', '%'],
        ['Segmentanalyse (Muskel kg / %)', 'Linker Arm', 'kg'],
        ['Segmentanalyse (Muskel kg / %)', 'Linker Arm', '%'],
        ['Segmentanalyse (Muskel kg / %)', 'Rumpf', 'kg'],
        ['Segmentanalyse (Muskel kg / %)', 'Rumpf', '%'],
        ['Segmentanalyse (Muskel kg / %)', 'Rechtes Bein', 'kg'],
        ['Segmentanalyse (Muskel kg / %)', 'Rechtes Bein', '%'],
        ['Segmentanalyse (Muskel kg / %)', 'Linkes Bein', 'kg'],
        ['Segmentanalyse (Muskel kg / %)', 'Linkes Bein', '%'],
        ['Segmentanalyse (Fett kg / %)', 'Rechter Arm', 'kg'],
        ['Segmentanalyse (Fett kg / %)', 'Rechter Arm', '%'],
        ['Segmentanalyse (Fett kg / %)', 'Linker Arm', 'kg'],
        ['Segmentanalyse (Fett kg / %)', 'Linker Arm', '%'],
        ['Segmentanalyse (Fett kg / %)', 'Rumpf', 'kg'],
        ['Segmentanalyse (Fett kg / %)', 'Rumpf', '%'],
        ['Segmentanalyse (Fett kg / %)', 'Rechtes Bein', 'kg'],
        ['Segmentanalyse (Fett kg / %)', 'Rechtes Bein', '%'],
        ['Segmentanalyse (Fett kg / %)', 'Linkes Bein', 'kg'],
        ['Segmentanalyse (Fett kg / %)', 'Linkes Bein', '%'],
        ['Forschungsdaten', '-', 'Grundumsatz (kcal)'],
        ['Forschungsdaten', '-', 'Taille-Hüfte-Verhältnis'],
        ['Forschungsdaten', '-', 'Viszeraler Fettbereich'],
    ];

    public static function template(): string
    {
        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['Kategorie', 'Sub-Kategorie', 'Metrik', gmdate('Y-m-d')], ',', '"', '\\');
        foreach (self::TEMPLATE_ROWS as $row) {
            fputcsv($out, [$row[0], $row[1], $row[2], ''], ',', '"', '\\');
        }
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);
        return $csv;
    }

    public static function parse(string $csv): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        $rows = array_map(fn ($l) => str_getcsv($l, ',', '"', '\\'), array_filter($lines, fn ($l) => trim($l) !== ''));

        $header = array_shift($rows) ?? [];
        $dates = array_values(array_slice($header, 3));

        $measuredAt = [];
        $externalId = [];
        $entries = [];

        foreach ($rows as $row) {
            if (count($row) < 3) {
                continue;
            }
            $category = trim((string) $row[0]);
            $subcategoryRaw = trim((string) ($row[1] ?? ''));
            $subcategory = ($subcategoryRaw === '' || $subcategoryRaw === '-') ? null : $subcategoryRaw;
            $metric = trim((string) ($row[2] ?? ''));
            $values = array_slice($row, 3);

            foreach ($dates as $i => $date) {
                $raw = trim((string) ($values[$i] ?? ''));
                if ($raw === '') {
                    continue;
                }

                if ($category === 'Allgemeine Daten' && $metric === 'ID') {
                    $externalId[$date] = $raw;
                    continue;
                }
                if ($category === 'Allgemeine Daten' && $metric === 'Datum / Testzeit') {
                    $measuredAt[$date] = self::parseTestTime($raw) ?? ($date . 'T00:00:00Z');
                    continue;
                }

                $entries[] = [
                    'date' => $date,
                    'category' => $category,
                    'subcategory' => $subcategory,
                    'metric' => $metric,
                    'valueText' => $raw,
                    'valueNum' => self::parseNumeric($raw),
                ];
            }
        }

        foreach ($dates as $date) {
            if (!isset($measuredAt[$date])) {
                $measuredAt[$date] = $date . 'T00:00:00Z';
            }
            if (!isset($externalId[$date])) {
                $externalId[$date] = null;
            }
        }

        return ['dates' => $dates, 'measuredAt' => $measuredAt, 'externalId' => $externalId, 'entries' => $entries];
    }

    public static function parseNumeric(string $raw): ?float
    {
        $trimmed = trim($raw);
        if ($trimmed === '' || str_contains($trimmed, ' - ')) {
            return null;
        }
        $stripped = $trimmed;
        foreach (self::UNIT_SUFFIXES as $suffix) {
            if (str_ends_with($stripped, $suffix)) {
                $stripped = substr($stripped, 0, -strlen($suffix));
                break;
            }
        }
        $stripped = trim($stripped);
        return is_numeric($stripped) ? (float) $stripped : null;
    }

    private static function parseTestTime(string $raw): ?string
    {
        $dt = DateTimeImmutable::createFromFormat('m-d-Y H:i', $raw);
        if ($dt === false) {
            return null;
        }
        return $dt->format('Y-m-d\TH:i:00\Z');
    }
}
