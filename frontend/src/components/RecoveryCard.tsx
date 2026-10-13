import { Card } from '@/components/ui/card'
import { TileHeader } from '@/components/TileHeader'
import { recoveryStatus } from '@/lib/recovery'
import type { RecoveryResponse } from '@/types'

// The scale ends here; a higher share is drawn at the right edge.
const SCALE_MAX_PCT = 75

// Recovery tendency (BACKLOG #129): the share of exercises whose latest
// session fell below their own recent level.
//
// Everything about this card says "estimate", because that is what it is:
// dashed outline, an "Estimate" tag, hedged wording, and a marker drawn as a
// soft band instead of a sharp line -- as wide as one exercise more or less
// would move it.
export function RecoveryCard({ recovery }: { recovery: RecoveryResponse }) {
  const status = recoveryStatus(recovery.status)
  const known = recovery.status !== 'unknown'
  const falling = recovery.exercises.filter((e) => e.trend === 'falling')
  const pos = (pct: number) => `${(Math.min(pct, SCALE_MAX_PCT) / SCALE_MAX_PCT) * 100}%`
  // One exercise flipping moves the share by 100/total -- the band's half-width.
  const uncertaintyPct = recovery.total > 0 ? 100 / recovery.total : 0
  const bandLeft = Math.max(0, recovery.falling_share_pct - uncertaintyPct)
  const bandRight = Math.min(SCALE_MAX_PCT, recovery.falling_share_pct + uncertaintyPct)

  return (
    // Card draws its outline as a ring; swapped for a dashed border here.
    <Card className="gap-0 border border-dashed border-foreground/25 p-3.5 ring-0">
      <TileHeader
        title="Recovery"
        subline="A tendency from your recent performance — not a measurement."
        infoTerm="Recovery"
        className=""
        aside={
          <span className="rounded-full border border-dashed border-foreground/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Estimate
          </span>
        }
      />

      <div className={`mt-2 text-[17px] font-bold ${status.className}`}>{status.label}</div>

      {known ? (
        <>
          <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0" style={{ width: pos(recovery.watch_share_pct), background: 'var(--status-good)', opacity: 0.22 }} />
            <div
              className="absolute inset-y-0"
              style={{
                left: pos(recovery.watch_share_pct),
                width: `calc(${pos(recovery.deload_share_pct)} - ${pos(recovery.watch_share_pct)})`,
                background: 'var(--status-warn)',
                opacity: 0.22,
              }}
            />
            <div className="absolute inset-y-0 right-0" style={{ left: pos(recovery.deload_share_pct), background: 'var(--status-crit)', opacity: 0.22 }} />
            <div
              className="absolute inset-y-0"
              style={{
                left: pos(bandLeft),
                width: `calc(${pos(bandRight)} - ${pos(bandLeft)})`,
                background: `linear-gradient(90deg, transparent, ${status.color}, transparent)`,
              }}
            />
          </div>
          <div className="relative mt-1 h-3 text-[9.5px] text-muted-foreground">
            <span className="absolute left-0">on track</span>
            <span className="absolute" style={{ left: pos(recovery.watch_share_pct) }}>
              watch
            </span>
            <span className="absolute" style={{ left: pos(recovery.deload_share_pct) }}>
              deload
            </span>
          </div>

          <p className="mt-2 text-[12px] text-muted-foreground">
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
