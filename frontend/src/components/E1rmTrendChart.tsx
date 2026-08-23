import { ResponsiveLine } from '@nivo/line'
import type { ExerciseHistoryEntry } from '@/types'

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
      data: history.map((h) => ({ x: h.started_at.slice(0, 10), y: Math.round(h.best_e1rm * 10) / 10 })),
    },
  ]

  return (
    <div className="h-[160px] w-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 12, right: 16, bottom: 28, left: 40 }}
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
        axisBottom={{ tickRotation: 0 }}
        axisLeft={{ tickSize: 0, tickValues: 4 }}
        theme={{
          axis: {
            ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } },
          },
          grid: { line: { stroke: 'var(--border)' } },
          tooltip: {
            container: { background: 'var(--popover)', color: 'var(--popover-foreground)', fontSize: 12 },
          },
        }}
        enableArea={false}
        useMesh
      />
    </div>
  )
}
