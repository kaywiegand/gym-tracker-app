import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { RANGE_OPTIONS, type DashboardRange } from '@/lib/dashboardRanges'
import { BIA_KPI_METRICS, pickBiaKpi } from '@/lib/biaMetrics'
import type { BiaMeasurement, BiaMeasurementDetail } from '@/types'
import { FilterChips } from '@/components/FilterChips'
import { KpiTile } from '@/components/KpiTile'
import { BiaMeasurementDetailSheet } from '@/components/BiaMeasurementDetailSheet'
import { Card } from '@/components/ui/card'

// The date range switch doesn't filter anything here yet -- BIA scans are
// sparse (a handful a year, not weekly like training data), so slicing by
// 3M/6M/12M would usually just hide most of the little history there is.
// Kept for UI consistency with the other three scopes per the Stage-4
// unification request; wiring it up is a Backlog item if scan frequency
// ever grows enough to matter.
export function BodyScope() {
  const [range, setRange] = useState<DashboardRange>('3M')
  const [measurements, setMeasurements] = useState<BiaMeasurement[]>([])
  const [details, setDetails] = useState<Record<string, BiaMeasurementDetail>>({})
  const [loading, setLoading] = useState(true)
  const [openMeasurementId, setOpenMeasurementId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<BiaMeasurement[]>('/bia/measurements?limit=20')
      .then(async (rows) => {
        setMeasurements(rows)
        const entries = await Promise.all(
          rows.map(async (row) => [row.id, await api.get<BiaMeasurementDetail>(`/bia/measurements/${row.id}`)] as const)
        )
        setDetails(Object.fromEntries(entries))
      })
      .finally(() => setLoading(false))
  }, [])

  const rangeSwitch = (
    <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {rangeSwitch}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {rangeSwitch}
        <Card className="p-4 text-center">
          <div className="text-[14px] font-bold">Body composition</div>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            No BIA scans imported yet — import one under Settings → Body composition.
          </p>
        </Card>
      </div>
    )
  }

  // Oldest first so sparklines read left-to-right, matching the other scopes.
  const chronological = [...measurements].reverse()
  const latest = chronological[chronological.length - 1]
  const latestValues = details[latest.id]?.values ?? []

  const series = (key: keyof typeof BIA_KPI_METRICS) =>
    chronological.map((m) => pickBiaKpi(details[m.id]?.values ?? [], key) ?? 0)

  const weight = pickBiaKpi(latestValues, 'weight')
  const skeletalMuscleMass = pickBiaKpi(latestValues, 'skeletalMuscleMass')
  const bodyFatPercent = pickBiaKpi(latestValues, 'bodyFatPercent')
  const visceralFat = pickBiaKpi(latestValues, 'visceralFat')
  const fitnessScore = pickBiaKpi(latestValues, 'fitnessScore')

  return (
    <div className="flex flex-col gap-3">
      {rangeSwitch}

      <div className="grid grid-cols-2 gap-2">
        <KpiTile label="Weight" value={weight !== null ? weight.toFixed(1) : '—'} unit="kg" sparkline={series('weight')} color="var(--brand-accent)" />
        <KpiTile
          label="Skeletal muscle"
          value={skeletalMuscleMass !== null ? skeletalMuscleMass.toFixed(1) : '—'}
          unit="kg"
          sparkline={series('skeletalMuscleMass')}
          color="var(--muscle-legs)"
        />
        <KpiTile
          label="Body fat"
          value={bodyFatPercent !== null ? bodyFatPercent.toFixed(1) : '—'}
          unit="%"
          sparkline={series('bodyFatPercent')}
          color="var(--muscle-arms)"
        />
        <KpiTile
          label="Visceral fat"
          value={visceralFat !== null ? visceralFat.toFixed(0) : '—'}
          sparkline={series('visceralFat')}
          color="var(--status-warn)"
        />
      </div>

      <KpiTile
        label="Fitness score"
        value={fitnessScore !== null ? fitnessScore.toFixed(0) : '—'}
        unit="/ 100"
        sparkline={series('fitnessScore')}
        color="var(--metric-e1rm)"
      />

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Scan history</div>
        <div className="flex flex-col">
          {measurements.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenMeasurementId(m.id)}
              className="flex items-center justify-between border-b border-border py-2 text-left last:border-b-0"
            >
              <span className="text-[13px] font-semibold">{m.measured_at.slice(0, 10)}</span>
              <span className="text-[12px] text-muted-foreground">full report ›</span>
            </button>
          ))}
        </div>
      </Card>

      <BiaMeasurementDetailSheet measurementId={openMeasurementId} onOpenChange={(open) => !open && setOpenMeasurementId(null)} />
    </div>
  )
}
