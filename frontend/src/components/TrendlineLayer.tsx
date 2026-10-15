import type { LineCustomSvgLayerProps, LineSvgProps } from '@nivo/line'
import { FLAT_SLOPE_PCT, linearFit, TREND_SESSIONS, trendSlopePct } from '@/lib/plateau'

// Series shape of the line charts that use this: x is the session index.
type IndexedSeries = { id: string; data: { x: number; y: number }[] }

// Custom Nivo layer: two thin least-squares lines over the first series,
// drawn before 'lines' so they sit behind the data. No legend entry, no color
// from the data palette (CLAUDE.md §7).
//  - overall: through every point, neutral grey.
//  - recent: through the last TREND_SESSIONS points only (the window the
//    plateau indicator's slope uses), colored by status: green while it
//    climbs at least FLAT_SLOPE_PCT per session, warn otherwise -- the same
//    threshold the indicator calls flat. Skipped when it would cover the
//    same points as the overall line.
function TrendlineLayer({ series, yScale }: LineCustomSvgLayerProps<IndexedSeries>) {
  const points = series[0]?.data ?? []
  if (points.length < 2) return null

  const fitLine = (pts: typeof points, stroke: string, strokeOpacity: number) => {
    const { slope, intercept } = linearFit(pts.map((p) => Number(p.data.y)))
    return (
      <line
        x1={pts[0].position.x}
        y1={yScale(intercept)}
        x2={pts[pts.length - 1].position.x}
        y2={yScale(intercept + slope * (pts.length - 1))}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={1.25}
        pointerEvents="none"
      />
    )
  }

  return (
    <g>
      {fitLine(points, 'var(--muted-foreground)', 0.45)}
      {points.length > TREND_SESSIONS &&
        fitLine(
          points.slice(-TREND_SESSIONS),
          trendSlopePct(points.map((p) => Number(p.data.y))) >= FLAT_SLOPE_PCT ? 'var(--status-good)' : 'var(--status-warn)',
          0.8,
        )}
    </g>
  )
}

// For ResponsiveLine's `layers` prop: the defaults with the trendlines placed
// right before 'lines' (behind the data line).
export const TREND_LAYERS: LineSvgProps<IndexedSeries>['layers'] = [
  'grid',
  'markers',
  'axes',
  'areas',
  'crosshair',
  TrendlineLayer,
  'lines',
  'points',
  'slices',
  'mesh',
  'legends',
]
