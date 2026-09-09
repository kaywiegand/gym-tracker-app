import { ResponsiveLine } from '@nivo/line'
import type { ExerciseHistoryEntry } from '@/types'
import type { DashboardRange } from '@/lib/dashboardRanges'

interface MetricTrendPanelsProps {
  history: ExerciseHistoryEntry[]
  range: DashboardRange
}

interface Panel {
  key: 'best_e1rm' | 'top_weight_kg' | 'volume_kg' | 'sets_count'
  label: string
  unit: string
  color: string
  decimals: number
}

// Four panels rather than four series in one frame. e1RM runs 27-96 kg while
// volume runs 600-2690 -- on a shared axis the strength line is a flat smear
// along the bottom, which is why this used to normalize everything to a
// percent of its own maximum and show no axis at all. That hid the actual
// finding: e1RM holding at ~93 while the top weight fell from 85 to 75 and
// the volume rose, i.e. more reps at less weight. Separate axes in real
// units show it; the shared x-axis keeps "do these move together" readable.
//
// e1RM and top weight share a colour on purpose: same family (strength in
// kg), and they never appear in the same frame, so nothing is ambiguous.
const PANELS: Panel[] = [
  { key: 'best_e1rm', label: 'e1RM', unit: 'kg', color: 'var(--metric-e1rm)', decimals: 1 },
  { key: 'top_weight_kg', label: 'Top weight', unit: 'kg', color: 'var(--metric-e1rm)', decimals: 1 },
  { key: 'volume_kg', label: 'Volume', unit: 'kg', color: 'var(--metric-volume)', decimals: 0 },
  { key: 'sets_count', label: 'Sets', unit: '', color: 'var(--metric-sets)', decimals: 0 },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Day for a short window, month for the middle ones, month + year once the
// range spans years -- "08-14" repeated across three years tells you nothing.
function formatTick(iso: string, range: DashboardRange): string {
  const d = new Date(iso)
  if (range === '3M') return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
  if (range === 'All') return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
  return MONTHS[d.getMonth()]
}

function stats(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { min, avg, max }
}

const fmt = (v: number, decimals: number) =>
  decimals > 0 ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v).toLocaleString()

export function MetricTrendPanels({ history, range }: MetricTrendPanelsProps) {
  // At most six labels, evenly spaced, and never the same date twice.
  const tickCount = Math.min(6, history.length)
  const tickIndices = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i * (history.length - 1)) / Math.max(1, tickCount - 1)),
  )

  return (
    <div className="flex flex-col gap-3">
      {PANELS.map((panel, panelIndex) => {
        const values = history.map((h) => h[panel.key] ?? 0)
        const { min, avg, max } = stats(values)
        const isLast = panelIndex === PANELS.length - 1
        // A flat series would collapse to a zero-height domain; give it room
        // so the line sits in the middle instead of on the frame.
        const pad = max === min ? Math.max(1, max * 0.05) : (max - min) * 0.15

        return (
          <div key={panel.key}>
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: panel.color }}>
                {panel.label}
              </span>
              <span className="text-[10.5px] tabular-nums text-muted-foreground">
                min {fmt(min, panel.decimals)} · ø {fmt(avg, panel.decimals)} · max {fmt(max, panel.decimals)}
                {panel.unit && ` ${panel.unit}`}
              </span>
            </div>
            <div style={{ height: isLast ? 82 : 62 }} className="w-full">
              <ResponsiveLine
                data={[{ id: panel.label, data: history.map((h, i) => ({ x: i, y: h[panel.key] ?? 0 })) }]}
                margin={{ top: 6, right: 8, bottom: isLast ? 26 : 6, left: 44 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: min - pad, max: max + pad }}
                colors={[panel.color]}
                lineWidth={2}
                enablePoints={false}
                enableGridX={false}
                enableGridY
                gridYValues={[min, max]}
                curve="monotoneX"
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 6,
                  tickValues: [min, max],
                  format: (v) => fmt(Number(v), panel.decimals),
                }}
                axisBottom={
                  isLast
                    ? {
                        tickSize: 0,
                        tickPadding: 8,
                        tickValues: tickIndices,
                        format: (i) => {
                          const entry = history[Number(i)]
                          return entry ? formatTick(entry.started_at, range) : ''
                        },
                      }
                    : null
                }
                theme={{
                  axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 9.5 } } },
                  grid: { line: { stroke: 'var(--border)', strokeWidth: 1 } },
                }}
                enableArea={false}
                isInteractive={false}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
