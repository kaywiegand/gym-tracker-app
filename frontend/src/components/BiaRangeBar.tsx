import type { BandedReading } from '@/lib/biaMetrics'

// Value against the scan's own normal band. The printout reports a range for
// every composition metric ("Body water 49.3, normal 37.0 - 45.2"), which is
// the part that actually carries meaning -- a bare "49.3 L" says nothing
// unless you know where normal sits.
//
// The track spans a padded window around the band so a value outside it is
// still visible instead of being clipped at the edge.
interface BiaRangeBarProps {
  label: string
  unit: string
  reading: BandedReading
}

export function BiaRangeBar({ label, unit, reading }: BiaRangeBarProps) {
  const { value, low, high } = reading

  if (value === null || low === null || high === null) {
    return (
      <div className="flex items-baseline justify-between py-1.5">
        <span className="text-[12.5px] text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums">{value !== null ? `${value} ${unit}` : '—'}</span>
      </div>
    )
  }

  const span = high - low
  const min = Math.min(low - span * 0.6, value - span * 0.25)
  const max = Math.max(high + span * 0.6, value + span * 0.25)
  const pos = (v: number) => ((v - min) / (max - min)) * 100

  const below = value < low
  const above = value > high
  const status = below || above ? 'var(--status-warn)' : 'var(--status-good)'

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: status }}>
          {value} <span className="text-[10.5px] font-semibold text-muted-foreground">{unit}</span>
        </span>
      </div>

      <div className="relative mt-1.5 h-[14px]">
        {/* full track */}
        <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-secondary" />
        {/* normal band */}
        <div
          className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-muted-foreground/35"
          style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
        />
        {/* the reading */}
        <div
          className="absolute top-1/2 h-[14px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pos(value)}%`, background: status }}
        />
      </div>

      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{low}</span>
        <span>{above ? 'above normal' : below ? 'below normal' : 'normal'}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}
