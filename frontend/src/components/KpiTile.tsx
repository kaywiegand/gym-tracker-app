import { Card } from '@/components/ui/card'
import { InfoButton } from '@/components/InfoButton'

interface KpiTileProps {
  label: string
  value: string
  unit?: string
  trend?: string
  trendClassName?: string
  // Two-column min/max block, replacing `trend` on the Volume/wk and
  // Sessions/wk tiles (#53/#54) -- a "min 5 245 · max 25 798 kg" subtitle
  // line was too subtle and the thousands comma read as a decimal point.
  // Values arrive pre-formatted (see lib/format); `unit` (already a prop
  // above) is reused here and shown once, on the max value only.
  minMax?: { min: string; max: string }
  sparkline: number[]
  color: string
  infoTerm?: string
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

export function KpiTile({ label, value, unit, trend, trendClassName, minMax, sparkline, color, infoTerm }: KpiTileProps) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {infoTerm && <InfoButton term={infoTerm} />}
      </div>
      <div className="mt-0.5 text-[21px] font-bold">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{unit}</span>}
      </div>
      {trend && <div className={`text-[11px] font-semibold ${trendClassName ?? 'text-muted-foreground'}`}>{trend}</div>}
      {minMax && (
        <div className="mt-1 flex gap-3">
          <div>
            <div className="text-[13px] font-semibold tabular-nums">{minMax.min}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">min</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold tabular-nums">
              {minMax.max}
              {unit && <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{unit}</span>}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">max</div>
          </div>
        </div>
      )}
      <Sparkline values={sparkline} color={color} />
    </Card>
  )
}
