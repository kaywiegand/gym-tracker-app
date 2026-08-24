import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { detectPlateau } from '@/lib/plateau'
import { RANGE_OPTIONS, RANGE_WEEKS, type DashboardRange } from '@/lib/dashboardRanges'
import type { AcwrResponse, ExerciseHistoryEntry, ExerciseListItem, ExerciseSessionSummary, Settings } from '@/types'
import { MultiMetricTrendChart } from '@/components/MultiMetricTrendChart'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Rung {
  sessionId: string
  weightKg: number
  reps: number[]
  trend: 'up-weight' | 'up-reps' | 'hold'
}

function buildLadder(summaries: ExerciseSessionSummary[]): Rung[] {
  const mostRecentFirst = [...summaries].reverse()
  return mostRecentFirst.map((session, i) => {
    const prior = mostRecentFirst[i + 1]
    const weightKg = session.sets[0]?.weight_kg ?? 0
    const reps = session.sets.map((s) => s.reps)
    let trend: Rung['trend'] = 'hold'
    if (prior) {
      const priorWeight = prior.sets[0]?.weight_kg ?? 0
      const priorAvgReps = prior.sets.reduce((a, s) => a + s.reps, 0) / Math.max(1, prior.sets.length)
      const avgReps = reps.reduce((a, r) => a + r, 0) / Math.max(1, reps.length)
      if (weightKg > priorWeight) trend = 'up-weight'
      else if (weightKg === priorWeight && avgReps > priorAvgReps) trend = 'up-reps'
    }
    return { sessionId: session.session_id, weightKg, reps, trend }
  })
}

export function ExerciseScope() {
  const [range, setRange] = useState<DashboardRange>('3M')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExerciseListItem[]>([])
  const [selected, setSelected] = useState<ExerciseListItem | null>(null)
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [summaries, setSummaries] = useState<ExerciseSessionSummary[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selected) return
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        return
      }
      api.get<ExerciseListItem[]>(`/exercises?q=${encodeURIComponent(query.trim())}`).then(setResults)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, selected])

  useEffect(() => {
    if (!selected) return
    const weeks = RANGE_WEEKS[range]
    setLoading(true)
    Promise.all([
      api.get<ExerciseHistoryEntry[]>(`/exercises/${selected.id}/history?limit=20&weeks=${weeks}`),
      api.get<ExerciseSessionSummary[]>(`/exercises/${selected.id}/session-summaries?limit=20&weeks=${weeks}`),
      api.get<Settings>('/settings'),
      api.get<AcwrResponse>(`/dashboard/acwr?weeks=${weeks}`),
    ])
      .then(([historyData, summariesData, settingsData, acwrData]) => {
        setHistory(historyData)
        setSummaries(summariesData)
        setSettings(settingsData)
        setAcwr(acwrData)
      })
      .finally(() => setLoading(false))
  }, [selected, range])

  const rangeSwitch = (
    <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
  )

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
        {rangeSwitch}
        <Input placeholder="Search an exercise…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {results.map((r) => (
          <Card
            key={r.id}
            className="cursor-pointer px-3 py-2.5"
            onClick={() => {
              setSelected(r)
              setQuery('')
              setResults([])
            }}
          >
            <div className="text-[14px] font-semibold">{r.name}</div>
            <div className="text-[11.5px] text-muted-foreground">{[r.primary_muscle, r.equipment].filter(Boolean).join(' · ')}</div>
          </Card>
        ))}
      </div>
    )
  }

  const lastEntry = history[history.length - 1]
  const ladder = buildLadder(summaries)
  const plateauSessions = settings ? parseInt(settings.plateau_sessions, 10) : 4
  const isPlateaued = detectPlateau(history, plateauSessions)
  const acwrInRange = acwr ? acwr.ratio >= 0.8 && acwr.ratio <= 1.3 : true

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
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet for this exercise.</p>
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

          {acwr && (
            <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              Overall training load: <span className={acwrInRange ? 'text-status-good' : 'text-status-warn'}>{acwr.ratio.toFixed(2)}</span>
              <span>({acwrInRange ? 'in range' : 'outside 0.8–1.3'})</span>
              <InfoButton term="ACWR" />
            </div>
          )}

          <Card className="p-3.5">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">e1RM now</div>
                <div className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--metric-e1rm)' }}>
                  {Math.round(lastEntry?.best_e1rm ?? 0)}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">kg</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Volume</div>
                <div className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--metric-volume)' }}>
                  {Math.round(lastEntry?.volume_kg ?? 0).toLocaleString()}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">kg</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sets</div>
                <div className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--metric-sets)' }}>
                  {lastEntry?.sets_count ?? 0}
                </div>
              </div>
            </div>
            {history.length >= 2 ? (
              <MultiMetricTrendChart history={history} />
            ) : (
              <p className="text-[12px] text-muted-foreground">Track this exercise a few more times to see a trend.</p>
            )}
          </Card>

          <Card className="p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Progression ladder</div>
            <div className="flex flex-col">
              {ladder.map((rung) => (
                <div key={rung.sessionId} className="flex items-center justify-between border-b border-border py-1.5 last:border-b-0">
                  <span className="text-[12.5px] text-muted-foreground">{rung.weightKg} kg</span>
                  <span className="text-[12.5px] tabular-nums">{rung.reps.join(' / ')}</span>
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
