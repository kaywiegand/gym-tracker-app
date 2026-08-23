interface ConsistencyCalendarProps {
  dates: string[]
  weeks?: number
}

function isoWeekStartUtc(d: Date): Date {
  const dayIndex = (d.getUTCDay() + 6) % 7 // 0 (Mon) .. 6 (Sun)
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - dayIndex)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

// GitHub-style activity grid (prototype's `calendar()`), computed from real
// UTC dates rather than the prototype's fake pattern -- 7 rows (Mon..Sun) ×
// `weeks` columns, one cell per calendar day.
export function ConsistencyCalendar({ dates, weeks = 18 }: ConsistencyCalendarProps) {
  const activeSet = new Set(dates)
  const gridStart = isoWeekStartUtc(new Date())
  gridStart.setUTCDate(gridStart.getUTCDate() - (weeks - 1) * 7)

  const cellSize = 13
  const gap = 3
  const w = weeks * (cellSize + gap)
  const h = 7 * (cellSize + gap)

  const cells = []
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart)
      d.setUTCDate(d.getUTCDate() + col * 7 + row)
      const iso = d.toISOString().slice(0, 10)
      cells.push({ iso, col, row, active: activeSet.has(iso) })
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w }}>
      {cells.map((c) => (
        <rect
          key={c.iso}
          x={c.col * (cellSize + gap)}
          y={c.row * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          rx={3}
          fill={c.active ? 'var(--brand-accent)' : 'var(--secondary)'}
        />
      ))}
    </svg>
  )
}
