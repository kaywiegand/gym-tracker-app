import { useEffect, useState } from 'react'
import { useScrollAnchor } from '@/lib/useScrollAnchor'
import { api } from '@/lib/api'
import { detectPlateau } from '@/lib/plateau'
import { suggestNext, type Suggestion } from '@/lib/progression'
import { formatNumber } from '@/lib/format'
import { acwrStatus } from '@/lib/acwr'
import { DEFAULT_RANGE, RANGE_OPTIONS, currentWindow, inWindow, localIso, rangeTitle, resolveRangeWeeks, TZ_PARAM, type DashboardRange } from '@/lib/dashboardRanges'
import type {
  AcwrResponse,
  ExerciseHistoryEntry,
  ExerciseListItem,
  ExerciseSessionSummary,
  ProgressionContext,
  SetEntry,
  Settings,
} from '@/types'
import { MetricTrendPanels, TREND_PANELS_HEIGHT } from '@/components/MetricTrendPanels'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { TileHeader } from '@/components/TileHeader'
import { TileBody } from '@/components/TileBody'
import { DashboardStickyBar } from '@/components/dashboard/DashboardStickyBar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExerciseSelectorControls, ExerciseSelectorResults, useExerciseSelectorState } from '@/components/ExerciseSelector'

// DD.MM.YY, the short date used both in the ladder rows and the record
// tiles above them.
const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`

// Consecutive sets at the same weight, shown as one "75 kg x 4 / 4 / 4".
interface WeightGroup {
  weightKg: number
  reps: number[]
}

interface Rung {
  sessionId: string
  startedAt: string
  volumeKg: number
  groups: WeightGroup[]
  trend: 'up-weight' | 'up-reps' | 'hold'
}

function groupByWeight(sets: { weight_kg: number; reps: number }[]): WeightGroup[] {
  const groups: WeightGroup[] = []
  for (const set of sets) {
    const last = groups[groups.length - 1]
    if (last && last.weightKg === set.weight_kg) last.reps.push(set.reps)
    else groups.push({ weightKg: set.weight_kg, reps: [set.reps] })
  }
  return groups
}

// Last logged session of the exercise and the target derived from it.
interface LastTime {
  performedAt: string
  groups: WeightGroup[]
  lastWeightKg: number
  repHigh: number
  target: Suggestion | null
}

const topWeight = (sets: ExerciseSessionSummary['sets']) => sets.reduce((max, s) => Math.max(max, s.weight_kg), 0)

function buildLadder(summaries: ExerciseSessionSummary[]): Rung[] {
  const mostRecentFirst = [...summaries].reverse()
  return mostRecentFirst.map((session, i) => {
    const prior = mostRecentFirst[i + 1]
    // Top weight, not the first set's: a session that ramps up (75, 80, 85)
    // has to count as its heaviest set, same as the "Max set weight" tile (#123).
    const weightKg = topWeight(session.sets)
    // Session volume (#34) -- Σ weight × reps
    // over the session's own sets, same definition as the Volume metric
    // everywhere else in the app.
    const volumeKg = session.sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)
    const reps = session.sets.map((s) => s.reps)
    let trend: Rung['trend'] = 'hold'
    if (prior) {
      const priorWeight = topWeight(prior.sets)
      const priorAvgReps = prior.sets.reduce((a, s) => a + s.reps, 0) / Math.max(1, prior.sets.length)
      const avgReps = reps.reduce((a, r) => a + r, 0) / Math.max(1, reps.length)
      if (weightKg > priorWeight) trend = 'up-weight'
      else if (weightKg === priorWeight && avgReps > priorAvgReps) trend = 'up-reps'
    }
    return { sessionId: session.session_id, startedAt: session.started_at, volumeKg, groups: groupByWeight(session.sets), trend }
  })
}

// The selection step, lifted out of the shared <ExerciseSelector> so its
// search/filters/browse controls can be pinned in their own sticky block
// directly beneath the dashboard's sticky title/tabs (BACKLOG #50) -- the
// same technique ExercisesPage already uses for its own PageHeader, reusing
// DashboardStickyBar's offset here instead.
//
// The selector state lives in ExerciseScope, not here: this step unmounts as
// soon as an exercise is chosen, which used to throw away the open workout
// (#78). Kept in the parent, "change" lands back in the same workout's list.
function ExercisePickerStep({
  state,
  onSelect,
}: {
  state: ReturnType<typeof useExerciseSelectorState>
  onSelect: (exercise: ExerciseListItem) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <DashboardStickyBar>
        <ExerciseSelectorControls state={state} />
      </DashboardStickyBar>
      <ExerciseSelectorResults state={state} onSelect={onSelect} />
    </div>
  )
}

export function ExerciseScope() {
  const anchorRef = useScrollAnchor<HTMLDivElement>()
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE)
  const [selected, setSelected] = useState<ExerciseListItem | null>(null)
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [summaries, setSummaries] = useState<ExerciseSessionSummary[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [loading, setLoading] = useState(false)
  // Exercise the current `history` belongs to. A range change refetches but
  // keeps the old data on screen (BACKLOG #110); only a different exercise
  // shows the loading placeholder.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const pickerState = useExerciseSelectorState([])
  const [lastTime, setLastTime] = useState<LastTime | null>(null)
  const [recentHistory, setRecentHistory] = useState<ExerciseHistoryEntry[]>([])

  // Facts about the exercise itself, not about the selected range: what was
  // logged last time, the target the progression engine derives from it
  // (#127 -- same engine and inputs as the tracking screen), and the latest
  // sessions for the plateau check (#126).
  useEffect(() => {
    setLastTime(null)
    setRecentHistory([])
    if (!selected) return
    let cancelled = false
    Promise.all([
      api.get<SetEntry[]>(`/exercises/${selected.id}/last-sets`),
      api.get<ProgressionContext | null>(`/exercises/${selected.id}/progression-context`),
      api.get<Settings>('/settings'),
      api.get<ExerciseHistoryEntry[]>(`/exercises/${selected.id}/history`),
    ])
      .then(([lastSets, context, settingsData, recent]) => {
        if (cancelled) return
        setRecentHistory(recent)
        const workingSets = lastSets.filter((s) => !s.is_warmup)
        if (workingSets.length === 0) return
        // No rep range without a workout, so no target either -- "last time"
        // still stands on its own.
        const target = context
          ? suggestNext({
              lastSets,
              repLow: context.rep_low,
              repHigh: context.rep_high,
              incrementKg: context.increment_kg ?? parseFloat(settingsData.default_increment_kg),
              roundingKg: parseFloat(settingsData.rounding_kg),
              trigger: settingsData.progression_trigger,
            })
          : null
        setLastTime({
          performedAt: workingSets[0].performed_at,
          groups: groupByWeight(workingSets),
          lastWeightKg: workingSets[workingSets.length - 1].weight_kg,
          repHigh: context?.rep_high ?? 0,
          target,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selected])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true)
    // No `limit`: with `weeks` set the API filters by date and lifts its row
    // cap itself (#84) -- the range decides what is shown, not a session count.
    resolveRangeWeeks(range).then((weeks) => Promise.all([
      api.get<ExerciseHistoryEntry[]>(`/exercises/${selected.id}/history?weeks=${weeks}`),
      api.get<ExerciseSessionSummary[]>(`/exercises/${selected.id}/session-summaries?weeks=${weeks}`),
      api.get<Settings>('/settings'),
      // ACWR is a fixed 7d-vs-28d ratio; the range does not change it.
      api.get<AcwrResponse>(`/dashboard/acwr?weeks=4&${TZ_PARAM}`),
      weeks,
    ]))
      .then(([historyData, summariesData, settingsData, acwrData, weeks]) => {
        if (cancelled) return
        // The API cuts at "now minus N days"; the dashboard windows are whole
        // local calendar days, so trim to the same window as the other scopes.
        const win = currentWindow(weeks)
        const inRange = (iso: string) => inWindow(localIso(new Date(iso)), win)
        setHistory(historyData.filter((h) => inRange(h.started_at)))
        setSummaries(summariesData.filter((s) => inRange(s.started_at)))
        setSettings(settingsData)
        setAcwr(acwrData)
        setLoadedId(selected.id)
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

  // Choosing comes first and alone -- the range switch only means something
  // once an exercise is picked (BACKLOG #36).
  if (!selected) {
    return <ExercisePickerStep state={pickerState} onSelect={setSelected} />
  }

  // Loading (an exercise just picked) and empty (no sessions in the range)
  // show inside the tiles, never instead of them. While another exercise's
  // data is still on screen it is not shown.
  const stale = loadedId !== selected.id
  const shownHistory = stale ? [] : history
  const ladder = buildLadder(stale ? [] : summaries)
  const emptyMessage = stale && loading ? 'Loading…' : shownHistory.length === 0 ? 'No sessions in this period' : undefined
  const hasTarget = !!lastTime?.target && lastTime.target.weightKg !== null
  const addsWeight = (lastTime?.target?.weightKg ?? 0) > (lastTime?.lastWeightKg ?? 0)
  const plateauSessions = settings ? parseInt(settings.plateau_sessions, 10) : 6
  // Over the latest sessions overall, not the selected range (#126) -- a
  // plateau is a fact about the exercise, and a 7D window never holds enough
  // sessions to show it.
  const plateau = detectPlateau(recentHistory, plateauSessions)
  // Same thresholds and colors as the Overview ACWR card (lib/acwr.ts).
  const acwrClass = acwr ? acwrStatus(acwr.ratio).className : ''
  // Records in the selected range and when each was reached (#123), directly
  // above the session list they belong to. `history` is chronological
  // ascending (oldest first), so a strict `>` keeps the first session that
  // reached the value.
  const best = (key: 'top_weight_kg' | 'best_e1rm' | 'volume_kg') =>
    shownHistory.reduce<ExerciseHistoryEntry | null>((top, h) => (!top || h[key] > top[key] ? h : top), null)
  const records = [
    { label: ['Max set', 'weight'], entry: best('top_weight_kg'), key: 'top_weight_kg', decimals: 1 },
    { label: ['Max session', 'e1RM'], entry: best('best_e1rm'), key: 'best_e1rm', decimals: 1 },
    { label: ['Max session', 'volume'], entry: best('volume_kg'), key: 'volume_kg', decimals: 0 },
  ] as const

  return (
    <div ref={anchorRef} className="flex flex-col gap-3 [overflow-anchor:none]">
      <DashboardStickyBar>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-left"
          onClick={() => setSelected(null)}
        >
          <span className="text-[14px] font-bold">{selected.display_name}</span>
          <span className="text-[12px] text-muted-foreground">change ›</span>
        </button>

        {rangeSwitch}
      </DashboardStickyBar>

      {lastTime && (
        // Two tiles side by side (#132): what was done, and what to aim for.
        // Without a target (exercise in no workout) "Last time" stands alone.
        <div className={`grid gap-2 ${hasTarget ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Card className="gap-0 p-3">
            <TileHeader title="Last time" subline={shortDate(localIso(new Date(lastTime.performedAt)))} className="" />
            <div className="mt-1.5 flex flex-col text-[15px] font-bold tabular-nums">
              {lastTime.groups.map((group, i) => (
                <span key={i} className="whitespace-nowrap">
                  {formatNumber(group.weightKg, 1)} kg <span className="font-normal text-muted-foreground">× {group.reps.join(' / ')}</span>
                </span>
              ))}
            </div>
          </Card>
          {lastTime.target && lastTime.target.weightKg !== null && (
            <Card className="gap-0 p-3">
              {/* One-line subline so the value sits level with "Last time";
                  the reason follows below it. */}
              <TileHeader title="Target" subline={addsWeight ? 'Add weight' : 'Same weight'} className="" />
              <div className="mt-1.5 text-[15px] font-bold tabular-nums">
                {formatNumber(lastTime.target.weightKg, 1)} kg × {lastTime.target.reps}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {addsWeight ? `Top of the range (${lastTime.repHigh}) reached` : `Work up to ${lastTime.repHigh} reps`}
              </div>
            </Card>
          )}
        </div>
      )}

      {plateau.status === 'plateau' && (
        <Card className="gap-0 border-status-warn/40 bg-status-warn/10 p-3">
          {/* Title + subline like TileHeader, in the status colour. */}
          <div className="flex items-center gap-1 text-[14px] font-bold leading-tight text-status-warn">
            Plateau
            <InfoButton term="Plateau" />
          </div>
          <div className="mt-0.5 text-[11px] text-status-warn/90">
            No meaningful e1RM gain in the last {plateau.sessionsSinceBest} sessions
          </div>
          <p className="mt-1.5 text-[11.5px] text-status-warn/90">Consider a deload week or an exercise variation.</p>
        </Card>
      )}

      {plateau.status === 'stalling' && (
        // Quiet on purpose: yellow is reserved for the warning above (§7).
        <p className="text-[11.5px] text-muted-foreground">
          Stalling — no meaningful e1RM gain in the last {plateau.sessionsSinceBest} sessions. Could turn into a plateau.{' '}
          <InfoButton term="Plateau" />
        </p>
      )}

      {acwr && acwr.chronic_kg > 0 && (
        // Plain words + a percentage instead of the raw ACWR ratio
        // (#32) -- "0.11" read as a mystery number even with the info
        // button. Wrapped as normal text flow (not a flex row) so it can
        // still break onto a second line on a phone without truncating.
        <p className="text-[11.5px] text-muted-foreground">
          Whole-body load, last 7 days:{' '}
          <span className={acwrClass}>{Math.round(acwr.ratio * 100)}%</span>{' '}
          of your 4-week average (usual range 80–130%) <InfoButton term="ACWR" />
        </p>
      )}

      {/* The three tiles stay on screen when the range holds no sessions (or
          the exercise is still loading): the message sits inside each tile's
          fixed-height body, so a range switch never changes the page height
          (BACKLOG #141). */}
      <Card className="gap-0 p-3.5">
        <TileHeader title="Progress" subline={`e1RM, volume and sets per session · ${rangeTitle(range)}`} />
        <TileBody
          height={TREND_PANELS_HEIGHT}
          message={emptyMessage ?? (shownHistory.length < 2 ? 'Track this exercise a few more times to see a trend.' : undefined)}
        >
          <MetricTrendPanels history={history} range={range} />
        </TileBody>
      </Card>

      <div>
        <TileHeader title="Records" subline="Best values in this period" className="mb-2 px-0.5" />
        <div className="grid grid-cols-3 gap-2">
          {records.map(({ label, entry, key, decimals }) => (
            <Card key={key} className="gap-0 p-2.5">
              <div className="text-[10.5px] leading-tight text-muted-foreground">
                {label[0]}
                <br />
                {label[1]}
              </div>
              <div className="mt-1 text-[15px] font-bold tabular-nums">{entry ? `${formatNumber(entry[key], decimals)} kg` : '—'}</div>
              <div className="text-[10.5px] tabular-nums text-muted-foreground">{entry ? shortDate(entry.started_at) : '—'}</div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="gap-0 p-3.5">
        <TileHeader title="Session history" subline="Newest first · volume · weight × reps per set" />
        {/* Last tile, so it may grow and shrink with the range (BACKLOG #141). */}
        {emptyMessage !== undefined ? (
          <p className="py-2 text-[12px] text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col">
            {ladder.map((rung) => (
              <div key={rung.sessionId} className="flex items-start gap-1.5 border-b border-border py-1.5 last:border-b-0">
                <span className="w-[50px] shrink-0 pt-px text-[11px] tabular-nums text-muted-foreground">{shortDate(rung.startedAt)}</span>
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                  {formatNumber(rung.volumeKg)} kg
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-[12.5px] tabular-nums">
                  {rung.groups.map((group, i) => (
                    <span key={i} className="whitespace-nowrap">
                      {formatNumber(group.weightKg, 1)} kg <span className="text-muted-foreground">× {group.reps.join(' / ')}</span>
                    </span>
                  ))}
                </span>
                {rung.trend === 'hold' ? (
                  <Badge variant="outline" className="text-[10px]">
                    hold
                  </Badge>
                ) : (
                  <Badge className="bg-status-good/15 text-[10px] text-status-good" variant="secondary">
                    {rung.trend === 'up-weight' ? '↑ weight' : 'reps ↑'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
