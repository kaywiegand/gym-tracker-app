import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AcwrResponse, ConsistencyResponse, MuscleVolumeResponse, TrainingLoadResponse } from '@/types'
import { FilterChips } from '@/components/FilterChips'
import { KpiTile } from '@/components/KpiTile'
import { MuscleBodyMap } from '@/components/MuscleBodyMap'
import { MuscleVolumeStatusList } from '@/components/MuscleVolumeStatusList'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { ConsistencyCalendar } from '@/components/ConsistencyCalendar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const RANGE_WEEKS: Record<string, number> = { '3M': 13, '6M': 26, '9M': 39, '12M': 52, All: 104 }
const RANGE_OPTIONS = Object.keys(RANGE_WEEKS)

type RadarMetric = 'sets' | 'volume_kg' | 'best_e1rm'
const RADAR_METRIC_LABELS: Record<RadarMetric, string> = { sets: 'Sets', volume_kg: 'Volume', best_e1rm: 'e1RM' }

// No 4th "e1RM Bench"-style KPI here (unlike the prototype) -- which single
// exercise would represent "the" lift isn't well-defined for a real user
// with many exercises. e1RM lives in the Exercise scope instead, where one
// is explicitly picked.
export function OverviewScope() {
  const [range, setRange] = useState('3M')
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('sets')
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoadResponse | null>(null)
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeResponse | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const weeks = RANGE_WEEKS[range]
    setLoading(true)
    Promise.all([
      api.get<AcwrResponse>(`/dashboard/acwr?weeks=${weeks}`),
      api.get<TrainingLoadResponse>(`/dashboard/training-load?weeks=${weeks}`),
      api.get<MuscleVolumeResponse>(`/dashboard/muscle-volume?weeks=${weeks}`),
      api.get<ConsistencyResponse>(`/dashboard/consistency?days=${weeks * 7}`),
    ])
      .then(([acwrData, trainingLoadData, muscleVolumeData, consistencyData]) => {
        setAcwr(acwrData)
        setTrainingLoad(trainingLoadData)
        setMuscleVolume(muscleVolumeData)
        setConsistency(consistencyData)
      })
      .finally(() => setLoading(false))
  }, [range])

  if (loading || !acwr || !trainingLoad || !muscleVolume || !consistency) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const lastVolume = trainingLoad.weekly_volume[trainingLoad.weekly_volume.length - 1]?.volume_kg ?? 0
  const lastSessions = trainingLoad.weekly_sessions[trainingLoad.weekly_sessions.length - 1]?.count ?? 0
  const acwrInRange = acwr.ratio >= 0.8 && acwr.ratio <= 1.3
  const acwrTone = acwrInRange ? 'text-status-good' : 'text-status-warn'

  const radarSeries: MuscleRadarSeries[] = [
    {
      label: 'This week',
      color: 'var(--brand-accent)',
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, r.this_week[radarMetric]])),
    },
    {
      label: 'Last week',
      color: 'var(--muted-foreground)',
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, r.last_week[radarMetric]])),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <FilterChips options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="Volume/wk"
          value={Math.round(lastVolume).toLocaleString()}
          unit="kg"
          sparkline={trainingLoad.weekly_volume.map((w) => w.volume_kg)}
          color="var(--brand-accent)"
        />
        <KpiTile
          label="Sessions/wk"
          value={String(lastSessions)}
          sparkline={trainingLoad.weekly_sessions.map((w) => w.count)}
          color="var(--brand-accent)"
        />
        <KpiTile
          label="ACWR"
          value={acwr.ratio.toFixed(2)}
          trend={acwrInRange ? 'In range' : 'Outside 0.8–1.3'}
          trendClassName={acwrTone}
          sparkline={acwr.weekly_series.map((w) => w.ratio)}
          color="var(--brand-accent)"
        />
      </div>

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Muscle load this week</div>
        <MuscleBodyMap regions={muscleVolume.regions} />
      </Card>

      <MuscleVolumeStatusList regions={muscleVolume.regions} />

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">This week vs. last week</div>
        <div className="mb-1 flex gap-1.5">
          {(Object.keys(RADAR_METRIC_LABELS) as RadarMetric[]).map((m) => (
            <Button key={m} type="button" size="sm" variant={radarMetric === m ? 'default' : 'outline'} onClick={() => setRadarMetric(m)}>
              {RADAR_METRIC_LABELS[m]}
            </Button>
          ))}
        </div>
        <MuscleRadar series={radarSeries} />
      </Card>

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Consistency</div>
        <ConsistencyCalendar dates={consistency.dates} weeks={Math.min(18, RANGE_WEEKS[range])} />
      </Card>
    </div>
  )
}
