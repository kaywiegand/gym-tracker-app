import { useEffect, useState } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { api } from '@/lib/api'
import { DEFAULT_RANGE, RANGE_OPTIONS, RANGE_WEEKS, type DashboardRange } from '@/lib/dashboardRanges'
import type { RegionMetrics, WorkoutListItem, WorkoutMuscleSplitResponse } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { KpiTile } from '@/components/KpiTile'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RadarMetric = keyof RegionMetrics
const RADAR_METRIC_LABELS: Record<RadarMetric, string> = { sets: 'Sets', volume_kg: 'Volume', best_e1rm: 'e1RM' }

export function WorkoutScope() {
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('best_e1rm')
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE)
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [selected, setSelected] = useState<WorkoutListItem | null>(null)
  const [split, setSplit] = useState<WorkoutMuscleSplitResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<WorkoutListItem[]>('/workouts').then(setWorkouts)
  }, [])

  useEffect(() => {
    if (!selected) return
    const weeks = RANGE_WEEKS[range]
    setLoading(true)
    api
      .get<WorkoutMuscleSplitResponse>(`/workouts/${selected.id}/muscle-split?limit=20&weeks=${weeks}`)
      .then(setSplit)
      .finally(() => setLoading(false))
  }, [selected, range])

  const rangeSwitch = (
    <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
  )

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
        {rangeSwitch}
        {workouts.map((w) => (
          <Card key={w.id} className="cursor-pointer px-3 py-2.5" onClick={() => setSelected(w)}>
            <div className="text-[14px] font-semibold">{w.name}</div>
            <div className="text-[11.5px] text-muted-foreground">{w.exercise_count} exercises</div>
          </Card>
        ))}
      </div>
    )
  }

  const sessions = split?.sessions ?? []
  const sessionCount = sessions.length
  const durations = sessions
    .filter((s) => s.ended_at)
    .map((s) => (new Date(s.ended_at as string).getTime() - new Date(s.started_at).getTime()) / 60000)
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  const regionKeys = Object.keys(REGION_LABELS)
  const barData = sessions.map((s, i) => {
    const row: Record<string, string | number> = { session: `S${i + 1}` }
    regionKeys.forEach((r) => {
      row[r] = Math.round((s.by_region[r] ?? 0) * 10) / 10
    })
    return row
  })

  // Sets and volume average across the sessions -- that is what a typical
  // run of this workout puts on each region. e1RM is a personal best, and the
  // average of several bests is not one, so it takes the top value instead.
  const radarValues: Record<string, number> = {}
  regionKeys.forEach((r) => {
    const values = sessions.map((s) => s.metrics_by_region?.[r]?.[radarMetric] ?? 0)
    radarValues[r] =
      radarMetric === 'best_e1rm'
        ? Math.max(0, ...values)
        : values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
  })
  const radarSeries: MuscleRadarSeries[] = [{ label: selected.name, color: 'var(--brand-accent)', values: radarValues }]

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-left"
        onClick={() => setSelected(null)}
      >
        <span className="text-[14px] font-bold">{selected.name}</span>
        <span className="text-[12px] text-muted-foreground">change ›</span>
      </button>

      {rangeSwitch}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sessionCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions for this workout in the last {range === 'All' ? '5 years' : range}
          {range !== 'All' && ' — try a longer range.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <KpiTile label="Sessions" value={String(sessionCount)} sparkline={sessions.map((_, i) => i + 1)} color="var(--brand-accent)" />
            <KpiTile
              label="Avg duration"
              value={avgDuration !== null ? String(avgDuration) : '—'}
              unit={avgDuration !== null ? 'min' : undefined}
              sparkline={durations.length ? durations : [0]}
              color="var(--brand-accent)"
            />
          </div>

          <Card className="p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Muscle split per session (sets)</div>
            <div className="h-[180px] w-full">
              <ResponsiveBar
                data={barData}
                keys={regionKeys}
                indexBy="session"
                margin={{ top: 8, right: 8, bottom: 24, left: 32 }}
                colors={(bar) => `var(--muscle-${bar.id})`}
                borderRadius={2}
                enableLabel={false}
                axisLeft={{ tickSize: 0 }}
                theme={{
                  axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
                  grid: { line: { stroke: 'var(--border)' } },
                }}
              />
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              This workout's signature
              <InfoButton term="Signature" />
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
        </>
      )}
    </div>
  )
}
