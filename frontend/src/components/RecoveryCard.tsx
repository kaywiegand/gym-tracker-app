import { Card } from '@/components/ui/card'
import { TileHeader } from '@/components/TileHeader'
import { BiaBandBar, type ScaleBand } from '@/components/BiaBandBar'
import { recoveryStatus } from '@/lib/recovery'
import type { RecoveryResponse } from '@/types'

// The scale ends here; a higher share is drawn at the right edge.
const SCALE_MAX_PCT = 75

// Recovery tendency (BACKLOG #129): the share of exercises whose latest
// session fell below their own recent level.
//
// The card has to read as an estimate, because that is what it is: "estimate"
// in the title, a dashed outline, hedged wording. The scale is the banded one
// from the Body dashboard (BMI), so the two read the same (#133).
export function RecoveryCard({ recovery }: { recovery: RecoveryResponse }) {
  const status = recoveryStatus(recovery.status)
  const known = recovery.status !== 'unknown'
  const falling = recovery.exercises.filter((e) => e.trend === 'falling')
  const bands: ScaleBand[] = [
    { to: recovery.watch_share_pct, label: 'On track', tone: 'good' },
    { to: recovery.deload_share_pct, label: 'Watch', tone: 'warn' },
    { to: SCALE_MAX_PCT, label: 'Deload', tone: 'crit' },
  ]

  return (
    // Card draws its outline as a ring; swapped for a dashed border here.
    <Card className="gap-0 border border-dashed border-foreground/25 p-3.5 ring-0">
      <TileHeader
        title="Recovery estimate"
        subline="A tendency from your recent performance — not a measurement."
        infoTerm="Recovery"
        className=""
      />

      <div className={`mt-2 text-[17px] font-bold ${status.className}`}>{status.label}</div>

      {known ? (
        <>
          <BiaBandBar label="Exercises falling" value={recovery.falling_share_pct} unit="%" bands={bands} min={0} max={SCALE_MAX_PCT} />

          <p className="mt-1 text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {recovery.falling} of {recovery.total}
            </span>{' '}
            exercises below their recent level · {recovery.rising} above
          </p>

          {falling.length > 0 && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-[11.5px] text-muted-foreground">Which exercises</summary>
              <div className="mt-1 flex flex-col">
                {falling.map((e) => (
                  <div key={e.exercise_id} className="flex items-center justify-between gap-2 border-b border-border py-1 text-[12px] last:border-b-0">
                    <span className="min-w-0 truncate">{e.exercise_display_name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{e.change_pct.toFixed(1)}% e1RM</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Needs at least 5 exercises with 4 or more sessions, trained in the last 3 weeks.
        </p>
      )}

      <p className="mt-2 text-[10.5px] italic text-muted-foreground">Sleep, stress and soreness are not measured — treat this as a hint.</p>
    </Card>
  )
}
