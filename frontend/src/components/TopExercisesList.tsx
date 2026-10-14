import type { TopExercise } from '@/types'
import { Card } from '@/components/ui/card'
import { TileHeader } from '@/components/TileHeader'
import { TileBody } from '@/components/TileBody'

interface TopExercisesListProps {
  exercises: TopExercise[]
  range: string
}

// What you actually train, most-used first. Ranked by sessions rather than
// sets: an exercise done every week in three sets is more central to the
// training than one done twice in twelve. The bar is a share of the top
// entry, so the list reads as a shape at a glance instead of a column of
// numbers -- one hue, because this is one magnitude, not eight categories.
// Room for the limit the Overview asks for (8). The list is a box of this
// fixed height for every range: fewer entries leave it partly empty, none
// shows the empty text inside it (BACKLOG #141).
const ROW_HEIGHT = 25
const ROW_GAP = 8
const MAX_ROWS = 8
const LIST_HEIGHT = MAX_ROWS * ROW_HEIGHT + (MAX_ROWS - 1) * ROW_GAP

export function TopExercisesList({ exercises, range }: TopExercisesListProps) {
  const empty = exercises.length === 0
  const most = empty ? 1 : exercises[0].sessions

  return (
    <Card className="p-3.5">
      <TileHeader title="Most trained" subline={empty ? 'Nothing logged in this range yet.' : `By sessions over ${range}`} className="mb-2.5" />
      <TileBody height={LIST_HEIGHT} message={empty ? 'No sessions in this period' : undefined}>
        <div className="flex flex-col gap-2">
          {exercises.slice(0, MAX_ROWS).map((e) => (
            <div key={e.exercise_id} className="h-[25px]">
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
      </TileBody>
    </Card>
  )
}
