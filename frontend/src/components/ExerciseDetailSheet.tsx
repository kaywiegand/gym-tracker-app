import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { api } from '@/lib/api'
import { LoadError } from '@/components/LoadError'
import { refreshOfflineCache } from '@/lib/offlineCache'
import { cn } from '@/lib/utils'
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
  onWatchedChange?: (exerciseId: string, watched: boolean) => void
}

export function ExerciseDetailSheet({ exerciseId, open, onOpenChange, onDuplicated, onWatchedChange }: ExerciseDetailSheetProps) {
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [failed, setFailed] = useState(false)
  const [watchFailed, setWatchFailed] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [history, setHistory] = useState<ExerciseHistoryEntry[] | null>(null)

  useEffect(() => {
    if (!exerciseId) {
      setExercise(null)
      setHistory(null)
      setFailed(false)
      setWatchFailed(false)
      return
    }
    setFailed(false)
    setWatchFailed(false)
    api
      .get<Exercise>(`/exercises/${exerciseId}`)
      .then(setExercise)
      .catch(() => setFailed(true))
    api
      .get<ExerciseHistoryEntry[]>(`/exercises/${exerciseId}/history?limit=20`)
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [exerciseId])

  // Flips at once like any bookmark and flips back if the server says no.
  async function toggleWatched() {
    if (!exercise) return
    const watched = !exercise.is_watched
    setWatchFailed(false)
    setExercise({ ...exercise, is_watched: watched ? 1 : 0 })
    try {
      await api.put(`/exercises/${exercise.id}/watchlist`, { watched })
      onWatchedChange?.(exercise.id, watched)
      void refreshOfflineCache()
    } catch {
      setExercise({ ...exercise })
      setWatchFailed(true)
    }
  }

  const primary = exercise?.muscles.filter((m) => m.role === 'primary') ?? []
  const secondary = exercise?.muscles.filter((m) => m.role === 'secondary') ?? []
  const photo = exercise?.media[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[86%] overflow-y-auto rounded-t-2xl">
        {!exercise ? (
          <div className="p-4 text-sm text-muted-foreground">{failed ? <LoadError /> : 'Loading…'}</div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start gap-1 pr-8">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-[17px]">{exercise.display_name}</SheetTitle>
                  <p className="text-[11px] text-muted-foreground">
                    {exercise.display_subtitle}
                    {exercise.is_curated ? '' : ' · not curated yet'}
                  </p>
                  {watchFailed && <p className="mt-0.5 text-[11px] text-status-crit">Could not save. Check your connection.</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={exercise.is_watched ? 'Remove from saved' : 'Save exercise'}
                  aria-pressed={exercise.is_watched === 1}
                  onClick={toggleWatched}
                >
                  <Bookmark className={cn('size-5', exercise.is_watched && 'fill-current')} />
                </Button>
              </div>
            </SheetHeader>

            <div className="px-4">
              {/* 4:3 box, object-contain: the source images have wildly
                  different aspect ratios, and cropping to fill cut the
                  barbell (or the whole person) out of the frame. Letterboxing
                  against the card background always shows the full picture. */}
              {photo ? (
                <img
                  src={photo.path}
                  alt={exercise.display_name}
                  className="aspect-[4/3] w-full rounded-xl bg-secondary object-contain"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-secondary text-center text-[11.5px] text-muted-foreground">
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

            <div className="flex flex-col gap-2 p-4 pt-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {/* Curating edits the library entry itself -- that is the point:
                    one exercise, one name. Duplicating is for a genuinely
                    different variation, not for renaming. */}
                <Button type="button" className="flex-1" onClick={() => navigate(`/exercises/${exercise.id}/edit`)}>
                  {exercise.is_curated ? 'Edit name' : 'Curate name'}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
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
                {duplicating ? 'Duplicating…' : 'Duplicate as a new exercise'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
