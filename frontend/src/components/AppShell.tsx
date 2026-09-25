import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'

// Mobile-first container matching the v3 prototype's phone-frame layout;
// widens into a plain full-height column above the sm breakpoint.
//
// The wrapper is capped at exactly the viewport height (h-dvh, not
// min-h-dvh) and `main` carries min-h-0 alongside flex-1 -- without both,
// flex items refuse to shrink below their content's natural height, so the
// wrapper just grew past the viewport and the WHOLE PAGE scrolled instead
// of `main` internally. That silently broke every `position: sticky` header
// nested in `main` (its containing block never actually scrolls, so it
// never sticks) even though BottomNav, sitting outside `main`, kept working
// by sticking to the real page scroll.
export function AppShell() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[460px] flex-col bg-background sm:my-4 sm:h-[880px] sm:rounded-[30px] sm:shadow-2xl sm:ring-8 sm:ring-card">
      <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-6 pt-3">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
