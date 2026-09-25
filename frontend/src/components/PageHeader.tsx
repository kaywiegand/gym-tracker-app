import { forwardRef, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'
import { StickyHeader } from '@/components/StickyHeader'

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
// flush below it without a hardcoded pixel offset. Padding-top is pt-4
// (not the header's former pt-1) because this is the topmost sticky header
// in `main` -- StickyHeader's `first` pulls it up over `main`'s own pt-3, so
// that padding now has to come from here to keep the same visual gap above
// the title (BACKLOG #58). pb-5 folds in what used to be a separate mb-3
// margin below the header, which left an unpainted gap once a second sticky
// block (DashboardStickyBar) stacked directly beneath it.
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  { title, subtitle, action, showThemeToggle = true, children },
  ref,
) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <StickyHeader ref={ref} first className="pt-4 pb-5">
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
    </StickyHeader>
  )
})
