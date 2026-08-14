import { NavLink } from 'react-router-dom'
import { Dumbbell, ListChecks, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Three tabs only (Exercises / Workouts / Settings) -- Stage 1 has no
// tracking loop yet, so no "Training" tab with a start-workout hero
// (that's Stage 2, see the plan's scope note).
const TABS = [
  { to: '/exercises', label: 'Exercises', Icon: Dumbbell },
  { to: '/workouts', label: 'Workouts', Icon: ListChecks },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 flex gap-1 border-t border-border bg-background/92 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn('flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-[10px] font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')
          }
        >
          <Icon className="size-[21px]" strokeWidth={1.9} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
