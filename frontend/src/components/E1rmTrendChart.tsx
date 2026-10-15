import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { ExerciseHistoryEntry } from '@/types'
import { trendLayersFor } from '@/components/TrendlineLayer'
import { MONTHS, chooseDateTicks } from '@/lib/chartTicks'

const MARGIN = { top: 12, right: 16, bottom: 56, left: 40 }

interface E1rmTrendChartProps {
  history: ExerciseHistoryEntry[]
}

// First analytics chart (CLAUDE.md §10 Stage 3, "Basis für spätere Stufen")
// -- deliberately minimal: one metric, one series, fixed metric color
// (CLAUDE.md §7). Heatmap/radar/calendar/bar charts come with Stage 4.
export function E1rmTrendChart({ history }: E1rmTrendChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Per-session dates while there is room, else one tick per month (#148).
  const { tickIndices, mode } = useMemo(
    () => chooseDateTicks(history.map((h) => h.started_at), Math.max(0, width - MARGIN.left - MARGIN.right)),
    [history, width],
  )

  const data = [
    {
      id: 'e1RM',
      data: history.map((h, i) => ({ x: i, y: Math.round(h.best_e1rm * 10) / 10 })),
    },
  ]

  return (
    <div ref={wrapRef} className="h-[200px] w-full">
      <ResponsiveLine
        data={data}
        margin={MARGIN}
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
        layers={trendLayersFor(true)}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          // Labels stand upright so neighbours don't run into each other
          // (#145); month/year once per-session dates get too tight (#148).
          tickRotation: -90,
          tickValues: tickIndices,
          format: (i) => {
            const entry = history[Number(i)]
            if (!entry) return ''
            const [y, m, d] = entry.started_at.slice(0, 10).split('-')
            return mode === 'month' ? `${MONTHS[Number(m) - 1]} ${y.slice(2)}` : `${d}.${m}.${y.slice(2)}`
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
