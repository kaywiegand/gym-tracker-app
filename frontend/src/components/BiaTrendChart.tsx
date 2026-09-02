import { ResponsiveLine, type PointTooltipProps } from '@nivo/line'

// Weight, skeletal muscle and fat mass over time. All three are kilograms,
// so unlike the exercise chart they share one honest axis instead of being
// normalized -- the gap between them IS the story (how much of the weight is
// muscle and how much is fat).
export interface BiaTrendPoint {
  date: string
  weight: number | null
  muscle: number | null
  fat: number | null
  target: number | null
}

export type BiaTrendKey = 'weight' | 'muscle' | 'fat' | 'target'

// Plotted in separate charts rather than one: on a shared kg axis running
// from ~13 (fat) to ~80 (weight), the few kilos between weight and its target
// -- the one comparison that carries a recommendation -- collapse into a
// single line. Each chart gets an axis tight to its own series.
const SERIES: Record<BiaTrendKey, { id: string; color: string }> = {
  weight: { id: 'Weight', color: 'var(--body-weight)' },
  target: { id: 'Target', color: 'var(--muted-foreground)' },
  muscle: { id: 'Muscle', color: 'var(--body-muscle)' },
  fat: { id: 'Fat', color: 'var(--body-fat)' },
}

interface BiaTrendChartProps {
  points: BiaTrendPoint[]
  keys: BiaTrendKey[]
  height?: number
}

export function BiaTrendChart({ points, keys, height = 210 }: BiaTrendChartProps) {
  const data = keys
    .map((key) => ({
      id: SERIES[key].id,
      data: points
        .map((p, i) => ({ x: i, y: p[key], date: p.date }))
        .filter((d): d is { x: number; y: number; date: string } => d.y !== null),
    }))
    .filter((s) => s.data.length > 0)

  if (data.length === 0 || points.length < 2) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-foreground">
        {points.length === 1 ? 'Only one scan in this range — pick a longer one to see a trend.' : 'No scans in this range.'}
      </p>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={data}
        // Right margin has to clear half the last point plus its date label,
        // otherwise the newest scan -- the one that matters most -- is clipped.
        margin={{ top: 8, right: 42, bottom: 44, left: 38 }}
        xScale={{ type: 'linear', min: 0, max: Math.max(points.length - 1, 1) }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', nice: true }}
        enableArea={false}
        curve="monotoneX"
        colors={keys.filter((k) => data.some((d) => d.id === SERIES[k].id)).map((k) => SERIES[k].color)}
        lineWidth={2}
        pointSize={6}
        pointBorderWidth={2}
        pointColor={{ from: 'color' }}
        pointBorderColor={{ from: 'color' }}
        enableGridX={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          format: (v: number) => points[v]?.date.slice(2, 7) ?? '',
        }}
        axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 5 }}
        theme={{
          text: { fill: 'var(--muted-foreground)', fontSize: 10 },
          axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
          grid: { line: { stroke: 'var(--border)', strokeWidth: 1 } },
        }}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            translateY: 40,
            itemWidth: 70,
            itemHeight: 14,
            symbolSize: 8,
            symbolShape: 'circle',
            itemTextColor: 'var(--muted-foreground)',
          },
        ]}
        tooltip={({ point }: PointTooltipProps<(typeof data)[number]>) => (
          <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md">
            <div className="font-semibold">{(point.data as { date: string }).date}</div>
            <div className="text-muted-foreground">
              {point.seriesId}: {Number(point.data.y).toFixed(1)} kg
            </div>
          </div>
        )}
      />
    </div>
  )
}
