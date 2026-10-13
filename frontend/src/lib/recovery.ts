import type { RecoveryResponse } from '@/types'

// Defaults of the recovery indicator (BACKLOG #129), mirrored from
// api/lib/Recovery.php for the Settings fields -- the stored setting wins.
export const RECOVERY_DEFAULTS = {
  recovery_drop_pct: 2.5,
  recovery_watch_share_pct: 35,
  recovery_deload_share_pct: 50,
} as const

export interface RecoveryStatus {
  // Hedged on purpose: the indicator is a tendency read from training
  // performance, never a measurement of recovery.
  label: string
  color: string
  className: string
}

export function recoveryStatus(status: RecoveryResponse['status']): RecoveryStatus {
  switch (status) {
    case 'on_track':
      return { label: 'Likely on track', color: 'var(--status-good)', className: 'text-status-good' }
    case 'watch':
      return { label: 'Possibly building fatigue', color: 'var(--status-warn)', className: 'text-status-warn' }
    case 'deload':
      return { label: 'A deload may help', color: 'var(--status-crit)', className: 'text-status-crit' }
    default:
      return { label: 'Not enough data yet', color: 'var(--muted-foreground)', className: 'text-muted-foreground' }
  }
}
