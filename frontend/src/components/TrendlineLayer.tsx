import type { LineCustomSvgLayerProps, LineSvgProps } from '@nivo/line'
import { linearFit, TREND_SESSIONS, visibleTrends } from '@/lib/plateau'

// Series shape of the line charts that use this: x is the session index.
type IndexedSeries = { id: string; data: { x: number; y: number }[] }

const OVERALL_STROKE = { stroke: 'var(--muted-foreground)', opacity: 0.45 }
const recentStroke = (direction: 'rising' | 'flat') => ({
  stroke: direction === 'rising' ? 'var(--status-good)' : 'var(--status-warn)',
  opacity: 0.8,
})

// Names the trendlines of a chart (#167), in their real color: the recent
// line turns orange when it stops climbing. Keeps its height without lines,
// so a tile does not jump between ranges (BACKLOG #141).
export function TrendLegend({ values, showRecent = true }: { values: number[]; showRecent?: boolean }) {
  const { overall, recent } = visibleTrends(values, showRecent)
  const items = [
    ...(overall ? [{ label: 'Overall trend', ...OVERALL_STROKE }] : []),
    ...(recent ? [{ label: `Last ${TREND_SESSIONS} sessions`, ...recentStroke(recent) }] : []),
  ]
  return (
    <div className="mb-0.5 flex h-4 items-center gap-x-4 overflow-hidden">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: item.stroke, opacity: item.opacity }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

// Custom Nivo layers: thin least-squares lines over the first series, drawn
// before 'lines' so they sit behind the data. No color from the data palette
// (CLAUDE.md §7).
//  - overall: through every point, neutral grey.
//  - recent: through the last TREND_SESSIONS points (the plateau indicator's
//    window), green while it climbs, warn while it is flat or falling.
function makeTrendlineLayer(showRecent: boolean) {
  return function TrendlineLayer({ series, yScale }: LineCustomSvgLayerProps<IndexedSeries>) {
    const points = series[0]?.data ?? []
    const { overall, recent } = visibleTrends(points.map((p) => Number(p.data.y)), showRecent)

    const fitLine = (pts: typeof points, { stroke, opacity }: { stroke: string; opacity: number }) => {
      const { slope, intercept } = linearFit(pts.map((p) => Number(p.data.y)))
      return (
        <line
          x1={pts[0].position.x}
          y1={yScale(intercept)}
          x2={pts[pts.length - 1].position.x}
          y2={yScale(intercept + slope * (pts.length - 1))}
          stroke={stroke}
          strokeOpacity={opacity}
          strokeWidth={1.25}
          pointerEvents="none"
        />
      )
    }

    return (
      <g>
        {overall && fitLine(points, OVERALL_STROKE)}
        {recent && fitLine(points.slice(-TREND_SESSIONS), recentStroke(recent))}
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
