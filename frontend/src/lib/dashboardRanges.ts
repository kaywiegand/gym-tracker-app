import { api } from '@/lib/api'

// Single source of truth for the 3M/6M/12M/All range switch shared by all
// four Dashboard scopes (Overview/Exercise/Workout/Body).
export const RANGE_OPTIONS = ['3M', '6M', '12M', 'All'] as const

// 12M, not 3M: after importing a year of history the 3M default showed four
// sessions out of 124 and every workout read "no sessions logged", which
// looks like a broken screen rather than an empty window.
export const DEFAULT_RANGE: DashboardRange = '12M'
export type DashboardRange = (typeof RANGE_OPTIONS)[number]

export const RANGE_WEEKS: Record<DashboardRange, number> = {
  '3M': 13,
  '6M': 26,
  '12M': 52,
  All: 260,
}

// "All" used to request a flat 260 weeks, so weekly charts and the
// consistency calendar were padded with years of empty weeks before the
// first session (BACKLOG #74). Resolve it to the span that actually holds
// data: from the week of the first session up to now, capped at 260.
export async function resolveRangeWeeks(range: DashboardRange): Promise<number> {
  if (range !== 'All') return RANGE_WEEKS[range]
  const { dates } = await api.get<{ dates: string[] }>(`/dashboard/consistency?days=${RANGE_WEEKS.All * 7}`)
  if (dates.length === 0) return RANGE_WEEKS['3M']
  const first = dates.reduce((a, b) => (a < b ? a : b))
  const spanDays = (Date.now() - new Date(first).getTime()) / 86400000
  // +2: the first session's own week and the current week are both partial.
  return Math.min(RANGE_WEEKS.All, Math.max(RANGE_WEEKS['3M'], Math.ceil(spanDays / 7) + 2))
}
