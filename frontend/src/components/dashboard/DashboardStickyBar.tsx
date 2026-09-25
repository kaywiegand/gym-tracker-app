import type { ReactNode } from 'react'
import { StickyHeader } from '@/components/StickyHeader'

// The dashboard's second sticky region -- the range switch, and on
// Workout / Exercise the selected item's header above it -- sitting flush
// beneath the dashboard's own sticky title/tabs (BACKLOG #50). `top` reads
// the CSS variable DashboardPage publishes from its measured header height
// (which no longer includes a trailing margin, BACKLOG #58), so this sits
// with zero gap directly below PageHeader's stuck box instead of leaving an
// unpainted sliver scrolled content could show through.
export function DashboardStickyBar({ children }: { children: ReactNode }) {
  return (
    <StickyHeader className="flex flex-col gap-3 pt-2 pb-3" style={{ top: 'var(--dashboard-sticky-top, 0px)' }}>
      {children}
    </StickyHeader>
  )
}
