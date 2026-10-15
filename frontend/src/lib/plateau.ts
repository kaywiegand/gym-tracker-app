// Plateau detection (CLAUDE.md §8, "Differenzierer"). A single session's e1RM
// jumps around by 5-10% on its own, so comparing against one earlier value
// flags false alarms on a rising-but-noisy history. Two signals instead:
// how long ago the last meaningful best was, and whether the recent trend
// is flat. Bodyweight exercises (every session in the window at 0 kg) have an
// e1RM of 0, so the same rule runs on the per-session best reps instead.

// Sessions looked at when searching for the last meaningful best.
export const BEST_WINDOW_SESSIONS = 12
// Sessions the trend slope is fitted over; also the minimum history needed.
export const TREND_SESSIONS = 6
// A session only counts as a new best when it beats the earlier best in the
// window by more than this factor (2%); equal or slightly higher is noise.
export const BEST_MARGIN = 1.02
// The trend is flat below this slope, in % of the mean e1RM per session.
export const FLAT_SLOPE_PCT = 0.5

export type PlateauStatus = 'none' | 'stalling' | 'plateau'

export type PlateauMetric = 'e1rm' | 'reps'

export interface PlateauResult {
  status: PlateauStatus
  metric: PlateauMetric
  sessionsSinceBest: number
  trendSlopePct: number
}

// Least-squares line through (0, ys[0]) .. (n-1, ys[n-1]). Also draws the
// chart trendlines.
export function linearFit(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const meanX = (n - 1) / 2
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  ys.forEach((y, x) => {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) ** 2
  })
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: meanY - slope * meanX }
}

// Slope of the last `TREND_SESSIONS` values in % of their mean per session.
export function trendSlopePct(e1rms: number[]): number {
  const recent = e1rms.slice(-TREND_SESSIONS)
  if (recent.length < 2) return 0
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length
  if (mean === 0) return 0
  return (linearFit(recent).slope / mean) * 100
}

// Sessions since the last meaningful best within the window (0 = the latest
// session is one). Without any, the window's first session is the reference.
export function sessionsSinceBest(e1rms: number[]): number {
  const window = e1rms.slice(-BEST_WINDOW_SESSIONS)
  let lastBest = 0
  let max = window[0]
  for (let i = 1; i < window.length; i++) {
    if (window[i] > max * BEST_MARGIN) lastBest = i
    max = Math.max(max, window[i])
  }
  return window.length - 1 - lastBest
}

export interface PlateauSession {
  best_e1rm: number
  top_weight_kg: number
  best_reps: number
}

// Reps stand in for e1RM only when the whole plateau window is bodyweight.
function plateauMetric(history: PlateauSession[]): PlateauMetric {
  const window = history.slice(-BEST_WINDOW_SESSIONS)
  return window.every((h) => Number(h.top_weight_kg) === 0) ? 'reps' : 'e1rm'
}

// `history` is ascending by date; `plateauSessions` (P) is the Settings value.
export function detectPlateau(history: PlateauSession[], plateauSessions: number): PlateauResult {
  const none: PlateauResult = { status: 'none', metric: 'e1rm', sessionsSinceBest: 0, trendSlopePct: 0 }
  if (plateauSessions < 1 || history.length < TREND_SESSIONS) return none
  const metric = plateauMetric(history)
  const values = history.map((h) => Number(metric === 'reps' ? h.best_reps : h.best_e1rm))
  const since = sessionsSinceBest(values)
  const slope = trendSlopePct(values)
  const flat = slope < FLAT_SLOPE_PCT
  const status: PlateauStatus =
    flat && since >= plateauSessions ? 'plateau' : flat && since >= plateauSessions - 2 ? 'stalling' : 'none'
  return { status, metric, sessionsSinceBest: since, trendSlopePct: slope }
}
