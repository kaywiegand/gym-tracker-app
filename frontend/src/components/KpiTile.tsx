import { Card } from '@/components/ui/card'

interface KpiTileProps {
  label: string
  value: string
  unit?: string
  trend?: string
  trendClassName?: string
  sparkline: number[]
  color: string
}

// Hand-rolled sparkline (viewBox-scaled polyline) rather than pulling in
// another Nivo package for a single tiny line -- same principle as the
// prototype's own `spark()` helper. Same fixed metric color everywhere the
// tile appears (CLAUDE.md §7).
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 100
  const h = 26
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1)
  const y = (v: number) => h - pad - (max === min ? 0.5 : (v - min) / (max - min)) * (h - 2 * pad)
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1.5 h-[26px] w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.length > 0 && <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.6} fill={color} />}
    </svg>
  )
}

export function KpiTile({ label, value, unit, trend, trendClassName, sparkline, color }: KpiTileProps) {
  return (
    <Card className="p-3">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[21px] font-bold">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{unit}</span>}
      </div>
      {trend && <div className={`text-[11px] font-semibold ${trendClassName ?? 'text-muted-foreground'}`}>{trend}</div>}
      <Sparkline values={sparkline} color={color} />
    </Card>
  )
}
