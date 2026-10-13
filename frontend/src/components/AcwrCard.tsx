import { Card } from '@/components/ui/card'
import { TileHeader } from '@/components/TileHeader'
import type { AcwrDay } from '@/types'
import { ACWR_CRITICAL, ACWR_HIGH, ACWR_LOW, acwrStatus } from '@/lib/acwr'

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
// range, with the 0.8-1.3 target band shaded green. The big number takes the
// status color of the CURRENT value (BACKLOG #83); the line is coloured
// piece by piece by the zone it runs through (BACKLOG #102). Hand-rolled SVG
// like the KPI line charts; the reference labels are HTML
// so they do not stretch.
export function AcwrCard({ series: fullSeries, ratio, className }: AcwrCardProps) {
  // The API returns one entry per day of the range, null before the first
  // session. A range reaching further back than the data (or "All" rounded up
  // to whole weeks) must not leave an empty stretch at the left edge
  // (BACKLOG #74), so the axis starts at the first day with a value.
  const firstValue = fullSeries.findIndex((d) => d.ratio !== null)
  const series = firstValue > 0 ? fullSeries.slice(firstValue) : fullSeries
  const status = acwrStatus(ratio)
  const values = series.map((d) => d.ratio).filter((v): v is number => v !== null)
  const lo = Math.min(0.6, ...values.map((v) => v - 0.05))
  const hi = Math.max(1.6, ...values.map((v) => v + 0.05))
  const w = 100
  const h = 60
  const x = (i: number) => (i * w) / Math.max(1, series.length - 1)
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h
  const pct = (v: number) => `${((hi - v) / (hi - lo)) * 100}%`

  // One run per stretch of the same zone. A day-to-day step that crosses a
  // zone border is cut at the border so the colour changes where the value
  // does; null days (before the first session) are a gap, not a line to 0.
  const runs: { color: string; pts: string[] }[] = []
  const push = (color: string, from: string, to: string) => {
    const last = runs[runs.length - 1]
    if (last && last.color === color && last.pts[last.pts.length - 1] === from) last.pts.push(to)
    else runs.push({ color, pts: [from, to] })
  }
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1].ratio
    const b = series[i].ratio
    if (a === null || b === null) continue
    const cuts = [ACWR_LOW, ACWR_HIGH, ACWR_CRITICAL]
      .map((t) => (t - a) / (b - a))
      .filter((t) => t > 0 && t < 1)
      .sort((p, q) => p - q)
    const ts = [0, ...cuts, 1]
    for (let k = 1; k < ts.length; k++) {
      const mid = a + (b - a) * ((ts[k - 1] + ts[k]) / 2)
      const at = (t: number) => `${(x(i - 1) + (x(i) - x(i - 1)) * t).toFixed(2)},${y(a + (b - a) * t).toFixed(2)}`
      push(acwrStatus(mid).color, at(ts[k - 1]), at(ts[k]))
    }
  }

  const ref = { vectorEffect: 'non-scaling-stroke' as const, strokeDasharray: '3 3', stroke: 'var(--status-good)', strokeWidth: 1, opacity: 0.7 }

  return (
    <Card className={`p-3.5 ${className ?? ''}`}>
      <TileHeader title="Training load" subline="ACWR · last 7 days vs. your 4-week average" infoTerm="ACWR" className="" />
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Now</span>
        <span className="text-[21px] font-bold" style={{ color: status.color }}>
          {ratio.toFixed(2)}
        </span>
        <span className={`text-[12px] font-semibold ${status.className}`}>{status.label}</span>
      </div>

      {runs.length > 0 && (
        <>
          <div className="relative mt-2 h-[96px]">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="ACWR over the selected range">
              <rect x={0} width={w} y={y(ACWR_HIGH)} height={y(ACWR_LOW) - y(ACWR_HIGH)} fill="var(--status-good)" opacity={0.12} />
              <line x1={0} x2={w} y1={y(ACWR_HIGH)} y2={y(ACWR_HIGH)} style={ref} />
              <line x1={0} x2={w} y1={y(ACWR_LOW)} y2={y(ACWR_LOW)} style={ref} />
              {runs.map((run, i) => (
                <polyline
                  key={i}
                  points={run.pts.join(' ')}
                  fill="none"
                  stroke={run.color}
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
