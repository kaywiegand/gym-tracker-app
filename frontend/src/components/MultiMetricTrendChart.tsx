import { ResponsiveLine, type PointTooltipProps } from '@nivo/line'
import type { ExerciseHistoryEntry } from '@/types'

interface MultiMetricTrendChartProps {
  history: ExerciseHistoryEntry[]
}

type MetricDatum = { x: number; y: number; raw: number; unit: string }
type MetricSeries = { id: string; data: readonly MetricDatum[] }

interface Metric {
  key: 'best_e1rm' | 'volume_kg' | 'sets_count'
  id: string
  color: string
  unit: string
  round: (v: number) => number
}

const METRICS: Metric[] = [
  { key: 'best_e1rm', id: 'e1RM', color: 'var(--metric-e1rm)', unit: 'kg', round: (v) => Math.round(v * 10) / 10 },
  { key: 'volume_kg', id: 'Volume', color: 'var(--metric-volume)', unit: 'kg', round: Math.round },
  { key: 'sets_count', id: 'Sets', color: 'var(--metric-sets)', unit: '', round: Math.round },
]

// Replaces the old e1RM-only chart + the two "e1RM now"/"Best set" KPI
// tiles (Kay's feedback: one chart with e1RM, Volume, and Sets together is
// enough). The three metrics live on wildly different scales (kg in the
// hundreds vs. a handful of sets), so each series is normalized to a
// percent-of-its-own-max for the plotted line -- what matters here is
// whether the three trends move together, not their absolute position on
// a shared axis. Real values (not the normalized ones) are shown on hover
// and can be read off the small current-value row above the chart. X-axis
// is plotted by session index rather than by date string, which also
// fixes same-day sessions (e.g. while testing) overlapping on the axis.
export function MultiMetricTrendChart({ history }: MultiMetricTrendChartProps) {
  const data: MetricSeries[] = METRICS.map((m) => {
    const values = history.map((h) => h[m.key])
    const max = Math.max(...values, 0)
    return {
      id: m.id,
      data: history.map((h, i) => ({
        x: i,
        y: max > 0 ? (h[m.key] / max) * 100 : 0,
        raw: m.round(h[m.key]),
        unit: m.unit,
      })),
    }
  })

  function renderTooltip({ point }: PointTooltipProps<MetricSeries>) {
    const i = Number(point.data.x)
    const date = history[i]?.started_at.slice(0, 10)
    return (
      <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-[12px] text-popover-foreground shadow-md">
        <div className="mb-1 font-semibold text-muted-foreground">{date}</div>
        <div className="flex items-center gap-1.5" style={{ color: point.seriesColor }}>
          <span className="font-bold">{point.seriesId}:</span>
          <span className="tabular-nums">
            {point.data.raw}
            {point.data.unit}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-1.5 flex gap-3 text-[11px]">
        {METRICS.map((m) => (
          <span key={m.id} className="flex items-center gap-1 font-semibold" style={{ color: m.color }}>
            <span className="inline-block size-[7px] rounded-full" style={{ background: m.color }} />
            {m.id}
          </span>
        ))}
      </div>
      <div className="h-[160px] w-full">
        <ResponsiveLine
          data={data}
          margin={{ top: 8, right: 12, bottom: 28, left: 12 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 100 }}
          colors={METRICS.map((m) => m.color)}
          lineWidth={2}
          pointSize={5}
          pointBorderWidth={2}
          pointBorderColor="var(--background)"
          enableGridX={false}
          enableGridY={false}
          axisLeft={null}
          axisBottom={{
            tickSize: 0,
            tickValues: history.length > 6 ? Math.min(6, history.length) : history.length,
            format: (i) => history[Number(i)]?.started_at.slice(5, 10) ?? '',
          }}
          theme={{
            axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
          }}
          tooltip={renderTooltip}
          enableArea={false}
          useMesh
        />
      </div>
    </div>
  )
}
