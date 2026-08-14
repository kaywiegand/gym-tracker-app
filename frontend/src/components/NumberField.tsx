import { cn } from '@/lib/utils'

interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
  unit?: string
  step?: number
  min?: number
  width?: string
  className?: string
  'aria-label'?: string
}

// The one tap-to-type number component (CLAUDE.md §11), reused for rep
// ranges, increment, rest seconds, and planned sets.
export function NumberField({
  value,
  onChange,
  onBlur,
  unit,
  step = 1,
  min,
  width = '4.25rem',
  className,
  ...rest
}: NumberFieldProps) {
  return (
    <div
      className={cn('inline-flex items-center overflow-hidden rounded-md border border-border bg-secondary', className)}
      style={{ width }}
    >
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value.replace(',', '.'))
          onChange(Number.isNaN(parsed) ? 0 : parsed)
        }}
        onBlur={onBlur}
        className="w-full bg-transparent px-2 py-2 text-center text-[15px] font-bold tabular-nums outline-none focus:bg-brand-accent/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...rest}
      />
      {unit && <span className="pr-2 text-[10px] font-semibold text-muted-foreground">{unit}</span>}
    </div>
  )
}
