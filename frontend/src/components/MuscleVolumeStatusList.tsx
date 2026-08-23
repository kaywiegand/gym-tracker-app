import type { MuscleVolumeRegion } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'
import { statusFor, STATUS_BADGE_CLASS, STATUS_LABEL } from '@/lib/muscleStatus'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MuscleVolumeStatusListProps {
  regions: MuscleVolumeRegion[]
}

// Kept as its own compact list (out of the radar/body-map) so each chart
// stays focused on one job -- this one shows the exact numbers behind the
// ampel colors the body map only shows visually.
export function MuscleVolumeStatusList({ regions }: MuscleVolumeStatusListProps) {
  const byRegion = new Map(regions.map((r) => [r.region, r]))
  const ordered = Object.keys(REGION_LABELS)
    .map((region) => byRegion.get(region))
    .filter((r): r is MuscleVolumeRegion => r !== undefined)

  return (
    <Card className="p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Volume this week (sets)
      </div>
      <div className="flex flex-col gap-1.5">
        {ordered.map((r) => {
          const sets = Math.round(r.this_week.sets * 10) / 10
          const status = statusFor(sets, r.mev, r.mav, r.mrv)
          return (
            <div key={r.region} className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{REGION_LABELS[r.region]}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">
                  {sets} <span className="text-muted-foreground/70">/ {r.mev}-{r.mav}-{r.mrv}</span>
                </span>
                <Badge className={STATUS_BADGE_CLASS[status]} variant="secondary">
                  {STATUS_LABEL[status]}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
