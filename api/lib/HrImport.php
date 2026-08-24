<?php
declare(strict_types=1);

// Streams a (potentially 100+MB) Apple Health export.xml and extracts only
// HeartRate samples that fall inside an existing training-session window
// (CLAUDE.md §8: HR matched "über Set-Timestamps ↔ importierte
// HR-Zeitreihe"). XMLReader (not SimpleXML/DOMDocument) so the whole file
// is never loaded into memory.
final class HrImport
{
    // $sessionWindows: [['id'=>.., 'started_at'=>ISO, 'ended_at'=>ISO], ...],
    // MUST already be sorted by started_at ascending -- caller's
    // responsibility (SessionRepository::allTimeWindows() already orders
    // this way). Apple Health records are chronological in the export, so
    // a single forward-only sweep against the sorted windows is enough --
    // no need to compare every sample against every session.
    public static function matchFromAppleHealthXml(string $filePath, array $sessionWindows): array
    {
        if (!is_readable($filePath)) {
            throw new RuntimeException('Apple Health export file is not readable');
        }

        $windows = array_values(array_filter(array_map(function (array $w) {
            $start = strtotime((string) $w['started_at']);
            $end = strtotime((string) $w['ended_at']);
            if ($start === false || $end === false) {
                return null;
            }
            return ['id' => $w['id'], 'start' => $start, 'end' => $end];
        }, $sessionWindows)));

        $reader = new XMLReader();
        if (!$reader->open($filePath)) {
            throw new RuntimeException('Could not open Apple Health export file as XML');
        }

        $matched = [];
        $windowIndex = 0;
        $windowCount = count($windows);

        while ($windowCount > 0 && $reader->read()) {
            if ($reader->nodeType !== XMLReader::ELEMENT || $reader->name !== 'Record') {
                continue;
            }
            if ($reader->getAttribute('type') !== 'HKQuantityTypeIdentifierHeartRate') {
                continue;
            }
            $startDateRaw = $reader->getAttribute('startDate');
            $valueRaw = $reader->getAttribute('value');
            if ($startDateRaw === null || $valueRaw === null) {
                continue;
            }
            $ts = strtotime($startDateRaw);
            if ($ts === false) {
                continue;
            }

            while ($windowIndex < $windowCount && $ts > $windows[$windowIndex]['end']) {
                $windowIndex++;
            }
            if ($windowIndex >= $windowCount) {
                break;
            }
            if ($ts >= $windows[$windowIndex]['start'] && $ts <= $windows[$windowIndex]['end']) {
                $matched[] = [
                    'session_id' => $windows[$windowIndex]['id'],
                    'ts' => gmdate('Y-m-d\TH:i:s\Z', $ts),
                    'bpm' => (int) $valueRaw,
                ];
            }
        }

        $reader->close();
        return $matched;
    }
}
