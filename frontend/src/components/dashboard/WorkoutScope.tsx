import { useEffect, useState } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { api } from '@/lib/api'
import {
  COMPARE_COLORS,
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RANGE_WEEKS,
  compareTitle,
  resolveRange,
  type DashboardRange,
  type ResolvedRange,
} from '@/lib/dashboardRanges'
import { characterValues, perSessionMeanValues, sessionsInWindow, trendPoints } from '@/lib/workoutDevelopment'
import type { RegionMetrics, WorkoutGroup, WorkoutListItem, WorkoutMuscleSplitResponse } from '@/types'
import { groupWorkouts, useCollapsedWorkoutGroups } from '@/lib/workoutGrouping'
import { REGION_LABELS } from '@/lib/muscleColors'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { MetricTrendPanels } from '@/components/MetricTrendPanels'
import { SegmentedControl } from '@/components/SegmentedControl'
import { KpiTile } from '@/components/KpiTile'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { DashboardStickyBar } from '@/components/dashboard/DashboardStickyBar'
import { WorkoutGroupList } from '@/components/WorkoutGroupList'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RadarMetric = keyof RegionMetrics
// Button order is the order of interest: strength first, then load, then
// the raw count -- the same order as everywhere else in the app.
const RADAR_METRIC_LABELS: Record<RadarMetric, string> = { best_e1rm: 'e1RM', volume_kg: 'Volume', sets: 'Sets' }

// A session's duration is started_at -> its last logged set. ended_at is when
// the user pressed "Finish", which for a session left open and resumed days
// later is days after the training (BACKLOG #86). Anything longer than this
// is still no real session and is dropped as an outlier.
const MAX_PLAUSIBLE_SESSION_MIN = 240

type RadarView = 'character' | 'compare'

