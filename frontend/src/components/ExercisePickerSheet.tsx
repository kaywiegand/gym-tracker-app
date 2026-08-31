import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { regionLabel } from '@/lib/muscleColors'
import { groupByRegion } from '@/lib/exerciseGrouping'
import type { ExerciseListItem } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { FilterChips } from '@/components/FilterChips'

const SCOPE_FILTERS = ['My library', 'All exercises']

interface ExercisePickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (exercise: ExerciseListItem) => void
  excludeIds: string[]
}

export function ExercisePickerSheet({ open, onOpenChange, onPick, excludeIds }: ExercisePickerSheetProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('My library')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      // Same default as the Exercises screen. Without it the picker offered
      // all 873 source names while the library showed curated ones, so the
      // same exercise appeared under two different names depending on where
      // you looked at it.
      if (scope === 'My library') params.set('curated', '1')
      const qs = params.toString()
      api.get<ExerciseListItem[]>(`/exercises${qs ? `?${qs}` : ''}`).then(setExercises)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, scope, open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setScope('My library')
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
          <FilterChips className="mt-2" options={SCOPE_FILTERS} value={scope} onChange={setScope} />

          {exercises.length === 0 && (
            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              {scope === 'My library' ? 'No match in your library — try All exercises.' : 'No matches'}
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
