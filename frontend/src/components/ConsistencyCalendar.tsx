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

const WEEKDAY_LABEL = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Activity grid: 7 rows (Mon..Sun) x one column per week, running left to
// right.
//
// It used to be capped at 18 columns, so 6M, 12M and All all rendered the
// same 18 weeks and the range switch appeared to do nothing -- it now spans
// exactly the requested range and shrinks its cells to fit. It also carried
// no labels at all, so nothing said whether a cell was an hour, a day or a
// week; weekday and month labels make the unit readable.
export function ConsistencyCalendar({ dates, weeks }: ConsistencyCalendarProps) {
  const active = new Set(dates)
  const start = isoWeekStartUtc(new Date())
  start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7)

  // Cells shrink with the range so a year still fits the width without
  // scrolling; below ~3px they stop being readable, so that is the floor.
  const cell = weeks <= 14 ? 13 : weeks <= 30 ? 8 : weeks <= 60 ? 5 : 3
  const gap = cell >= 8 ? 3 : cell >= 5 ? 2 : 1
  const step = cell + gap
  const labelW = cell >= 8 ? 26 : 0
  const headH = 14

  const cells: { iso: string; week: number; day: number; active: boolean }[] = []
  const monthTicks: { week: number; label: string }[] = []
  let lastMonthKey = ''

  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + week * 7 + day)
      const iso = d.toISOString().slice(0, 10)
      cells.push({ iso, week, day, active: active.has(iso) })

      if (day !== 0) continue
      // Keyed by year AND month: a 12-month range spans ~13 month boundaries,
      // so the same month name turns up at both ends.
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      if (key === lastMonthKey) continue
      lastMonthKey = key
      const prev = monthTicks[monthTicks.length - 1]
      if (!prev || (week - prev.week) * step >= 26) {
        monthTicks.push({ week, label: MONTHS[d.getUTCMonth()] })
      }
    }
  }

  const w = labelW + weeks * step
  const h = headH + 7 * step

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w > 420 ? '100%' : w }}>
      {monthTicks.map((t) => (
        <text key={`${t.week}-${t.label}`} x={labelW + t.week * step} y={9} className="fill-muted-foreground" fontSize={9}>
          {t.label}
        </text>
      ))}

      {labelW > 0 &&
        WEEKDAY_LABEL.map((d, row) =>
          d ? (
            <text key={d} x={0} y={headH + row * step + cell - 2} className="fill-muted-foreground" fontSize={9}>
              {d}
            </text>
          ) : null,
        )}

      {cells.map((c) => (
        <rect
          key={c.iso}
          x={labelW + c.week * step}
          y={headH + c.day * step}
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
