import { useEffect, useState } from 'react'
import { useScrollAnchor } from '@/lib/useScrollAnchor'
import { api } from '@/lib/api'
import { detectPlateau } from '@/lib/plateau'
import { formatNumber } from '@/lib/format'
import { acwrStatus } from '@/lib/acwr'
import { DEFAULT_RANGE, RANGE_OPTIONS, currentWindow, inWindow, localIso, resolveRangeWeeks, TZ_PARAM, type DashboardRange } from '@/lib/dashboardRanges'
import type { AcwrResponse, ExerciseHistoryEntry, ExerciseListItem, ExerciseSessionSummary, Settings } from '@/types'
import { MetricTrendPanels } from '@/components/MetricTrendPanels'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
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

function groupByWeight(sets: ExerciseSessionSummary['sets']): WeightGroup[] {
  const groups: WeightGroup[] = []
  for (const set of sets) {
    const last = groups[groups.length - 1]
    if (last && last.weightKg === set.weight_kg) last.reps.push(set.reps)
    else groups.push({ weightKg: set.weight_kg, reps: [set.reps] })
  }
  return groups
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

  const ladder = buildLadder(summaries)
  const plateauSessions = settings ? parseInt(settings.plateau_sessions, 10) : 4
  const isPlateaued = detectPlateau(history, plateauSessions)
  // Same thresholds and colors as the Overview ACWR card (lib/acwr.ts).
  const acwrClass = acwr ? acwrStatus(acwr.ratio).className : ''
  // Records in the selected range and when each was reached (#123), directly
  // above the session list they belong to. `history` is chronological
  // ascending (oldest first), so a strict `>` keeps the first session that
  // reached the value.
  const best = (key: 'top_weight_kg' | 'best_e1rm' | 'volume_kg') =>
    history.reduce<ExerciseHistoryEntry | null>((top, h) => (!top || h[key] > top[key] ? h : top), null)
  const records = [
    { label: 'Max set weight', entry: best('top_weight_kg'), key: 'top_weight_kg', decimals: 1 },
    { label: 'Max session e1RM', entry: best('best_e1rm'), key: 'best_e1rm', decimals: 1 },
    { label: 'Max session volume', entry: best('volume_kg'), key: 'volume_kg', decimals: 0 },
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

      {loading && loadedId !== selected.id ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions in this period.</p>
      ) : (
        <>
          {isPlateaued && (
            <Card className="border-status-warn/40 bg-status-warn/10 p-3">
              <div className="flex items-center gap-1 text-[12.5px] font-bold text-status-warn">
                Plateau
                <InfoButton term="Plateau" />
              </div>
              <p className="mt-0.5 text-[11.5px] text-status-warn/90">
                No e1RM growth in the last {plateauSessions} sessions — consider a deload week or an exercise variation.
              </p>
            </Card>
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

          <Card className="p-3.5">
            {history.length >= 2 ? (
              <MetricTrendPanels history={history} range={range} />
            ) : (
              <p className="text-[12px] text-muted-foreground">Track this exercise a few more times to see a trend.</p>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-2">
            {records.map(
              ({ label, entry, key, decimals }) =>
                entry && (
                  <Card key={key} className="gap-0 p-2.5">
                    <div className="min-h-[26px] text-[10.5px] leading-tight text-muted-foreground">{label}</div>
                    <div className="mt-1 text-[15px] font-bold tabular-nums">{formatNumber(entry[key], decimals)} kg</div>
                    <div className="text-[10.5px] tabular-nums text-muted-foreground">{shortDate(entry.started_at)}</div>
                  </Card>
                ),
            )}
          </div>

          <Card className="p-3.5">
            <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Session history</div>
            <p className="mb-2 text-[10.5px] text-muted-foreground">newest first · volume · weight × reps per set</p>
            <div className="flex flex-col">
              {ladder.map((rung) => (
                <div key={rung.sessionId} className="flex items-start gap-1.5 border-b border-border py-1.5 last:border-b-0">
                  <span className="w-[50px] shrink-0 pt-px text-[11px] tabular-nums text-muted-foreground">{shortDate(rung.startedAt)}</span>
                  <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                    {formatNumber(rung.volumeKg)} kg
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 text-[12.5px] tabular-nums">
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
          </Card>
        </>
      )}
    </div>
  )
}
