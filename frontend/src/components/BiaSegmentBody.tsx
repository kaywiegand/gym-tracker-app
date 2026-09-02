import { FRONT_FIGURE } from '@/components/bodyPaths'
import { BIA_SEGMENTS, pickSegment, type SegmentKind } from '@/lib/biaMetrics'
import type { BiaValue } from '@/types'

// BIA segment analysis drawn onto the body figure. Front view only -- the
// scan reports arms, trunk and legs, all of which read from the front; a back
// view would repeat the same five numbers.
//
// Colour is the device's "% of normal" for that segment, not the raw kg:
// 9.8 kg of leg muscle means nothing without knowing what normal is, and the
// percentage is exactly that comparison (CLAUDE.md §7 -- status colours).
interface BiaSegmentBodyProps {
  values: BiaValue[]
  kind: SegmentKind
}

// Muscle: more than normal is good. Fat: more than normal is not.
function statusColor(percent: number | null, kind: SegmentKind): string {
  if (percent === null) return 'var(--secondary)'
  if (kind === 'muscle') {
    if (percent >= 100) return 'var(--status-good)'
    if (percent >= 90) return 'var(--status-warn)'
    return 'var(--status-crit)'
  }
  if (percent <= 100) return 'var(--status-good)'
  if (percent <= 130) return 'var(--status-warn)'
  return 'var(--status-crit)'
}

export function BiaSegmentBody({ values, kind }: BiaSegmentBodyProps) {
  const readings = BIA_SEGMENTS.map((seg) => ({ seg, ...pickSegment(values, kind, seg.subcategory) }))

  const colorFor = (region: string | null, side?: 'left' | 'right'): string => {
    if (region === null) return 'var(--secondary)'
    // chest/core/back paths all belong to the scan's single "trunk" figure.
    const key = region === 'arms' || region === 'legs' ? region : 'trunk'
    const hit = readings.find((r) => r.seg.region === key && (key === 'trunk' || r.seg.side === side))
    return hit ? statusColor(hit.percent, kind) : 'var(--secondary)'
  }

  return (
    <div className="flex items-center gap-3">
      <svg viewBox={FRONT_FIGURE.viewBox} className="h-[210px] w-auto shrink-0">
        <g transform={FRONT_FIGURE.transform} stroke="var(--background)" strokeWidth={2} strokeLinejoin="round">
          {FRONT_FIGURE.paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.base ? 'var(--background)' : colorFor(p.region, p.side)} />
          ))}
        </g>
      </svg>

      <div className="min-w-0 flex-1">
        {readings.map(({ seg, kg, percent }) => (
          <div key={seg.subcategory} className="flex items-baseline justify-between border-b border-border py-1.5 last:border-b-0">
            <span className="text-[12px] text-foreground/80">{seg.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-bold tabular-nums">{kg !== null ? `${kg} kg` : '—'}</span>
              <span className="w-[52px] text-right text-[11px] font-semibold tabular-nums" style={{ color: statusColor(percent, kind) }}>
                {percent !== null ? `${percent}%` : ''}
              </span>
            </span>
          </div>
        ))}
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Percent of what the device considers normal for your height and age.
        </p>
      </div>
    </div>
  )
}
