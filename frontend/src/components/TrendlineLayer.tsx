import type { LineCustomSvgLayerProps, LineSvgProps } from '@nivo/line'
import { linearFit } from '@/lib/plateau'

// Series shape of the line charts that use this: x is the session index.
type IndexedSeries = { id: string; data: { x: number; y: number }[] }

// Custom Nivo layer: a thin neutral least-squares line through every point of
// the first series, drawn before 'lines' so it sits behind the data. No
// legend entry, no color from the data palette (CLAUDE.md §7).
function TrendlineLayer({ series, yScale }: LineCustomSvgLayerProps<IndexedSeries>) {
  const points = series[0]?.data ?? []
  if (points.length < 2) return null
  const { slope, intercept } = linearFit(points.map((p) => Number(p.data.y)))
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <line
      x1={first.position.x}
      y1={yScale(intercept)}
      x2={last.position.x}
      y2={yScale(intercept + slope * (points.length - 1))}
      stroke="var(--muted-foreground)"
      strokeOpacity={0.45}
      strokeWidth={1.25}
      pointerEvents="none"
    />
  )
}

// For ResponsiveLine's `layers` prop: the defaults with the trendline in front
// of 'lines'.
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
