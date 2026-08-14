import { cn } from '@/lib/utils'

interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

// shadcn has no segmented control; this is the one small custom Tailwind
// piece used for theme/mode/trigger toggles across Settings and Workouts.
export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn('flex gap-0.5 rounded-lg border border-border bg-card p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold transition-colors',
            value === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
