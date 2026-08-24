import type { BiaValue } from '@/types'

// (category, subcategory, metric) -> KPI slot, matching the real InBody
// export's exact German column names (Stage-5 plan §2 / §7). subcategory
// null means the CSV row itself has "-" there.
export const BIA_KPI_METRICS = {
  weight: { category: 'Muskel-Fett Analyse', subcategory: null, metric: 'Gewicht' },
  skeletalMuscleMass: { category: 'Muskel-Fett Analyse', subcategory: null, metric: 'Skelettmuskelmasse' },
  bodyFatPercent: { category: 'Adipositas-Analyse (Kennzahlen)', subcategory: null, metric: 'Anteil an Körperfett (%)' },
  visceralFat: { category: 'Forschungsdaten', subcategory: null, metric: 'Viszeraler Fettbereich' },
  fitnessScore: { category: 'Fitnessbewertung', subcategory: null, metric: 'Punktzahl' },
} as const

export type BiaKpiKey = keyof typeof BIA_KPI_METRICS

export function pickBiaKpi(values: BiaValue[], key: BiaKpiKey): number | null {
  const spec = BIA_KPI_METRICS[key]
  const match = values.find((v) => v.category === spec.category && v.subcategory === spec.subcategory && v.metric === spec.metric)
  return match?.value_num ?? null
}
