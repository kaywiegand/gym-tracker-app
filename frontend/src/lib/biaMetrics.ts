import type { BiaValue } from '@/types'

// (category, subcategory, metric) -> KPI slot, matching the real InBody
// export's exact German column names (Stage-5 plan §2 / §7). subcategory
// null means the CSV row itself has "-" there.
export const BIA_KPI_METRICS = {
  weight: { category: 'Muskel-Fett Analyse', subcategory: null, metric: 'Gewicht' },
  skeletalMuscleMass: { category: 'Muskel-Fett Analyse', subcategory: null, metric: 'Skelettmuskelmasse' },
  fatMass: { category: 'Muskel-Fett Analyse', subcategory: null, metric: 'Körperfettmasse' },
  bodyFatPercent: { category: 'Adipositas-Analyse (Kennzahlen)', subcategory: null, metric: 'Anteil an Körperfett (%)' },
  visceralFat: { category: 'Forschungsdaten', subcategory: null, metric: 'Viszeraler Fettbereich' },
  fitnessScore: { category: 'Fitnessbewertung', subcategory: null, metric: 'Punktzahl' },
  bmi: { category: 'Adipositas-Analyse (Kennzahlen)', subcategory: null, metric: 'BMI' },
  waistHip: { category: 'Adipositas-Analyse (Kennzahlen)', subcategory: null, metric: 'Taille-Hüfte-Verhältnis' },
  obesityRate: { category: 'Adipositas-Analyse (Kennzahlen)', subcategory: null, metric: 'Adipositas-Rate (%)' },
  leanMass: { category: 'Körperzusammensetzungsanalyse', subcategory: null, metric: 'Fettfreie Masse (kg)' },
  softLeanMass: { category: 'Körperzusammensetzungsanalyse', subcategory: null, metric: 'Weiche fettfreie Körpermasse (kg)' },
  bmr: { category: 'Forschungsdaten', subcategory: null, metric: 'Grundumsatz (kcal)' },
  targetWeight: { category: 'Gewichtsempfehlung', subcategory: null, metric: 'Ziel Gewicht' },
  fatControl: { category: 'Gewichtsempfehlung', subcategory: null, metric: 'Fett Kontrolle' },
  muscleControl: { category: 'Gewichtsempfehlung', subcategory: null, metric: 'Muskel Kontrolle' },
} as const

export type BiaKpiKey = keyof typeof BIA_KPI_METRICS

// Metrics the scan reports together with a normal band ("37.0 - 45.2"),
// stored as a sibling row whose metric is "Bereich". Those are the ones
// worth drawing as a value-against-band bar rather than a bare number.
export const BIA_BANDED_METRICS = [
  { subcategory: 'Gesamtkörperwasser (L)', label: 'Body water', unit: 'L' },
  { subcategory: 'Proteine (kg)', label: 'Protein', unit: 'kg' },
  { subcategory: 'Mineralien (kg)', label: 'Minerals', unit: 'kg' },
  { subcategory: 'Körper-fettmasse (kg)', label: 'Fat mass', unit: 'kg' },
] as const

// BIA reports muscle and fat per body segment. Keys are the exact German
// subcategory strings; `side` is the person's own side, matching BodyPath.side.
export const BIA_SEGMENTS = [
  { subcategory: 'Rechter Arm', label: 'Right arm', region: 'arms', side: 'right' },
  { subcategory: 'Linker Arm', label: 'Left arm', region: 'arms', side: 'left' },
  { subcategory: 'Rumpf', label: 'Trunk', region: 'trunk', side: null },
  { subcategory: 'Rechtes Bein', label: 'Right leg', region: 'legs', side: 'right' },
  { subcategory: 'Linkes Bein', label: 'Left leg', region: 'legs', side: 'left' },
] as const

export type BiaSegment = (typeof BIA_SEGMENTS)[number]
export type SegmentKind = 'muscle' | 'fat'

const SEGMENT_CATEGORY: Record<SegmentKind, string> = {
  muscle: 'Segmentanalyse (Muskel kg / %)',
  fat: 'Segmentanalyse (Fett kg / %)',
}

function find(values: BiaValue[], category: string, subcategory: string | null, metric: string) {
  return values.find((v) => v.category === category && v.subcategory === subcategory && v.metric === metric)
}

export function pickBiaKpi(values: BiaValue[], key: BiaKpiKey): number | null {
  const spec = BIA_KPI_METRICS[key]
  return find(values, spec.category, spec.subcategory, spec.metric)?.value_num ?? null
}

export interface BandedReading {
  value: number | null
  low: number | null
  high: number | null
}

// The importer stores the normal band as text on its own row ("37.0 - 45.2")
// and leaves bia_values.ref_low/ref_high null, so the band is paired up here
// rather than in SQL. Doing it this way also means an already-imported scan
// needs no re-import to gain its bands.
export function pickBanded(values: BiaValue[], subcategory: string): BandedReading {
  const value = find(values, 'Körperzusammensetzungsanalyse', subcategory, 'Wert')?.value_num ?? null
  const rangeRow = find(values, 'Körperzusammensetzungsanalyse', subcategory, 'Bereich')
  const raw = rangeRow?.value_text ?? ''
  const match = raw.match(/^\s*(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)\s*$/)
  return {
    value,
    low: match ? parseFloat(match[1]) : null,
    high: match ? parseFloat(match[2]) : null,
  }
}

// Segment reading: kg plus the % of normal the device reports alongside it.
export function pickSegment(values: BiaValue[], kind: SegmentKind, subcategory: string) {
  const category = SEGMENT_CATEGORY[kind]
  return {
    kg: find(values, category, subcategory, 'kg')?.value_num ?? null,
    percent: find(values, category, subcategory, '%')?.value_num ?? null,
  }
}
