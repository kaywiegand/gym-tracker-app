import type { MuscleVolumeRegion } from '@/types'
import { statusFor, STATUS_FILL_VAR } from '@/lib/muscleStatus'

interface MuscleBodyMapProps {
  regions: MuscleVolumeRegion[]
}

// Front/back body silhouette -- SVG paths carried over 1:1 from the UX
// reference prototype (docs/references/workout-app-v3.html, `bodyHeat()`).
// Only the fill lookup changed: the prototype colors 11 fine-grained zones,
// this maps down to the app's 6 fixed regions (the only taxonomy used
// everywhere else -- MEV/MAV/MRV table, radar, badges) rather than
// introducing a second, finer muscle breakdown just for this one view.
export function MuscleBodyMap({ regions }: MuscleBodyMapProps) {
  const byRegion = new Map(regions.map((r) => [r.region, r]))
  const fill = (region: string): string => {
    const r = byRegion.get(region)
    if (!r) return 'var(--secondary)'
    return STATUS_FILL_VAR[statusFor(r.this_week.sets, r.mev, r.mav, r.mrv)]
  }

  const figure = (back: boolean) => (
    <svg viewBox="0 0 90 180" className="h-[170px] w-auto" key={back ? 'back' : 'front'}>
      <g stroke="var(--background)" strokeWidth={1.1}>
        <ellipse cx={45} cy={12} rx={8} ry={9} fill="var(--secondary)" />
        {back ? (
          <>
            <path d="M31 28h28v26l-14 6-14-6z" fill={fill('back')} />
            <rect x={18} y={39} width={8} height={22} rx={4} fill={fill('arms')} />
            <rect x={64} y={39} width={8} height={22} rx={4} fill={fill('arms')} />
            <rect x={33} y={62} width={24} height={15} rx={4} fill={fill('legs')} />
            <path d="M32 78h26v34h-11v-24h-4v24h-11z" fill={fill('legs')} />
          </>
        ) : (
          <>
            <path d="M29 28h32v9h-32z" fill={fill('chest')} />
            <ellipse cx={25} cy={32} rx={7} ry={8} fill={fill('shoulders')} />
            <ellipse cx={65} cy={32} rx={7} ry={8} fill={fill('shoulders')} />
            <rect x={34} y={39} width={22} height={15} rx={3} fill={fill('core')} />
            <rect x={18} y={39} width={8} height={22} rx={4} fill={fill('arms')} />
            <rect x={64} y={39} width={8} height={22} rx={4} fill={fill('arms')} />
            <path d="M31 56h28v36h-12v-25h-4v25h-12z" fill={fill('legs')} />
          </>
        )}
        <rect x={35} y={128} width={8} height={20} rx={4} fill={fill('legs')} />
        <rect x={47} y={128} width={8} height={20} rx={4} fill={fill('legs')} />
      </g>
    </svg>
  )

  return (
    <div className="flex justify-center gap-3">
      {figure(false)}
      {figure(true)}
    </div>
  )
}
