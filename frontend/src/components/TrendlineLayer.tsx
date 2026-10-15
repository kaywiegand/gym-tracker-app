import type { LineCustomSvgLayerProps, LineSvgProps } from '@nivo/line'
import { linearFit, TREND_SESSIONS } from '@/lib/plateau'

// Series shape of the line charts that use this: x is the session index.
type IndexedSeries = { id: string; data: { x: number; y: number }[] }

// Custom Nivo layers: thin least-squares lines over the first series, drawn
// before 'lines' so they sit behind the data. No legend entry, no color from
// the data palette (CLAUDE.md §7).
//  - overall: through every point, neutral grey.
//  - recent: through the last TREND_SESSIONS points (the plateau indicator's
//    window), green while it climbs, warn while it is flat or falling.
// A chart holding no more than TREND_SESSIONS points only gets the recent,
// colored line -- it is no long-term trend (#151). `showRecent: false` drops
// the recent line on long ranges (12M, All), where six sessions are a sliver.
function makeTrendlineLayer(showRecent: boolean) {
  return function TrendlineLayer({ series, yScale }: LineCustomSvgLayerProps<IndexedSeries>) {
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
    const recentLine = () => {
      const recent = points.slice(-TREND_SESSIONS)
      const rising = linearFit(recent.map((p) => Number(p.data.y))).slope > 0
      return fitLine(recent, rising ? 'var(--status-good)' : 'var(--status-warn)', 0.8)
    }

    if (points.length <= TREND_SESSIONS) return <g>{recentLine()}</g>
    return (
      <g>
        {fitLine(points, 'var(--muted-foreground)', 0.45)}
        {showRecent && recentLine()}
      </g>
    )
  }
}

// For ResponsiveLine's `layers` prop: the defaults with the trendlines placed
// right before 'lines' (behind the data line).
function trendLayers(showRecent = true): LineSvgProps<IndexedSeries>['layers'] {
  return [
    'grid',
    'markers',
    'axes',
    'areas',
    'crosshair',
    makeTrendlineLayer(showRecent),
    'lines',
    'points',
    'slices',
    'mesh',
    'legends',
  ]
}

const DEFAULT_TREND_LAYERS = trendLayers(true)
const OVERALL_ONLY_TREND_LAYERS = trendLayers(false)
export function trendLayersFor(showRecent: boolean) {
  return showRecent ? DEFAULT_TREND_LAYERS : OVERALL_ONLY_TREND_LAYERS
}
