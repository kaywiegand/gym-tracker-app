import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'

// Mobile-first container matching the v3 prototype's phone-frame layout;
// widens into a plain full-height column above the sm breakpoint.
export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-background sm:my-4 sm:min-h-[880px] sm:rounded-[30px] sm:shadow-2xl sm:ring-8 sm:ring-card">
      <main className="flex-1 overflow-y-auto px-3.5 pb-6 pt-3">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
