import type { MuscleVolumeRegion } from '@/types'
import { REGION_LABELS } from '@/lib/muscleColors'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MuscleVolumeStatusListProps {
  regions: MuscleVolumeRegion[]
}

// Traffic-light read of this week's sets against MEV/MAV/MRV (CLAUDE.md §7
// governance + §8 "Bewertung an MEV/MAV/MRV"): under MEV = not enough yet,
// MEV-MAV = optimal growth zone, MAV-MRV = approaching the limit, over MRV =
// overreaching risk. Its own compact list -- kept out of the radar/heatmap
// so each chart stays focused on one job.
function statusFor(sets: number, mev: number, mav: number, mrv: number): { label: string; className: string } {
  if (sets < mev) return { label: 'Below MEV', className: 'bg-status-warn/15 text-status-warn' }
  if (sets <= mav) return { label: 'Optimal', className: 'bg-status-good/15 text-status-good' }
  if (sets <= mrv) return { label: 'Near limit', className: 'bg-status-warn/15 text-status-warn' }
  return { label: 'Over MRV', className: 'bg-status-crit/15 text-status-crit' }
}

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
                <Badge className={status.className} variant="secondary">
                  {status.label}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
