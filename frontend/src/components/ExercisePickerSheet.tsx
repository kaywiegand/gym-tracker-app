import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { regionLabel } from '@/lib/muscleColors'
import { groupByRegion } from '@/lib/exerciseGrouping'
import type { ExerciseListItem } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'

interface ExercisePickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (exercise: ExerciseListItem) => void
  excludeIds: string[]
}

export function ExercisePickerSheet({ open, onOpenChange, onPick, excludeIds }: ExercisePickerSheetProps) {
  const [query, setQuery] = useState('')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])
  // A failed request used to land in the same empty list as a genuine miss,
  // so a dropped connection or an expired session looked like the exercise
  // was not in the library at all.
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open) return
    // Responses can arrive out of order on a bad connection. Only the latest
    // request may touch the list -- a slow failure from an older keystroke
    // must not wipe the results of a newer one.
    let current = true
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const qs = params.toString()
      api
        .get<ExerciseListItem[]>(`/exercises${qs ? `?${qs}` : ''}`)
        .then((rows) => {
          if (!current) return
          setExercises(rows)
          setError(null)
        })
        .catch((err) => {
          if (!current) return
          setExercises([])
          setError(err instanceof Error ? err.message : 'Request failed')
        })
    }, 200)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query, open, reloadKey])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setError(null)
    }
  }, [open])

  const groups = groupByRegion(exercises.filter((e) => !excludeIds.includes(e.id)))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[86%] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Choose exercise</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />

          {error !== null && (
            <div className="mt-6 text-center text-[12px] text-status-crit">
              <p>Could not load the library: {error}</p>
              <button
                type="button"
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[12px] text-foreground"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {error === null && exercises.length === 0 && (
            <p className="mt-6 text-center text-[12px] text-muted-foreground">No matches</p>
          )}

          {/* Exercises already in this workout are filtered out of the list.
              Saying so beats an unexplained gap where the user knows an
              exercise should be. */}
          {error === null && exercises.length > 0 && groups.length === 0 && (
            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              Every match is already in this workout.
            </p>
          )}

          {groups.map((group) => (
            <div key={group.region}>
              <div className="mt-4 mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {regionLabel(group.region)}
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left"
                    onClick={() => onPick(item)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{item.display_name}</span>
                      <span className="block truncate text-[10.5px] text-muted-foreground">{item.display_subtitle}</span>
                    </span>
                    <span className="text-muted-foreground">›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
