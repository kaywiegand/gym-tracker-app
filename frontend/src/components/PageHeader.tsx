import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'
import { useHeaderSlot } from '@/components/AppShell'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  showThemeToggle?: boolean
  // Extra content below the title row (search, filters, scope tabs, ...) --
  // rendered in the same header slot as the title row so callers never have
  // to think about layout, just what belongs in the header (BACKLOG #50).
  children?: ReactNode
}

// Portals into AppShell's non-scrolling header slot (BACKLOG #61) instead
// of rendering sticky inside `main` -- no spacing compensation needed
// anymore, `main`'s own pt-3 is the entire gap to the first scrolled
// content. Falls back to an inline render when there's no slot (e.g. used
// outside AppShell), so the component still works standalone.
export function PageHeader({ title, subtitle, action, showThemeToggle = true, children }: PageHeaderProps) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const { title: slot } = useHeaderSlot()

  const content = (
    <div>
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
    </div>
  )

  return slot ? createPortal(content, slot) : content
}
