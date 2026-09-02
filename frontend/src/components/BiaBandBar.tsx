// A value on a categorical scale — same visual language as BiaRangeBar, but
// the track is divided into named bands instead of one normal range.
//
// Used for BMI, where a single "normal" band would throw away what the
// printout itself shows: the scan sheet ticks one of Underweight / Normal /
// Overweight / Obese, so the chart shows all four and where the reading falls.
export interface ScaleBand {
  /** upper bound of this band; the last band is open-ended */
  to: number
  label: string
  tone: 'good' | 'warn' | 'crit'
}

const TONE_VAR: Record<ScaleBand['tone'], string> = {
  good: 'var(--status-good)',
  warn: 'var(--status-warn)',
  crit: 'var(--status-crit)',
}

interface BiaBandBarProps {
  label: string
  value: number | null
  unit?: string
  bands: ScaleBand[]
  /** where the drawn scale starts; the last band is drawn up to `max` */
  min: number
  max: number
}

export function BiaBandBar({ label, value, unit, bands, min, max }: BiaBandBarProps) {
  const pos = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100
  const active = value === null ? null : (bands.find((b) => value < b.to) ?? bands[bands.length - 1])

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: active ? TONE_VAR[active.tone] : undefined }}>
          {value !== null ? value.toFixed(1) : '—'}
          {unit && <span className="ml-0.5 text-[10.5px] font-semibold text-muted-foreground">{unit}</span>}
        </span>
      </div>

      <div className="relative mt-1.5 h-[14px]">
        <div className="absolute inset-x-0 top-1/2 flex h-[5px] -translate-y-1/2 gap-[2px] overflow-hidden rounded-full">
          {bands.map((band, i) => {
            const from = i === 0 ? min : bands[i - 1].to
            return (
              <div
                key={band.label}
                style={{
                  width: `${pos(band.to) - pos(from)}%`,
                  background: TONE_VAR[band.tone],
                  opacity: active === band ? 0.95 : 0.28,
                }}
              />
            )
          })}
        </div>
        {value !== null && (
          <div
            className="absolute top-1/2 h-[14px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${pos(value)}%` }}
          />
        )}
      </div>

      <div className="mt-0.5 flex text-[9.5px] text-muted-foreground">
        {bands.map((band, i) => {
          const from = i === 0 ? min : bands[i - 1].to
          return (
            <span
              key={band.label}
              className="truncate text-center"
              style={{ width: `${pos(band.to) - pos(from)}%`, color: active === band ? TONE_VAR[band.tone] : undefined }}
            >
              {band.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
