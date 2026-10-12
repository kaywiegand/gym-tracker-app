import type { RegionMetrics, WorkoutMuscleSplitSession } from '@/types'
import { inWindow, localIso, type DayWindow } from '@/lib/dashboardRanges'
import type { TrendPoint } from '@/components/MetricTrendPanels'

// Pure helpers behind the Workout scope's development view (BACKLOG #87).

// Sessions whose local start day lies in the window (oldest first, as given).
export function sessionsInWindow(sessions: WorkoutMuscleSplitSession[], window: DayWindow | null): WorkoutMuscleSplitSession[] {
  if (!window) return []
  return sessions.filter((s) => inWindow(localIso(new Date(s.started_at)), window))
}

// "Character": sets and volume average over the sessions (what a typical run
// puts on a region); e1RM is a personal best, so it takes the top value.
export function characterValues(
  sessions: WorkoutMuscleSplitSession[],
  regions: string[],
  metric: keyof RegionMetrics,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of regions) {
    const values = sessions.map((s) => s.metrics_by_region?.[r]?.[metric] ?? 0)
    out[r] = metric === 'best_e1rm' ? Math.max(0, ...values) : values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
  }
  return out
}

// "vs. previous": the mean PER SESSION for every metric, so windows with
// different session counts stay comparable (a sum would just show "trained
// more often"). For e1RM, sessions where the region is not trained as a
// primary muscle (value 0) are left out of the mean -- 0 means "absent", not
// "weak". Empty window -> all zeros, never NaN.
export function perSessionMeanValues(
  sessions: WorkoutMuscleSplitSession[],
  regions: string[],
  metric: keyof RegionMetrics,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of regions) {
    let values = sessions.map((s) => s.metrics_by_region?.[r]?.[metric] ?? 0)
    if (metric === 'best_e1rm') values = values.filter((v) => v > 0)
    out[r] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }
  return out
}

// One trend point per session. Uses the API's whole-session totals (e1RM
// index = Σ best e1RM per exercise). Fallback for an older API without
// `totals`: sum over the region rows -- an APPROXIMATION that counts an
// exercise once per muscle it touches (volume/sets weighted, e1RM primary
// only); only used until the new API is deployed.
export function trendPoints(sessions: WorkoutMuscleSplitSession[]): TrendPoint[] {
  return sessions.map((s) => {
    if (s.totals) {
      return { started_at: s.started_at, best_e1rm: s.totals.e1rm_index, volume_kg: s.totals.volume_kg, sets_count: s.totals.sets }
    }
    const regions = Object.values(s.metrics_by_region ?? {})
    return {
      started_at: s.started_at,
      best_e1rm: regions.reduce((a, m) => a + m.best_e1rm, 0),
      volume_kg: regions.reduce((a, m) => a + m.volume_kg, 0),
      sets_count: Math.round(regions.reduce((a, m) => a + m.sets, 0)),
    }
  })
}
