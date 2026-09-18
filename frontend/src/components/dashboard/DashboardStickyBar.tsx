import type { ReactNode } from 'react'

// The dashboard's second sticky region -- the range switch, and on
// Workout / Exercise the selected item's header above it -- sitting flush
// beneath the dashboard's own sticky title/tabs (BACKLOG #50). `top` reads
// the CSS variable DashboardPage publishes from its measured header height,
// so this never has to hardcode a pixel offset that would drift if the
// title row's content or padding changes.
export function DashboardStickyBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky z-10 -mx-3.5 flex flex-col gap-3 bg-background px-3.5 pt-2 pb-3"
      style={{ top: 'var(--dashboard-sticky-top, 0px)' }}
    >
      {children}
    </div>
  )
}
