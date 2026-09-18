import { forwardRef, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  showThemeToggle?: boolean
  // Extra sticky content below the title row (search, filters, scope tabs,
  // ...) -- kept inside the SAME sticky header rather than a second sticky
  // element, so callers never have to work out a top offset by hand
  // (BACKLOG #50).
  children?: ReactNode
}

// Forwarding the ref lets a page measure its own rendered height (see
// DashboardPage), so a second sticky block further down the page can sit
// flush below it without a hardcoded pixel offset.
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, subtitle, action, showThemeToggle = true, children },
  ref,
) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <header ref={ref} className="sticky top-0 z-10 -mx-3.5 mb-3 bg-background px-3.5 pb-2 pt-1">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-bold tracking-tight">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</div>}
        </div>
        {action}
        {showThemeToggle && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-[34px] shrink-0 rounded-lg"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </Button>
        )}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </header>
  )
})
