import { ResponsiveHeatMap } from '@nivo/heatmap'
import type { MuscleVolumeRegion } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'

interface MuscleHeatmapProps {
  regions: MuscleVolumeRegion[]
}

// Data heatmap (CLAUDE.md §3 lists @nivo/heatmap explicitly), not a body
// silhouette. Rows = the 6 fixed muscle regions, columns = weeks, cell =
// weighted sets (secondary ×0.5). Single-hue sequential scale (CLAUDE.md
// §7) -- intensity, not identity, so this deliberately does NOT use the
// categorical muscle colors.
export function MuscleHeatmap({ regions }: MuscleHeatmapProps) {
  const byRegion = new Map(regions.map((r) => [r.region, r]))
  const data = Object.keys(REGION_LABELS)
    .map((region) => byRegion.get(region))
    .filter((r): r is MuscleVolumeRegion => r !== undefined)
    .map((r) => ({
      id: REGION_LABELS[r.region],
      data: r.weeks.map((w) => ({ x: w.week_start.slice(5), y: Math.round(w.sets * 10) / 10 })),
    }))

  const maxSets = Math.max(1, ...data.flatMap((d) => d.data.map((p) => p.y ?? 0)))

  return (
    <div className="h-[220px] w-full">
      <ResponsiveHeatMap
        data={data}
        margin={{ top: 24, right: 12, bottom: 20, left: 78 }}
        valueFormat=">-.1f"
        axisTop={{ tickSize: 0, tickPadding: 6, tickRotation: 0 }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        axisBottom={null}
        axisRight={null}
        colors={{ type: 'sequential', scheme: 'purples', minValue: 0, maxValue: maxSets }}
        emptyColor="var(--secondary)"
        borderRadius={3}
        borderWidth={2}
        borderColor="var(--background)"
        labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
        theme={{
          axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
          labels: { text: { fontSize: 10, fontWeight: 700 } },
        }}
      />
    </div>
  )
}
