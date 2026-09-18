import type { ExerciseListItem } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ExerciseSelector } from '@/components/ExerciseSelector'

interface ExercisePickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (exercise: ExerciseListItem) => void
  excludeIds: string[]
}

// The workout editor's picker is the shared selector in a sheet (BACKLOG #40).
// Mounted only while open, so every opening starts from a clean search and
// nothing is fetched in the background.
export function ExercisePickerSheet({ open, onOpenChange, onPick, excludeIds }: ExercisePickerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[86%] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Choose exercise</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">{open && <ExerciseSelector onSelect={onPick} excludeIds={excludeIds} />}</div>
      </SheetContent>
    </Sheet>
  )
}
