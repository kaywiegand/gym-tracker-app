import { useState } from 'react'
import { ResponsiveRadar } from '@nivo/radar'
import type { MuscleVolumeRegion } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'
import { Button } from '@/components/ui/button'

interface MuscleRadarProps {
  regions: MuscleVolumeRegion[]
}

type Metric = 'sets' | 'volume_kg' | 'best_e1rm'

const METRIC_LABELS: Record<Metric, string> = {
  sets: 'Sets',
  volume_kg: 'Volume',
  best_e1rm: 'e1RM',
}

// Sets and volume are additive per region (secondary ×0.5, already applied
// server-side); e1RM is a peak, never summed across exercises (CLAUDE.md
// §8) -- all three share this one radar via a metric toggle rather than
// three separate charts.
export function MuscleRadar({ regions }: MuscleRadarProps) {
  const [metric, setMetric] = useState<Metric>('sets')
  const byRegion = new Map(regions.map((r) => [r.region, r]))

  const data = Object.keys(REGION_LABELS)
    .map((region) => byRegion.get(region))
    .filter((r): r is MuscleVolumeRegion => r !== undefined)
    .map((r) => ({
      region: REGION_LABELS[r.region],
      'This week': Math.round(r.this_week[metric] * 10) / 10,
      'Last week': Math.round(r.last_week[metric] * 10) / 10,
    }))

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <Button key={m} type="button" size="sm" variant={metric === m ? 'default' : 'outline'} onClick={() => setMetric(m)}>
            {METRIC_LABELS[m]}
          </Button>
        ))}
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveRadar
          data={data}
          keys={['This week', 'Last week']}
          indexBy="region"
          margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
          colors={['var(--brand-accent)', 'var(--muted-foreground)']}
          fillOpacity={0.15}
          borderWidth={2}
          dotSize={6}
          gridLabelOffset={20}
          theme={{
            axis: { ticks: { text: { fill: 'var(--muted-foreground)', fontSize: 10 } } },
            grid: { line: { stroke: 'var(--border)' } },
          }}
        />
      </div>
    </div>
  )
}