export function WorkoutScope() {
  const [radarView, setRadarView] = useState<RadarView>('character')
  const [resolved, setResolved] = useState<ResolvedRange | null>(null)
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('best_e1rm')
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE)
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [selected, setSelected] = useState<WorkoutListItem | null>(null)
  const [split, setSplit] = useState<WorkoutMuscleSplitResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<WorkoutGroup[]>([])
  const { collapsed, toggle } = useCollapsedWorkoutGroups()

  useEffect(() => {
    api.get<WorkoutListItem[]>('/workouts').then(setWorkouts)
    api.get<WorkoutGroup[]>('/workout-groups').then(setGroups)
  }, [])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true)
    // No `limit`: with `weeks` the API filters by date and lifts its row cap.
    // With a previous window, load twice the range (+1 week, because the API
    // cuts at "now minus N days" and the window starts at local midnight) and
    // split into current/previous client-side by local start day.
    resolveRange(range)
      .then((r) => {
        const weeks = r.previous ? Math.min(RANGE_WEEKS.All, r.weeks * 2 + 1) : r.weeks
        return api
          .get<WorkoutMuscleSplitResponse>(`/workouts/${selected.id}/muscle-split?weeks=${weeks}`)
          .then((data) => ({ r, data }))
      })
      .then(({ r, data }) => {
        if (cancelled) return
        setResolved(r)
        setSplit(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, range])

  const rangeSwitch = (
    <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
  )

  // First step is only the choice -- the range switch belongs to the
  // analysis of a chosen workout and confused the picker. Grouped exactly as
  // on the Workouts page (BACKLOG #51, shared WorkoutGroupList), empty
  // groups left out here: nothing to pick there.
  if (!selected) {
    const sections = groupWorkouts(workouts, groups).filter((s) => s.workouts.length > 0)
    const row = (w: WorkoutListItem) => (
      <Card
        key={w.id}
        className="cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5"
        onClick={() => setSelected(w)}
      >
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">{w.name}</div>
          <div className="text-[11.5px] text-muted-foreground">{w.exercise_count} exercises</div>
        </div>
        <span className="shrink-0 text-muted-foreground">›</span>
      </Card>
    )
    return (
      <WorkoutGroupList sections={sections} hasNamedGroups={groups.length > 0} collapsed={collapsed} onToggle={toggle} renderWorkout={row} />
    )
  }

  const allSessions = split?.sessions ?? []
  const sessions = resolved ? sessionsInWindow(allSessions, resolved.current) : allSessions
  const previousSessions = resolved ? sessionsInWindow(allSessions, resolved.previous) : []
  const sessionCount = sessions.length
  const durations = sessions
    .filter((s) => s.last_set_at)
    .map((s) => (new Date(s.last_set_at as string).getTime() - new Date(s.started_at).getTime()) / 60000)
    .filter((min) => min > 0 && min <= MAX_PLAUSIBLE_SESSION_MIN)
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  const regionKeys = Object.keys(REGION_LABELS)
  const barData = sessions.map((s, i) => {
    const row: Record<string, string | number> = { session: `S${i + 1}` }
    regionKeys.forEach((r) => {
      row[r] = Math.round((s.by_region[r] ?? 0) * 10) / 10
    })
    return row
  })

  // Compare needs a complete previous window (resolved.previous) that also
  // holds sessions of this workout; otherwise only the character view.
  const canCompare = resolved?.previous != null && previousSessions.length > 0
  const compareHint = resolved?.previous == null ? 'not enough history' : 'no sessions in the previous period'
  const view: RadarView = canCompare ? radarView : 'character'

  const radarSeries: MuscleRadarSeries[] =
    view === 'compare'
      ? [
          { label: 'Current', color: COMPARE_COLORS.current, values: perSessionMeanValues(sessions, regionKeys, radarMetric) },
          { label: 'Previous', color: COMPARE_COLORS.previous, values: perSessionMeanValues(previousSessions, regionKeys, radarMetric) },
        ]
      : [{ label: selected.name, color: COMPARE_COLORS.current, values: characterValues(sessions, regionKeys, radarMetric) }]

  return (
    <div className="flex flex-col gap-3">
      <DashboardStickyBar>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-left"
          onClick={() => setSelected(null)}
        >
          <span className="text-[14px] font-bold">{selected.name}</span>
          <span className="text-[12px] text-muted-foreground">change ›</span>
        </button>

        {rangeSwitch}
      </DashboardStickyBar>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sessionCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions in this period{range !== 'All' && ' — try a longer range.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <KpiTile label="Sessions" value={String(sessionCount)} color="var(--brand-accent)" />
            <KpiTile
              label="Avg duration"
              value={avgDuration !== null ? String(avgDuration) : '—'}
              unit={avgDuration !== null ? 'min' : undefined}
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
            {/* Region colours are fixed app-wide (CLAUDE.md §7) but meant
                nothing here without a key. Only the regions that occur in
                these sessions, in the fixed order -- a legend of six entries
                for a two-colour chart is noise. */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {regionKeys
                .filter((r) => sessions.some((s) => (s.by_region[r] ?? 0) > 0))
                .map((r) => (
                  <span key={r} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-2.5 rounded-sm" style={{ background: `var(--muscle-${r})` }} />
                    {REGION_LABELS[r]}
                  </span>
                ))}
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {view === 'compare' ? compareTitle(range) : "This workout's signature"}
              {view === 'character' && <InfoButton term="Signature" />}
            </div>
            {canCompare ? (
              <SegmentedControl
                className="mb-2"
                options={[
                  { value: 'character', label: 'Character' },
                  { value: 'compare', label: 'vs. previous' },
                ]}
                value={view}
                onChange={setRadarView}
              />
            ) : (
              <p className="mb-2 text-[10.5px] text-muted-foreground">vs. previous: {compareHint}</p>
            )}
            <div className="mb-1 flex gap-1.5">
              {(Object.keys(RADAR_METRIC_LABELS) as RadarMetric[]).map((m) => (
                <Button key={m} type="button" size="sm" variant={radarMetric === m ? 'default' : 'outline'} onClick={() => setRadarMetric(m)}>
                  {RADAR_METRIC_LABELS[m]}
                </Button>
              ))}
            </div>
            <MuscleRadar series={radarSeries} />
            {view === 'compare' && (
              <p className="mt-1 text-[10.5px] text-muted-foreground">Average per session, {sessionCount} vs. {previousSessions.length} sessions.</p>
            )}
          </Card>

          <Card className="p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Development per session</div>
            {sessionCount >= 2 ? (
              <MetricTrendPanels history={trendPoints(sessions)} range={range} e1rmLabel="e1RM index" />
            ) : (
              <p className="text-[12px] text-muted-foreground">Train this workout a few more times to see a trend.</p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
