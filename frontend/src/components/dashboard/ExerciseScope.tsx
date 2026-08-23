import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { epley1RM } from '@/lib/metrics'
import type { ExerciseHistoryEntry, ExerciseListItem, ExerciseSessionSummary } from '@/types'
import { KpiTile } from '@/components/KpiTile'
import { E1rmTrendChart } from '@/components/E1rmTrendChart'
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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExerciseListItem[]>([])
  const [selected, setSelected] = useState<ExerciseListItem | null>(null)
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [summaries, setSummaries] = useState<ExerciseSessionSummary[]>([])
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
    setLoading(true)
    Promise.all([
      api.get<ExerciseHistoryEntry[]>(`/exercises/${selected.id}/history?limit=20`),
      api.get<ExerciseSessionSummary[]>(`/exercises/${selected.id}/session-summaries?limit=6`),
    ])
      .then(([historyData, summariesData]) => {
        setHistory(historyData)
        setSummaries(summariesData)
      })
      .finally(() => setLoading(false))
  }, [selected])

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
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

  const bestSet = summaries
    .flatMap((s) => s.sets)
    .reduce<{ weightKg: number; reps: number } | null>((best, s) => {
      if (!best || epley1RM(s.weight_kg, s.reps) > epley1RM(best.weightKg, best.reps)) {
        return { weightKg: s.weight_kg, reps: s.reps }
      }
      return best
    }, null)

  const lastE1rm = history[history.length - 1]?.best_e1rm ?? 0
  const firstE1rm = history[0]?.best_e1rm ?? lastE1rm
  const ladder = buildLadder(summaries)

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

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet for this exercise.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <KpiTile
              label="e1RM now"
              value={Math.round(lastE1rm).toString()}
              unit="kg"
              trend={lastE1rm > firstE1rm ? `▲ from ${Math.round(firstE1rm)}` : undefined}
              trendClassName="text-status-good"
              sparkline={history.map((h) => h.best_e1rm)}
              color="var(--metric-e1rm)"
            />
            <KpiTile
              label="Best set"
              value={bestSet ? `${bestSet.weightKg}` : '—'}
              unit={bestSet ? `kg ×${bestSet.reps}` : undefined}
              sparkline={history.map((h) => h.volume_kg)}
              color="var(--brand-accent)"
            />
          </div>

          <Card className="p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">e1RM trend</div>
            {history.length >= 2 ? (
              <E1rmTrendChart history={history} />
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
