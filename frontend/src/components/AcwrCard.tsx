import { Card } from '@/components/ui/card'
import { InfoButton } from '@/components/InfoButton'
import type { AcwrDay } from '@/types'
import { ACWR_HIGH, ACWR_LOW, acwrStatus } from '@/lib/acwr'

interface AcwrCardProps {
  // One value per day over the selected range (API: daily_series).
  series: AcwrDay[]
  // Current value shown as the big number (API: ratio).
  ratio: number
  className?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}. ${MONTHS[m - 1]}`
}

// ACWR (7d vs. 28d, fixed definition) as a daily line over the selected
// range, with the 0.8-1.3 target band shaded green. Line and number take
// the status color of the CURRENT value (BACKLOG #83). Hand-rolled SVG like
// the KPI line charts; the reference labels are HTML so they do not stretch.
export function AcwrCard({ series, ratio, className }: AcwrCardProps) {
  const status = acwrStatus(ratio)
  const values = series.map((d) => d.ratio).filter((v): v is number => v !== null)
  const lo = Math.min(0.6, ...values.map((v) => v - 0.05))
  const hi = Math.max(1.6, ...values.map((v) => v + 0.05))
  const w = 100
  const h = 60
  const x = (i: number) => (i * w) / Math.max(1, series.length - 1)
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h
  const pct = (v: number) => `${((hi - v) / (hi - lo)) * 100}%`

  // Split at null days so before-the-first-session is a gap, not a line to 0.
  const segments: string[] = []
  let current: string[] = []
  series.forEach((d, i) => {
    if (d.ratio === null) {
      if (current.length) segments.push(current.join(' '))
      current = []
    } else {
      current.push(`${x(i).toFixed(2)},${y(d.ratio).toFixed(2)}`)
    }
  })
  if (current.length) segments.push(current.join(' '))

  const ref = { vectorEffect: 'non-scaling-stroke' as const, strokeDasharray: '3 3', stroke: 'var(--status-good)', strokeWidth: 1, opacity: 0.7 }

  return (
    <Card className={`p-3.5 ${className ?? ''}`}>
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        ACWR · 7d vs. 28d
        <InfoButton term="ACWR" />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-[21px] font-bold" style={{ color: status.color }}>
          {ratio.toFixed(2)}
        </span>
        <span className={`text-[12px] font-semibold ${status.className}`}>{status.label}</span>
      </div>

      {segments.length > 0 && (
        <>
          <div className="relative mt-2 h-[96px]">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="ACWR over the selected range">
              <rect x={0} width={w} y={y(ACWR_HIGH)} height={y(ACWR_LOW) - y(ACWR_HIGH)} fill="var(--status-good)" opacity={0.12} />
              <line x1={0} x2={w} y1={y(ACWR_HIGH)} y2={y(ACWR_HIGH)} style={ref} />
              <line x1={0} x2={w} y1={y(ACWR_LOW)} y2={y(ACWR_LOW)} style={ref} />
              {segments.map((pts, i) => (
                <polyline
                  key={i}
                  points={pts}
                  fill="none"
                  stroke={status.color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {[ACWR_HIGH, ACWR_LOW].map((v) => (
              <span
                key={v}
                className="absolute right-0 -translate-y-1/2 bg-card/80 px-0.5 text-[9.5px] tabular-nums text-muted-foreground"
                style={{ top: pct(v) }}
              >
                {v.toFixed(1)}
              </span>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{shortDate(series[0].date)}</span>
            <span>{shortDate(series[series.length - 1].date)}</span>
          </div>
        </>
      )}
    </Card>
  )
}
