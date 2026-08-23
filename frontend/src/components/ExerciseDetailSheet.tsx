import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { regionLabel, REGION_BADGE_CLASS } from '@/lib/muscleColors'
import type { Exercise, ExerciseHistoryEntry } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { E1rmTrendChart } from '@/components/E1rmTrendChart'

interface ExerciseDetailSheetProps {
  exerciseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDuplicated: (detail: Exercise) => void
}

export function ExerciseDetailSheet({ exerciseId, open, onOpenChange, onDuplicated }: ExerciseDetailSheetProps) {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [history, setHistory] = useState<ExerciseHistoryEntry[] | null>(null)

  useEffect(() => {
    if (!exerciseId) {
      setExercise(null)
      setHistory(null)
      return
    }
    api.get<Exercise>(`/exercises/${exerciseId}`).then(setExercise)
    api
      .get<ExerciseHistoryEntry[]>(`/exercises/${exerciseId}/history?limit=20`)
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [exerciseId])

  const primary = exercise?.muscles.filter((m) => m.role === 'primary') ?? []
  const secondary = exercise?.muscles.filter((m) => m.role === 'secondary') ?? []
  const photo = exercise?.media[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[86%] overflow-y-auto rounded-t-2xl">
        {!exercise ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-[17px]">{exercise.name}</SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                {[primary[0]?.name_en, exercise.movement, exercise.equipment].filter(Boolean).join(' · ')}
              </p>
            </SheetHeader>

            <div className="px-4">
              {photo ? (
                <img src={photo.path} alt={exercise.name} className="h-[140px] w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-[120px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary text-center text-[11.5px] text-muted-foreground">
                  No photo on file
                </div>
              )}

              <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Muscles</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {primary.map((m) => (
                  <Badge key={m.muscle_id} className={REGION_BADGE_CLASS[m.region] ?? ''} variant="secondary">
                    ● {m.name_en} · primary
                  </Badge>
                ))}
                {secondary.map((m) => (
                  <Badge key={m.muscle_id} variant="outline">
                    ○ {m.name_en} ×{m.weight}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Progress (e1RM)</div>
              {history && history.length >= 2 ? (
                <E1rmTrendChart history={history} />
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">Track this exercise a few times to see your progress trend.</p>
              )}

              <div className="my-4 h-px bg-border" />

              <div className="flex items-center justify-between">
                <span className="text-[13px] text-foreground/80">Mechanic</span>
                <Badge variant="outline">{exercise.mechanic ?? '—'}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[13px] text-foreground/80">Region</span>
                <Badge variant="outline">{regionLabel(primary[0]?.region ?? null)}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[13px] text-foreground/80">Increment</span>
                <Badge variant="outline">
                  {exercise.default_increment_kg !== null ? `+${exercise.default_increment_kg} kg` : 'uses default'}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 p-4 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={duplicating}
                onClick={async () => {
                  setDuplicating(true)
                  try {
                    onDuplicated(exercise)
                  } finally {
                    setDuplicating(false)
                  }
                }}
              >
                {duplicating ? 'Duplicating…' : 'Duplicate & edit'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
