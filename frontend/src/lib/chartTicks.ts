export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// At most `max` indices, evenly spaced over `length` points and never the same
// one twice -- the x-axis labels of the line charts.
export function evenTickIndices(length: number, max: number): number[] {
  const count = Math.min(max, length)
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / Math.max(1, count - 1)))
}

// Minimum horizontal room per label: 10px rotated text + gap.
export const MIN_TICK_SPACING_PX = 13

export type DateTickMode = 'session' | 'month'

// X-axis ticks for a session-indexed point scale (index 0..n-1, `dates` are
// ISO strings, oldest first). Every session gets a tick while there is room;
// otherwise one tick at the first session of each calendar month, thinned to
// every k-th month if even those would collide.
export function chooseDateTicks(
  dates: string[],
  plotWidthPx: number,
): { tickIndices: number[]; mode: DateTickMode } {
  const n = dates.length
  const perSession = plotWidthPx / Math.max(1, n - 1)
  const all = Array.from({ length: n }, (_, i) => i)
  if (perSession >= MIN_TICK_SPACING_PX) return { tickIndices: all, mode: 'session' }

  const firsts: number[] = []
  let prev = ''
  dates.forEach((d, i) => {
    const key = d.slice(0, 7)
    if (key !== prev) firsts.push(i)
    prev = key
  })
  let minGap = Infinity
  for (let i = 1; i < firsts.length; i++) minGap = Math.min(minGap, firsts[i] - firsts[i - 1])
  const step = firsts.length > 1 ? Math.max(1, Math.ceil(MIN_TICK_SPACING_PX / (minGap * perSession))) : 1
  return { tickIndices: firsts.filter((_, i) => i % step === 0), mode: 'month' }
}
