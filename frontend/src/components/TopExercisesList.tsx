import type { TopExercise } from '@/types'
import { Card } from '@/components/ui/card'

interface TopExercisesListProps {
  exercises: TopExercise[]
  range: string
}

// What you actually train, most-used first. Ranked by sessions rather than
// sets: an exercise done every week in three sets is more central to the
// training than one done twice in twelve. The bar is a share of the top
// entry, so the list reads as a shape at a glance instead of a column of
// numbers -- one hue, because this is one magnitude, not eight categories.
export function TopExercisesList({ exercises, range }: TopExercisesListProps) {
  if (exercises.length === 0) {
    return (
      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Most trained</div>
        <p className="text-[12px] text-muted-foreground">Nothing logged in this range yet.</p>
      </Card>
    )
  }

  const most = exercises[0].sessions

  return (
    <Card className="p-3.5">
      <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Most trained</div>
      <p className="mb-2.5 text-[10.5px] text-muted-foreground">by sessions over {range}</p>
      <div className="flex flex-col gap-2">
        {exercises.map((e) => (
          <div key={e.exercise_id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[12.5px] font-semibold">{e.exercise_display_name}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {e.sessions}× · {e.sets_count} sets
              </span>
            </div>
            <div className="mt-1 h-[3px] w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(4, (e.sessions / most) * 100)}%`, background: 'var(--brand-accent)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
