interface ConsistencyCalendarProps {
  dates: string[]
  weeks: number
}

function isoWeekStartUtc(d: Date): Date {
  const dayIndex = (d.getUTCDay() + 6) % 7 // 0 (Mon) .. 6 (Sun)
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - dayIndex)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// GitHub-style activity grid: 7 rows (Mon..Sun) x one column per week.
//
// It used to be capped at 18 columns, so 6M/12M/All all rendered the same
// 18 weeks and the range switch appeared to do nothing -- the grid now spans
// exactly the requested range and shrinks its cells to fit instead. It also
// carried no labels at all, so nothing said whether a cell was an hour, a day
// or a week; weekday and month labels now make the unit readable.
export function ConsistencyCalendar({ dates, weeks }: ConsistencyCalendarProps) {
  const activeSet = new Set(dates)
  const gridStart = isoWeekStartUtc(new Date())
  gridStart.setUTCDate(gridStart.getUTCDate() - (weeks - 1) * 7)

  // Cells shrink with the range so a year still fits the width without
  // scrolling; below ~3px they stop being readable, so that is the floor.
  const cell = weeks <= 14 ? 13 : weeks <= 30 ? 8 : weeks <= 60 ? 5 : 3
  const gap = cell >= 8 ? 3 : cell >= 5 ? 2 : 1
  const step = cell + gap
  const labelW = cell >= 8 ? 26 : 0
  const labelH = 14

  const cells: { iso: string; col: number; row: number; active: boolean }[] = []
  const monthTicks: { col: number; label: string }[] = []
  let lastMonth = -1

  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart)
      d.setUTCDate(d.getUTCDate() + col * 7 + row)
      const iso = d.toISOString().slice(0, 10)
      cells.push({ iso, col, row, active: activeSet.has(iso) })

      if (row === 0) {
        const m = d.getUTCMonth()
        if (m !== lastMonth) {
          lastMonth = m
          // Skip a tick that would collide with its neighbour on a dense grid.
          const prev = monthTicks[monthTicks.length - 1]
          if (!prev || (col - prev.col) * step >= 26) {
            monthTicks.push({ col, label: MONTHS[m] })
          }
        }
      }
    }
  }

  const w = labelW + weeks * step
  const h = labelH + 7 * step

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w > 420 ? '100%' : w }}>
      {monthTicks.map((t) => (
        <text
          key={`${t.col}-${t.label}`}
          x={labelW + t.col * step}
          y={9}
          className="fill-muted-foreground"
          fontSize={9}
        >
          {t.label}
        </text>
      ))}

      {labelW > 0 &&
        WEEKDAYS.map((d, row) =>
          d ? (
            <text key={d} x={0} y={labelH + row * step + cell - 2} className="fill-muted-foreground" fontSize={9}>
              {d}
            </text>
          ) : null,
        )}

      {cells.map((c) => (
        <rect
          key={c.iso}
          x={labelW + c.col * step}
          y={labelH + c.row * step}
          width={cell}
          height={cell}
          rx={cell >= 8 ? 3 : 1}
          fill={c.active ? 'var(--brand-accent)' : 'var(--secondary)'}
        >
          <title>{`${c.iso}${c.active ? ' · trained' : ''}`}</title>
        </rect>
      ))}
    </svg>
  )
}
