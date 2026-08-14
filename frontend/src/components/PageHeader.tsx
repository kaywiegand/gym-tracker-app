import type { ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  showThemeToggle?: boolean
}

export function PageHeader({ title, subtitle, action, showThemeToggle = true }: PageHeaderProps) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <header className="sticky top-0 z-10 -mx-3.5 mb-3 flex items-center gap-2.5 bg-background px-3.5 pb-2 pt-1">
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
    </header>
  )
}
