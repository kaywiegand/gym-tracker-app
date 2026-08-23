import { useEffect, useState } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { api } from '@/lib/api'
import type { WorkoutListItem, WorkoutMuscleSplitResponse } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'
import { MuscleRadar, type MuscleRadarSeries } from '@/components/MuscleRadar'
import { KpiTile } from '@/components/KpiTile'
import { Card } from '@/components/ui/card'

export function WorkoutScope() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [selected, setSelected] = useState<WorkoutListItem | null>(null)
  const [split, setSplit] = useState<WorkoutMuscleSplitResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<WorkoutListItem[]>('/workouts').then(setWorkouts)
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    api
      .get<WorkoutMuscleSplitResponse>(`/workouts/${selected.id}/muscle-split?limit=6`)
      .then(setSplit)
      .finally(() => setLoading(false))
  }, [selected])

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
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

  const averages: Record<string, number> = {}
  regionKeys.forEach((r) => {
    averages[r] = sessions.reduce((a, s) => a + (s.by_region[r] ?? 0), 0) / Math.max(1, sessions.length)
  })
  const radarSeries: MuscleRadarSeries[] = [{ label: selected.name, color: 'var(--brand-accent)', values: averages }]

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
      ) : sessionCount === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions logged for this workout yet.</p>
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
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">This workout's signature</div>
            <MuscleRadar series={radarSeries} />
          </Card>
        </>
      )}
    </div>
  )
}
