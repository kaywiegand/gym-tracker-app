import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StickyHeaderProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  // True for the sticky header that sits at the very top of its scroll
  // container (AppShell's `main`, which carries its own -mt-3-cancelling
  // pt-3) -- it must pull up into that padding too, or scrolled content
  // peeks through above it once stuck (BACKLOG #58/#59). A header stacked
  // below another sticky block (e.g. DashboardStickyBar) has nothing above
  // it to cover and leaves this off.
  first?: boolean
}

// One opaque `bg-background` box per pinned/sticky header, so scrolled
// content never shows through the gaps between separate sticky pieces or
// above the topmost one (BACKLOG #58). `-mx-3.5 px-3.5` cancels + restores
// `main`'s own horizontal padding; callers whose scroll container uses a
// different side padding (the picker sheet's `px-4`) override both via
// `className`. Background always paints the element's full padding box, so
// covering a gap only ever needs the matching negative margin here -- the
// padding itself stays whatever the caller needs for its own visual spacing.
export const StickyHeader = forwardRef<HTMLDivElement, StickyHeaderProps>(function StickyHeader(
  { children, className, style, first = false },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn('sticky top-0 z-10 -mx-3.5 bg-background px-3.5', first && '-mt-3', className)}
    >
      {children}
    </div>
  )
})
