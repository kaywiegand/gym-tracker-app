import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { InfoButton } from '@/components/InfoButton'

interface KpiTileProps {
  label: string
  value: string
  unit?: string
  trend?: string
  trendClassName?: string
  // Min/max of the `chart` series, written at its dashed reference lines
  // (#113). Values arrive pre-formatted (see lib/format).
  minMax?: { min: string; max: string }
  // Optional: tiles whose number says it all (Workout view, #86) omit it.
  sparkline?: number[]
  // Line chart with dashed min/max reference lines instead of the sparkline
  // (Overview tiles, BACKLOG #83). One value per point, oldest first.
  chart?: number[]
  color: string
  infoTerm?: string
  // Secondary figure at the right end of the value row (Overview:
  // Sessions/wk inside the Volume/session tile, #89/#113).
  aside?: ReactNode
  // Small tag after the big number, e.g. "avg" when it is an average.
  valueTag?: string
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

// Trend line with the series' min and max as thin dashed reference lines.
// Single color, no status -- the line is data (CLAUDE.md §7). Fixed aspect
// ratio; non-scaling strokes keep the lines thin at any tile width.
function MiniLineChart({ values, color, labels }: { values: number[]; color: string; labels?: { min: string; max: string } }) {
  const w = 100
  const h = 36
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1)
  const y = (v: number) => h - pad - (max === min ? 0.5 : (v - min) / (max - min)) * (h - 2 * pad)
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const refStyle = { stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6, vectorEffect: 'non-scaling-stroke' as const }

  // Labels are HTML beside the SVG so the text keeps its size and does not
  // cover the end of the line (#113).
  const labelClass = 'absolute right-0 -translate-y-1/2 text-[9.5px] tabular-nums text-muted-foreground'
  const labelled = labels !== undefined && max !== min

  return (
    <div className={`relative mt-2 ${labelled ? 'pr-[4.25rem]' : ''}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="Trend with min and max">
        {max !== min && (
          <>
            <line x1={0} x2={w} y1={y(max)} y2={y(max)} style={refStyle} />
            <line x1={0} x2={w} y1={y(min)} y2={y(min)} style={refStyle} />
          </>
        )}
        {values.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {labelled && (
        <>
          <span className={labelClass} style={{ top: `${(y(max) / h) * 100}%` }}>
            max {labels.max}
          </span>
          <span className={labelClass} style={{ top: `${(y(min) / h) * 100}%` }}>
            min {labels.min}
          </span>
        </>
      )}
    </div>
  )
}

export function KpiTile({ label, value, unit, trend, trendClassName, minMax, sparkline, chart, color, infoTerm, aside, valueTag }: KpiTileProps) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {infoTerm && <InfoButton term={infoTerm} />}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <div className="text-[21px] font-bold">
          {value}
          {unit && <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{unit}</span>}
          {valueTag && <span className="ml-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{valueTag}</span>}
        </div>
        {aside}
      </div>
      {trend && <div className={`text-[11px] font-semibold ${trendClassName ?? 'text-muted-foreground'}`}>{trend}</div>}
      {chart && chart.length > 0 && <MiniLineChart values={chart} color={color} labels={minMax} />}
      {!chart && sparkline && <Sparkline values={sparkline} color={color} />}
    </Card>
  )
}
