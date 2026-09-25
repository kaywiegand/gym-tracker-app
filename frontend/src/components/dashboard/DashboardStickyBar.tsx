import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useHeaderSlot } from '@/components/AppShell'

// The dashboard's second header region -- the range switch, and on
// Workout/Exercise the selected item's header above it -- portals into
// AppShell's header slot alongside PageHeader's title/tabs (BACKLOG #61),
// rendered after them so it always sits below. `pt-3` is its own gap under
// the title block; nothing to coordinate since both live in the
// non-scrolling header now. Falls back to an inline render outside AppShell.
export function DashboardStickyBar({ children }: { children: ReactNode }) {
  const { bar: slot } = useHeaderSlot()
  const content = <div className="flex flex-col gap-3 pt-3">{children}</div>
  return slot ? createPortal(content, slot) : content
}
