import { api } from '@/lib/api'

// Single source of truth for the global range switch shared by all four
// Dashboard scopes (Overview/Exercise/Workout/Body) -- BACKLOG #82.
export const RANGE_OPTIONS = ['7D', '14D', '1M', '3M', '6M', '12M', 'All'] as const

// 12M, not 3M: after importing a year of history the 3M default showed four
// sessions out of 124 and every workout read "no sessions logged", which
// looks like a broken screen rather than an empty window.
export const DEFAULT_RANGE: DashboardRange = '12M'
export type DashboardRange = (typeof RANGE_OPTIONS)[number]

// The browser's IANA zone, sent as `tz` so the API buckets sessions into the
// viewer's local calendar days (BACKLOG #79).
export const TZ_PARAM = `tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')}`

// Rolling windows in whole weeks, ending today. "All" is only the upper cap;
// resolveRange() narrows it to the span that holds data.
export const RANGE_WEEKS: Record<DashboardRange, number> = {
  '7D': 1,
  '14D': 2,
  '1M': 4,
  '3M': 13,
  '6M': 26,
  '12M': 52,
  All: 260,
}

export const rangeDays = (weeks: number) => weeks * 7

// Colors of every "selected range vs. previous range" view (BACKLOG #82):
// blue = current, grey = previous. Use these, never ad-hoc colors.
export const COMPARE_COLORS = {
  current: 'var(--brand-accent)',
  previous: 'var(--muted-foreground)',
} as const

const RANGE_PHRASE: Record<DashboardRange, string> = {
  '7D': '7 days',
  '14D': '14 days',
  '1M': 'month',
  '3M': '3 months',
  '6M': '6 months',
  '12M': '12 months',
  All: 'all time',
}

// "Last 3 months vs. previous 3 months"; All has no comparison.
export function compareTitle(range: DashboardRange): string {
  const p = RANGE_PHRASE[range]
  return `Last ${p} vs. previous ${p}`
}

// "Last 3 months", "All time".
export function rangeTitle(range: DashboardRange): string {
  return range === 'All' ? 'All time' : `Last ${RANGE_PHRASE[range]}`
}

// --- Local calendar days as 'YYYY-MM-DD' strings ---------------------------
// The API returns session days in the viewer's zone (tz param), so every
// window is computed on the browser's local calendar, as ISO day strings
// (string comparison == date comparison).

export function localIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return localIso(d)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIso(toIso).getTime() - parseIso(fromIso).getTime()) / 86400000)
}

// Inclusive on both ends.
export interface DayWindow {
  start: string
  end: string
}

// The last `weeks` whole weeks up to and including today.
export function currentWindow(weeks: number, today: Date = new Date()): DayWindow {
  const end = localIso(today)
  return { start: addDays(end, -(weeks * 7 - 1)), end }
}

// The `weeks` weeks directly before currentWindow(weeks).
export function previousWindow(weeks: number, today: Date = new Date()): DayWindow {
  const cur = currentWindow(weeks, today)
  return { start: addDays(cur.start, -weeks * 7), end: addDays(cur.start, -1) }
}

// The comparison is only shown when the previous window lies completely
// within the data -- a half-empty previous window reads as "you trained
// less" when it is really "there was no data" (BACKLOG #82).
export function previousIsComplete(previous: DayWindow, firstSessionDay: string | null): boolean {
  return firstSessionDay !== null && previous.start >= firstSessionDay
}

export const inWindow = (iso: string, w: DayWindow) => iso >= w.start && iso <= w.end

export interface ResolvedRange {
  range: DashboardRange
  weeks: number
  days: number
  current: DayWindow
  // null for All, and whenever the previous window is not fully covered by
  // the data -- views then show the current window only.
  previous: DayWindow | null
  // Earliest training day in the data (null: no sessions yet).
  firstDate: string | null
  // All training days (finished sessions, local days) up to 260 weeks back;
  // filter with inWindow().
  dates: string[]
}

// One call that every comparison view starts from. For "All" the week count
// is the span that actually holds data (BACKLOG #74): from the first session
// up to now, capped at 260, never below 13.
export async function resolveRange(range: DashboardRange): Promise<ResolvedRange> {
  const { dates } = await api.get<{ dates: string[] }>(`/dashboard/consistency?days=${RANGE_WEEKS.All * 7}&${TZ_PARAM}`)
  const firstDate = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null

  let weeks = RANGE_WEEKS[range]
  if (range === 'All') {
    const spanDays = firstDate ? daysBetween(firstDate, localIso(new Date())) + 1 : 0
    weeks = Math.min(RANGE_WEEKS.All, Math.max(RANGE_WEEKS['3M'], Math.ceil(spanDays / 7)))
  }

  const previous = previousWindow(weeks)
  return {
    range,
    weeks,
    days: rangeDays(weeks),
    current: currentWindow(weeks),
    previous: range !== 'All' && previousIsComplete(previous, firstDate) ? previous : null,
    firstDate,
    dates,
  }
}

// Just the week count -- for scopes that only need the API `weeks=` param.
export async function resolveRangeWeeks(range: DashboardRange): Promise<number> {
  if (range !== 'All') return RANGE_WEEKS[range]
  return (await resolveRange(range)).weeks
}
