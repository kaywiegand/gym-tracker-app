import { cn } from '@/lib/utils'

interface FilterChipsProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FilterChips({ options, value, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
            value === opt ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
