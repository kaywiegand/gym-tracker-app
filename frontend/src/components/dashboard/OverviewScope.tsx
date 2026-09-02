import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AcwrResponse, ConsistencyResponse, MuscleVolumeResponse, TrainingLoadResponse } from '@/types'
import { DEFAULT_RANGE, RANGE_OPTIONS, RANGE_WEEKS, type DashboardRange } from '@/lib/dashboardRanges'
import { FilterChips } from '@/components/FilterChips'
import { SegmentedControl } from '@/components/SegmentedControl'
import { KpiTile } from '@/components/KpiTile'
import { MuscleBodyMap } from '@/components/MuscleBodyMap'
import { MuscleVolumeStatusList } from '@/components/MuscleVolumeStatusList'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { ConsistencyCalendar, type CalendarLayout } from '@/components/ConsistencyCalendar'
import { InfoButton } from '@/components/InfoButton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RadarMetric = 'sets' | 'volume_kg' | 'best_e1rm'
const RADAR_METRIC_LABELS: Record<RadarMetric, string> = { sets: 'Sets', volume_kg: 'Volume', best_e1rm: 'e1RM' }

// No 4th "e1RM Bench"-style KPI here (unlike the prototype) -- which single
// exercise would represent "the" lift isn't well-defined for a real user
// with many exercises. e1RM lives in the Exercise scope instead, where one
// is explicitly picked.
export function OverviewScope() {
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE)
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('sets')
  const [calendarLayout, setCalendarLayout] = useState<CalendarLayout>('timeline')
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

  // Average across the selected range, not the last week in it. The headline
  // used to be "last week", which is always the current one -- so after
  // importing a year of history the tiles read 0 kg / 0 sessions while the
  // sparkline underneath showed a full year of training.
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const volumeSeries = trainingLoad.weekly_volume.map((w) => w.volume_kg)
  const sessionSeries = trainingLoad.weekly_sessions.map((w) => w.count)
  const avgVolume = mean(volumeSeries)
  const avgSessions = mean(sessionSeries)
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
      <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />

      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="Volume/wk"
          value={Math.round(avgVolume).toLocaleString()}
          unit="kg"
          trend={`avg over ${range}`}
          sparkline={volumeSeries}
          color="var(--brand-accent)"
          infoTerm="Volume"
        />
        <KpiTile
          label="Sessions/wk"
          value={avgSessions.toFixed(1)}
          trend={`avg over ${range}`}
          sparkline={sessionSeries}
          color="var(--brand-accent)"
        />
        <KpiTile
          label="ACWR"
          value={acwr.ratio.toFixed(2)}
          trend={acwrInRange ? 'In range' : 'Outside 0.8–1.3'}
          trendClassName={acwrTone}
          sparkline={acwr.weekly_series.map((w) => w.ratio)}
          color="var(--brand-accent)"
          infoTerm="ACWR"
        />
      </div>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Consistency</span>
          <SegmentedControl<CalendarLayout>
            className="w-[150px]"
            value={calendarLayout}
            onChange={setCalendarLayout}
            options={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'weekly', label: 'By week' },
            ]}
          />
        </div>
        <p className="mb-2 text-[10.5px] text-muted-foreground">
          {consistency.dates.length} training days · one square = one day
          {calendarLayout === 'weekly' ? ' · one row = one week' : ' · one column = one week'}
        </p>
        <ConsistencyCalendar dates={consistency.dates} weeks={RANGE_WEEKS[range]} layout={calendarLayout} />
      </Card>

      {/* Everything above follows the range switch. The three cards below
          always describe the current week -- they were interleaved with the
          range-driven ones, so half the screen looked unresponsive. */}
      <div className="mt-2 flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">This week</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Muscle load this week
          <InfoButton term="MEV" />
        </div>
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

    </div>
  )
}
