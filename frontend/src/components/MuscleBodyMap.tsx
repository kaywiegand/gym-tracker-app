import type { MuscleVolumeRegion } from '@/types'
import { statusFor, STATUS_FILL_VAR } from '@/lib/muscleStatus'
import { BACK_FIGURE, FRONT_FIGURE, type BodyFigure } from '@/components/bodyPaths'

interface MuscleBodyMapProps {
  regions: MuscleVolumeRegion[]
}

// Front/back body heat map, drawn from the anatomical figures in
// src/components/bodyPaths.ts. Each path carries one of the app's six
// regions -- the same taxonomy used by the MEV/MAV/MRV table, the radar and
// the badges -- and is filled with that region's MEV/MAV/MRV status colour.
// Head, hands and feet carry no region and stay neutral.
export function MuscleBodyMap({ regions }: MuscleBodyMapProps) {
  const byRegion = new Map(regions.map((r) => [r.region, r]))

  const fill = (region: string | null): string => {
    if (region === null) return 'var(--secondary)'
    const r = byRegion.get(region)
    if (!r) return 'var(--secondary)'
    return STATUS_FILL_VAR[statusFor(r.this_week.sets, r.mev, r.mav, r.mrv)]
  }

  const figure = (f: BodyFigure, key: string) => (
    <svg viewBox={f.viewBox} className="h-[190px] w-auto" key={key}>
      {/* Hairline in the page background separates neighbouring muscles the
          way the source drawing's outline did, without carrying its colour. */}
      <g transform={f.transform} stroke="var(--background)" strokeWidth={2} strokeLinejoin="round">
        {f.paths.map((p, i) => (
          <path key={i} d={p.d} fill={fill(p.region)} />
        ))}
      </g>
    </svg>
  )

  return (
    <div className="flex justify-center gap-3">
      {figure(FRONT_FIGURE, 'front')}
      {figure(BACK_FIGURE, 'back')}
    </div>
  )
}
