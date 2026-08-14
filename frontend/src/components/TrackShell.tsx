import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrackShellProps {
  title: string
  subtitle?: string
  onBack?: () => void
  children: ReactNode
}

// Full-screen variant of AppShell with no BottomNav -- matches the v3
// prototype's `inFlow` behaviour (tabbar hidden while tracking a workout).
export function TrackShell({ title, subtitle, onBack, children }: TrackShellProps) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-background sm:my-4 sm:min-h-[880px] sm:rounded-[30px] sm:shadow-2xl sm:ring-8 sm:ring-card">
      <header className="sticky top-0 z-10 flex items-center gap-2.5 bg-background px-3.5 pb-2 pt-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-[34px] shrink-0 rounded-lg"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="Back"
        >
          <ArrowLeft className="size-[18px]" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-bold tracking-tight">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</div>}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-3.5 pb-6">{children}</main>
    </div>
  )
}
