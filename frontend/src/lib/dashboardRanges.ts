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
