import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AcwrResponse, ConsistencyResponse, MuscleVolumeResponse, TopExercise, TrainingLoadResponse } from '@/types'
import { DEFAULT_RANGE, RANGE_OPTIONS, RANGE_WEEKS, type DashboardRange } from '@/lib/dashboardRanges'
import { FilterChips } from '@/components/FilterChips'
import { KpiTile } from '@/components/KpiTile'
import { SectionDivider } from '@/components/SectionDivider'
import { MuscleBodyMap } from '@/components/MuscleBodyMap'
import { MuscleVolumeStatusList } from '@/components/MuscleVolumeStatusList'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { ConsistencyCalendar } from '@/components/ConsistencyCalendar'
import { TopExercisesList } from '@/components/TopExercisesList'
import { InfoButton } from '@/components/InfoButton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RadarMetric = 'sets' | 'volume_kg' | 'best_e1rm'
// Button order is the order of interest: strength first, then load, then
// the raw count -- the same order as everywhere else in the app.
const RADAR_METRIC_LABELS: Record<RadarMetric, string> = { best_e1rm: 'e1RM', volume_kg: 'Volume', sets: 'Sets' }

// No 4th "e1RM Bench"-style KPI here (unlike the prototype) -- which single
// exercise would represent "the" lift isn't well-defined for a real user
// with many exercises. e1RM lives in the Exercise scope instead, where one
// is explicitly picked.
export function OverviewScope() {
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE)
  // e1RM first: sets say how much was done, e1RM says how strong it made
  // you -- that is the question the week-over-week comparison is asked.
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('best_e1rm')
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoadResponse | null>(null)
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeResponse | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyResponse | null>(null)
  const [topExercises, setTopExercises] = useState<TopExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const weeks = RANGE_WEEKS[range]
    setLoading(true)
    Promise.all([
      api.get<AcwrResponse>(`/dashboard/acwr?weeks=${weeks}`),
      api.get<TrainingLoadResponse>(`/dashboard/training-load?weeks=${weeks}`),
      api.get<MuscleVolumeResponse>(`/dashboard/muscle-volume?weeks=${weeks}`),
      api.get<ConsistencyResponse>(`/dashboard/consistency?days=${weeks * 7}`),
      api.get<TopExercise[]>(`/dashboard/top-exercises?weeks=${weeks}&limit=8`),
    ])
      .then(([acwrData, trainingLoadData, muscleVolumeData, consistencyData, topExerciseData]) => {
        setAcwr(acwrData)
        setTrainingLoad(trainingLoadData)
        setMuscleVolume(muscleVolumeData)
        setConsistency(consistencyData)
        setTopExercises(topExerciseData)
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

  // Min/max over completed, trained weeks only. Drop the last entry --
  // weekly_volume / weekly_sessions end at the current, still-running week
  // (MuscleVolume::weeksFromDaily() ends its range at isoWeekStart(now)),
  // which is partial and would read as the minimum almost every day of the
  // week. Also drop weeks with zero sessions: a week off already shows in
  // the sparkline, but "min 0" would read the same whether the range has
  // one deload week or a dozen -- it says nothing. Both tiles are filtered
  // by the same mask (sessions > 0) so they describe the same set of weeks.
  const completedSessionCounts = sessionSeries.slice(0, -1)
  const trainedWeekMask = completedSessionCounts.map((count) => count > 0)
  const trainedVolumeWeeks = volumeSeries.slice(0, -1).filter((_, i) => trainedWeekMask[i])
  const trainedSessionWeeks = completedSessionCounts.filter((count) => count > 0)
  const volumeMinMax =
    trainedVolumeWeeks.length >= 2
      ? `min ${Math.round(Math.min(...trainedVolumeWeeks)).toLocaleString()} · max ${Math.round(Math.max(...trainedVolumeWeeks)).toLocaleString()} kg`
      : undefined
  const sessionsMinMax =
    trainedSessionWeeks.length >= 2
      ? `min ${Math.min(...trainedSessionWeeks)} · max ${Math.max(...trainedSessionWeeks)}`
      : undefined

  // Rolling last 7 days, not the calendar week -- on a Monday "this week"
  // is nearly empty, so a calendar-aligned comparison said nothing
  // (BACKLOG #31). this_week/last_week still exist on the response for an
  // installed PWA running the previous bundle, but this screen reads the
  // rolling windows.
  const radarSeries: MuscleRadarSeries[] = [
    {
      label: 'Last 7 days',
      color: 'var(--brand-accent)',
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, r.last_7_days[radarMetric]])),
    },
    {
      label: 'Previous 7 days',
      color: 'var(--muted-foreground)',
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, r.prev_7_days[radarMetric]])),
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
          trend={volumeMinMax}
          sparkline={volumeSeries}
          color="var(--brand-accent)"
          infoTerm="Volume"
        />
        <KpiTile
          label="Sessions/wk"
          value={avgSessions.toFixed(1)}
          trend={sessionsMinMax}
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
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Consistency</div>
        <p className="mb-2 text-[10.5px] text-muted-foreground">{consistency.dates.length} training days</p>
        <ConsistencyCalendar dates={consistency.dates} weeks={RANGE_WEEKS[range]} />
      </Card>

      <TopExercisesList exercises={topExercises} range={range} />

      {/* Everything above follows the range switch. The three cards below
          always describe the rolling last 7 days -- they were interleaved with
          the range-driven ones, so half the screen looked unresponsive. */}
      <SectionDivider>Last 7 days</SectionDivider>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Muscle load · last 7 days
          <InfoButton term="MEV" />
        </div>
        <MuscleBodyMap regions={muscleVolume.regions} />
      </Card>

      <MuscleVolumeStatusList regions={muscleVolume.regions} />

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Last 7 days vs. previous 7</div>
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
