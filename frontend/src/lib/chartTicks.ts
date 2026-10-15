export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// At most `max` indices, evenly spaced over `length` points and never the same
// one twice -- the x-axis labels of the line charts.
export function evenTickIndices(length: number, max: number): number[] {
  const count = Math.min(max, length)
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / Math.max(1, count - 1)))
}
