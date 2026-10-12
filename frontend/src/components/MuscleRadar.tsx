import { ResponsiveRadar } from '@nivo/radar'
import { REGION_LABELS } from '@/lib/muscleColors'

export interface MuscleRadarSeries {
  label: string
  color: string
  values: Partial<Record<string, number>>
}

interface MuscleRadarProps {
  series: MuscleRadarSeries[]
}

// Generic over N labeled series across the 6 fixed region axes -- reused
// for the Overview "this week vs. last week" comparison (2 series, caller
// picks the metric) and the Workout-scope "signature" radar (1 series).
// Metric selection (Sets/Volume/e1RM) lives with whichever caller actually
// offers a choice, not in here.
export function MuscleRadar({ series }: MuscleRadarProps) {
  const data = Object.keys(REGION_LABELS).map((region) => {
    const point: Record<string, string | number> = { region: REGION_LABELS[region] }
    for (const s of series) {
      point[s.label] = Math.round((s.values[region] ?? 0) * 10) / 10
    }
    return point
  })

  return (
    <div className="w-full">
      {/* Legend from 2 series on (CLAUDE.md §7); a single series is named by its card. */}
      {series.length >= 2 && (
        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
              {s.label}
              {/* An all-zero series collapses to the centre and looks missing. */}
              {Object.values(s.values).every((v) => !v) && ' · no training'}
            </span>
          ))}
        </div>
      )}
      <div className="h-[260px] w-full">
        <ResponsiveRadar
          data={data}
          keys={series.map((s) => s.label)}
          indexBy="region"
          margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
          colors={series.map((s) => s.color)}
          fillOpacity={0.15}
          borderWidth={2}
          dotSize={6}
          gridLabelOffset={20}
          isInteractive={false}
          theme={{
            axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
            grid: { line: { stroke: 'var(--border)' } },
          }}
        />
      </div>
    </div>
  )
}
