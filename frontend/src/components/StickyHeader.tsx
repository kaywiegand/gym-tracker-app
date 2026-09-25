import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StickyHeaderProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

// Only used by ExerciseSelector's `sticky` variant, pinning search/filters
// to the top of its own scroll container (the picker sheet's `SheetContent`,
// not AppShell's `main` -- that one has its own header slot now, BACKLOG
// #61). One opaque `bg-background` box so scrolled content never shows
// through the gap between it and the sheet's edge. `-mx-4 px-4` cancels +
// restores the sheet's own horizontal padding.
export const StickyHeader = forwardRef<HTMLDivElement, StickyHeaderProps>(function StickyHeader(
  { children, className, style },
  ref,
) {
  return (
    <div ref={ref} style={style} className={cn('sticky top-0 z-10 -mx-3.5 bg-background px-3.5', className)}>
      {children}
    </div>
  )
})
