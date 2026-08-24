import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { RANGE_WEEKS } from '@/lib/dashboardRanges'
import { BIA_KPI_METRICS, pickBiaKpi, type BiaKpiKey } from '@/lib/biaMetrics'
import type { AcwrResponse, BiaMeasurementDetail, ConsistencyResponse, MuscleVolumeResponse, TrainingLoadResponse } from '@/types'
import { MuscleBodyMap } from '@/components/MuscleBodyMap'
import { MuscleVolumeStatusList } from '@/components/MuscleVolumeStatusList'
import { ConsistencyCalendar } from '@/components/ConsistencyCalendar'
import { Button } from '@/components/ui/button'

const BIA_KPI_LABELS: Record<BiaKpiKey, { label: string; unit: string }> = {
  weight: { label: 'Weight', unit: 'kg' },
  skeletalMuscleMass: { label: 'Skeletal muscle', unit: 'kg' },
  bodyFatPercent: { label: 'Body fat', unit: '%' },
  visceralFat: { label: 'Visceral fat', unit: '' },
  fitnessScore: { label: 'Fitness score', unit: '/ 100' },
}

interface ReportData {
  acwr: AcwrResponse
  trainingLoad: TrainingLoadResponse
  muscleVolume: MuscleVolumeResponse
  consistency: ConsistencyResponse
  bia: BiaMeasurementDetail | null
}

// Dependency-free PDF export (CLAUDE.md §3/§12: no PHP PDF library) --
// window.print() and a print-optimized layout instead. Every browser's
// print dialog offers "Save as PDF". Sits outside AppShell (no BottomNav,
// no phone-frame chrome) like /track/:workoutId, but still behind
// RequireAuth -- same pattern, see App.tsx.
export function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const weeks = RANGE_WEEKS.All
    Promise.all([
      api.get<AcwrResponse>(`/dashboard/acwr?weeks=${weeks}`),
      api.get<TrainingLoadResponse>(`/dashboard/training-load?weeks=${weeks}`),
      api.get<MuscleVolumeResponse>(`/dashboard/muscle-volume?weeks=${weeks}`),
      api.get<ConsistencyResponse>(`/dashboard/consistency?days=${weeks * 7}`),
      api.get<{ measurement: BiaMeasurementDetail['measurement'] | null; values: BiaMeasurementDetail['values'] }>('/bia/latest'),
    ]).then(([acwr, trainingLoad, muscleVolume, consistency, bia]) => {
      setData({ acwr, trainingLoad, muscleVolume, consistency, bia: bia.measurement ? { measurement: bia.measurement, values: bia.values } : null })
    })
  }, [])

  return (
    <div className="mx-auto max-w-[680px] px-5 py-6 print:max-w-none print:p-0">
      <div className="mb-5 flex items-center gap-2 print:hidden">
        <Link to="/settings">
          <Button type="button" variant="outline" size="sm">
            ‹ Back
          </Button>
        </Link>
        <Button type="button" size="sm" onClick={() => window.print()} disabled={!data}>
          Print / Save as PDF
        </Button>
      </div>

      <h1 className="text-[20px] font-bold">Workout Tracker — Report</h1>
      <p className="mb-6 text-[12px] text-muted-foreground">
        Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ReportBody data={data} />
      )}
    </div>
  )
}

function ReportBody({ data }: { data: ReportData }) {
  const { acwr, trainingLoad, muscleVolume, consistency, bia } = data
  const lastVolume = trainingLoad.weekly_volume[trainingLoad.weekly_volume.length - 1]?.volume_kg ?? 0
  const lastSessions = trainingLoad.weekly_sessions[trainingLoad.weekly_sessions.length - 1]?.count ?? 0
  const acwrInRange = acwr.ratio >= 0.8 && acwr.ratio <= 1.3

  return (
    <div className="flex flex-col gap-6 break-inside-avoid">
      <section>
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Overview</h2>
        <ReportRow label="Volume this week" value={`${Math.round(lastVolume).toLocaleString()} kg`} />
        <ReportRow label="Sessions this week" value={String(lastSessions)} />
        <ReportRow label="ACWR (training load)" value={`${acwr.ratio.toFixed(2)} — ${acwrInRange ? 'in range' : 'outside 0.8–1.3'}`} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Muscle load this week</h2>
        <div className="flex flex-wrap items-start gap-4">
          <MuscleBodyMap regions={muscleVolume.regions} />
          <div className="min-w-[220px] flex-1">
            <MuscleVolumeStatusList regions={muscleVolume.regions} />
          </div>
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Consistency</h2>
        <ConsistencyCalendar dates={consistency.dates} weeks={18} />
      </section>

      {bia && (
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Body composition ({bia.measurement.measured_at.slice(0, 10)})
          </h2>
          {(Object.keys(BIA_KPI_METRICS) as BiaKpiKey[]).map((key) => {
            const value = pickBiaKpi(bia.values, key)
            if (value === null) return null
            const { label, unit } = BIA_KPI_LABELS[key]
            return <ReportRow key={key} label={label} value={`${value} ${unit}`.trim()} />
          })}
        </section>
      )}
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-[13px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
