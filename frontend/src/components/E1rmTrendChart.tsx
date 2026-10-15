import { ResponsiveLine } from '@nivo/line'
import type { ExerciseHistoryEntry } from '@/types'
import { TREND_LAYERS } from '@/components/TrendlineLayer'

interface E1rmTrendChartProps {
  history: ExerciseHistoryEntry[]
}

// First analytics chart (CLAUDE.md §10 Stage 3, "Basis für spätere Stufen")
// -- deliberately minimal: one metric, one series, fixed metric color
// (CLAUDE.md §7). Heatmap/radar/calendar/bar charts come with Stage 4.
export function E1rmTrendChart({ history }: E1rmTrendChartProps) {
  const data = [
    {
      id: 'e1RM',
      data: history.map((h, i) => ({ x: i, y: Math.round(h.best_e1rm * 10) / 10 })),
    },
  ]

  return (
    <div className="h-[200px] w-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 12, right: 16, bottom: 56, left: 40 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        colors={['var(--metric-e1rm)']}
        lineWidth={2}
        pointSize={5}
        pointColor="var(--metric-e1rm)"
        pointBorderWidth={2}
        pointBorderColor="var(--background)"
        enableGridX={false}
        gridYValues={4}
        layers={TREND_LAYERS}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          // Every session keeps its date, turned upright so neighbours
          // don't run into each other (#145).
          tickRotation: -90,
          format: (i) => {
            const entry = history[Number(i)]
            if (!entry) return ''
            const [y, m, d] = entry.started_at.slice(0, 10).split('-')
            return `${d}.${m}.${y.slice(2)}`
          },
        }}
        axisLeft={{ tickSize: 0, tickValues: 4 }}
        theme={{
          axis: {
            ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } },
          },
          grid: { line: { stroke: 'var(--border)' } },
        }}
        enableArea={false}
        isInteractive={false}
      />
    </div>
  )
}
