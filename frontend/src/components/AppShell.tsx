import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'

// The pinned header used to be `position: sticky` inside `main`'s own
// scroll container. On iOS Safari a sticky element inside an
// `overflow-y-auto` box lags and bounces during momentum/rubber-band
// scrolling, so scrolled content visibly flashes through above it
// (BACKLOG #61). Fix: the header isn't part of the scroller at all -- it's
// a sibling element that sits above `main` and never moves. Pages reach it
// through this context instead of rendering their header inline, so it
// still reads as "the page's header" from the call site.
interface HeaderSlots {
  title: HTMLDivElement | null
  bar: HTMLDivElement | null
}

const HeaderSlotContext = createContext<HeaderSlots>({ title: null, bar: null })

export function useHeaderSlot() {
  return useContext(HeaderSlotContext)
}

// The wrapper is capped at exactly the viewport height (h-dvh, not
// min-h-dvh) and `main` carries min-h-0 alongside flex-1 -- without both,
// flex items refuse to shrink below their content's natural height, so the
// wrapper just grew past the viewport and the WHOLE PAGE scrolled instead
// of `main` internally.
export function AppShell() {
  const [title, setTitle] = useState<HTMLDivElement | null>(null)
  const [bar, setBar] = useState<HTMLDivElement | null>(null)

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[460px] flex-col bg-background sm:my-4 sm:h-[880px] sm:rounded-[30px] sm:shadow-2xl sm:ring-8 sm:ring-card">
      {/* Never scrolls: opaque, sits above `main`, horizontal padding
          matches `main`'s own px-3.5. PageHeader portals its title/tabs
          into the first slot, DashboardStickyBar (when present) portals
          its range switch etc. into the second -- each slot's own content
          carries whatever spacing it needs; an empty slot is a childless
          div and contributes nothing. */}
      <div className="shrink-0 bg-background px-3.5 pt-4">
        <div ref={setTitle} />
        <div ref={setBar} />
      </div>
      <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-6 pt-3">
        <HeaderSlotContext.Provider value={{ title, bar }}>
          <Outlet />
        </HeaderSlotContext.Provider>
      </main>
      <BottomNav />
    </div>
  )
}
