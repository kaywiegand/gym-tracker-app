// ACWR = acute (7 days) vs. chronic (28 days) load, CLAUDE.md §8. The
// definition is fixed -- it does not follow the dashboard range, only the
// chart's time axis does (BACKLOG #83). Shared by the Overview card and
// anything else that shows a ratio.
export const ACWR_LOW = 0.8
export const ACWR_HIGH = 1.3
export const ACWR_CRITICAL = 1.5

export interface AcwrStatus {
  // CSS color (status token) for the line / number.
  color: string
  // Tailwind text class with the same token.
  className: string
  label: 'in target range' | 'below range' | 'above range'
}

// <0.8 warn, 0.8-1.3 good, 1.3-1.5 warn, >1.5 crit (CLAUDE.md §7: status
// colors are status only).
export function acwrStatus(ratio: number): AcwrStatus {
  if (ratio < ACWR_LOW) return { color: 'var(--status-warn)', className: 'text-status-warn', label: 'below range' }
  if (ratio <= ACWR_HIGH) return { color: 'var(--status-good)', className: 'text-status-good', label: 'in target range' }
  if (ratio <= ACWR_CRITICAL) return { color: 'var(--status-warn)', className: 'text-status-warn', label: 'above range' }
  return { color: 'var(--status-crit)', className: 'text-status-crit', label: 'above range' }
}
