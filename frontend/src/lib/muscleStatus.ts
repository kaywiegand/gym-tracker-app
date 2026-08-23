// Traffic-light read of sets-this-week against MEV/MAV/MRV (CLAUDE.md §7
// governance + §8 "Bewertung an MEV/MAV/MRV"): under MEV = not enough yet,
// MEV-MAV = optimal growth zone, MAV-MRV = approaching the limit, over MRV =
// overreaching risk. Shared by the status list and the body-map silhouette
// so there's one ampel logic, not two.
export type VolumeStatus = 'under' | 'good' | 'warn' | 'crit'

export function statusFor(sets: number, mev: number, mav: number, mrv: number): VolumeStatus {
  if (sets < mev) return 'under'
  if (sets <= mav) return 'good'
  if (sets <= mrv) return 'warn'
  return 'crit'
}

export const STATUS_LABEL: Record<VolumeStatus, string> = {
  under: 'Below MEV',
  good: 'Optimal',
  warn: 'Near limit',
  crit: 'Over MRV',
}

export const STATUS_BADGE_CLASS: Record<VolumeStatus, string> = {
  under: 'bg-status-warn/15 text-status-warn',
  good: 'bg-status-good/15 text-status-good',
  warn: 'bg-status-warn/15 text-status-warn',
  crit: 'bg-status-crit/15 text-status-crit',
}

export const STATUS_FILL_VAR: Record<VolumeStatus, string> = {
  under: 'var(--status-warn)',
  good: 'var(--status-good)',
  warn: 'var(--status-warn)',
  crit: 'var(--status-crit)',
}
