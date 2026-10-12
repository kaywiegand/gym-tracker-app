import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AcwrResponse, MuscleVolumeResponse, SessionVolumesResponse, TopExercise } from '@/types'
import {
  COMPARE_COLORS,
  compareTitle,
  DEFAULT_RANGE,
  inWindow,
  RANGE_OPTIONS,
  rangeTitle,
  resolveRange,
  TZ_PARAM,
  weeklyCounts,
  type DashboardRange,
  type ResolvedRange,
} from '@/lib/dashboardRanges'
import { formatNumber } from '@/lib/format'
import { FilterChips } from '@/components/FilterChips'
import { DashboardStickyBar } from '@/components/dashboard/DashboardStickyBar'
import { KpiTile } from '@/components/KpiTile'
import { AcwrCard } from '@/components/AcwrCard'
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
  // you -- that is the question the comparison is asked.
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('best_e1rm')
  const [resolved, setResolved] = useState<ResolvedRange | null>(null)
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeResponse | null>(null)
  const [sessionVolumes, setSessionVolumes] = useState<SessionVolumesResponse['sessions']>([])
  const [topExercises, setTopExercises] = useState<TopExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    resolveRange(range)
      .then((r) =>
        Promise.all([
          api.get<AcwrResponse>(`/dashboard/acwr?weeks=${r.weeks}&days=${r.days}`),
          api.get<MuscleVolumeResponse>(`/dashboard/muscle-volume?weeks=${r.weeks}&days=${r.days}&${TZ_PARAM}`),
          api.get<SessionVolumesResponse>(`/dashboard/session-volumes?days=${r.days}&${TZ_PARAM}`),
          api.get<TopExercise[]>(`/dashboard/top-exercises?weeks=${r.weeks}&limit=8`),
        ]).then((res) => [r, ...res] as const),
      )
      .then(([r, acwrData, muscleVolumeData, sessionVolumeData, topExerciseData]) => {
        setResolved(r)
        setAcwr(acwrData)
        setMuscleVolume(muscleVolumeData)
        setSessionVolumes(sessionVolumeData.sessions)
        setTopExercises(topExerciseData)
      })
      .finally(() => setLoading(false))
  }, [range])

  if (loading || !resolved || !acwr || !muscleVolume) {
    return (
      <div className="flex flex-col gap-3">
        <DashboardStickyBar>
          <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
        </DashboardStickyBar>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const { weeks, current, previous } = resolved
  const currentDates = resolved.dates.filter((d) => inWindow(d, current))
  const previousDates = previous ? resolved.dates.filter((d) => inWindow(d, previous)) : []

  // Volume per session: one point per finished session in the window,
  // average as the headline, total as the sub-line (BACKLOG #82/#83).
  const sessionPoints = sessionVolumes.filter((s) => inWindow(s.date, current)).map((s) => s.volume_kg)
  const totalVolume = sessionPoints.reduce((a, b) => a + b, 0)
  const avgVolume = sessionPoints.length ? totalVolume / sessionPoints.length : 0
  const volumeMinMax =
    sessionPoints.length >= 2
      ? { min: formatNumber(Math.min(...sessionPoints)), max: formatNumber(Math.max(...sessionPoints)) }
      : undefined

  // 7D/14D: just the count -- 1-2 weekly points are no trend. From 1M on:
  // average per week, with the weekly counts as the line. Min/max over all
  // weeks of the window, a week off included.
  const showWeeklySessions = weeks > 2
  const weeklySessions = weeklyCounts(resolved.dates, current)
  const sessionsMinMax =
    showWeeklySessions && weeklySessions.length >= 2
      ? { min: formatNumber(Math.min(...weeklySessions)), max: formatNumber(Math.max(...weeklySessions)) }
      : undefined

  // Windows: the API's window_current/window_previous follow the selected
  // range (local days, same grid as the calendar). last_7_days stays as
  // the fallback for an older API.
  const radarValue = (r: MuscleVolumeResponse['regions'][number], key: 'window_current' | 'window_previous') =>
    (r[key] ?? (key === 'window_current' ? r.last_7_days : r.prev_7_days))[radarMetric]
  const radarSeries: MuscleRadarSeries[] = [
    {
      label: 'Current',
      color: COMPARE_COLORS.current,
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, radarValue(r, 'window_current')])),
    },
  ]
  if (previous) {
    radarSeries.push({
      label: 'Previous',
      color: COMPARE_COLORS.previous,
      values: Object.fromEntries(muscleVolume.regions.map((r) => [r.region, radarValue(r, 'window_previous')])),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <DashboardStickyBar>
        <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
      </DashboardStickyBar>

      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          label="Volume/session"
          value={formatNumber(avgVolume)}
          unit="kg"
          trend={`Total: ${formatNumber(totalVolume)} kg`}
          minMax={volumeMinMax}
          chart={sessionPoints.length >= 2 ? sessionPoints : undefined}
          color={COMPARE_COLORS.current}
          infoTerm="Volume"
        />
        {showWeeklySessions ? (
          <KpiTile
            label="Sessions/wk"
            value={(currentDates.length / weeks).toFixed(1)}
            trend={`Total: ${currentDates.length}`}
            minMax={sessionsMinMax}
            chart={weeklySessions}
            color={COMPARE_COLORS.current}
          />
        ) : (
          <KpiTile label="Sessions" value={String(currentDates.length)} color={COMPARE_COLORS.current} />
        )}
      </div>

      <AcwrCard series={acwr.daily_series ?? []} ratio={acwr.ratio} />

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Consistency</div>
        <p className="mb-2 text-[10.5px] text-muted-foreground">
          {currentDates.length} training days{previous ? ` · previous ${previousDates.length}` : ''}
        </p>
        <ConsistencyCalendar dates={resolved.dates} weeks={weeks} compare={previous !== null} />
      </Card>

      <TopExercisesList exercises={topExercises} range={range} />

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {previous ? compareTitle(range) : rangeTitle(range)}
        </div>
        <div className="mb-1 flex gap-1.5">
          {(Object.keys(RADAR_METRIC_LABELS) as RadarMetric[]).map((m) => (
            <Button key={m} type="button" size="sm" variant={radarMetric === m ? 'default' : 'outline'} onClick={() => setRadarMetric(m)}>
              {RADAR_METRIC_LABELS[m]}
            </Button>
          ))}
        </div>
        <MuscleRadar series={radarSeries} />
      </Card>

      {/* Everything above follows the range switch. The two cards below
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

    </div>
  )
}
