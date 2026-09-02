// Semicircle gauge for the InBody fitness score, ported from the UX
// reference prototype (docs/references/workout-app-v3.html, `fitGauge()`):
// an open arc from -215° to 35°, value large in the middle, delta below.
interface FitScoreGaugeProps {
  score: number | null
  previous?: number | null
  scale?: number
}

const START_ANGLE = -215
const END_ANGLE = 35
const RADIUS = 82
const CX = 115
const CY = 112

function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r]
}

function arc(from: number, to: number, r: number): string {
  const [x0, y0] = polar(from, r)
  const [x1, y1] = polar(to, r)
  const largeArc = to - from > 180 ? 1 : 0
  return `M${x0} ${y0} A${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`
}

export function FitScoreGauge({ score, previous = null, scale = 100 }: FitScoreGaugeProps) {
  const clamped = score === null ? 0 : Math.max(0, Math.min(scale, score))
  const valueAngle = START_ANGLE + ((END_ANGLE - START_ANGLE) * clamped) / scale
  const delta = score !== null && previous !== null ? score - previous : null

  // The score is a "higher is better" quality figure, so it earns a status
  // colour (CLAUDE.md §7: green/amber/red are status only, never series).
  const stroke = score === null ? 'var(--secondary)' : clamped >= 85 ? 'var(--status-good)' : clamped >= 70 ? 'var(--status-warn)' : 'var(--status-crit)'

  return (
    <svg viewBox="0 0 230 140" className="mx-auto block w-full max-w-[240px]" role="img" aria-label={`Fitness score ${score ?? 'unknown'} of ${scale}`}>
      <path d={arc(START_ANGLE, END_ANGLE, RADIUS)} fill="none" stroke="var(--secondary)" strokeWidth={12} strokeLinecap="round" />
      {score !== null && (
        <path d={arc(START_ANGLE, valueAngle, RADIUS)} fill="none" stroke={stroke} strokeWidth={12} strokeLinecap="round" />
      )}
      <text x={CX} y={CY - 4} textAnchor="middle" className="fill-foreground" fontSize={40} fontWeight={750}>
        {score !== null ? Math.round(score) : '—'}
      </text>
      <text x={CX} y={CY + 15} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {delta === null || delta === 0
          ? `FitScore · of ${scale}`
          : `FitScore · ${delta > 0 ? '▲ +' : '▼ '}${delta.toFixed(0)} vs last`}
      </text>
    </svg>
  )
}
