import { addDays, COMPARE_COLORS, localIso, parseIso } from '@/lib/dashboardRanges'

interface ConsistencyCalendarProps {
  dates: string[]
  // Length of the window in whole weeks. No previous-period comparison here
  // (BACKLOG #88): the calendar only shows the selected range, but never
  // less than MIN_WEEKS -- a calendar of one or two weeks says nothing.
  weeks: number
}

const MIN_WEEKS = 4

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Activity grid: one column per week, running left to right, ending today.
//
// Columns are rolling 7-day blocks (the dashboard's whole-week windows), not
// Monday-aligned calendar weeks: a window then consists of complete columns
// and the last cell is always today. Consequently every row is one fixed weekday -- the rows are
// labelled with the weekday they stand for, starting at the first column's
// weekday.
//
// Cells shrink with the number of columns so a year still fits without
// scrolling; below ~3px they stop being
// readable, so that is the floor. With one or two columns (7D/14D) cells are
// large and carry their day of month.
export function ConsistencyCalendar({ dates, weeks }: ConsistencyCalendarProps) {
  const active = new Set(dates)
  const columns = Math.max(weeks, MIN_WEEKS)
  const today = localIso(new Date())
  const start = addDays(today, -(columns * 7 - 1))
  const startDate = parseIso(start)
  const firstWeekday = (startDate.getDay() + 6) % 7 // 0 = Mon

  const big = columns <= 4
  const cell = big ? 24 : columns <= 14 ? 13 : columns <= 30 ? 8 : columns <= 60 ? 5 : 3
  const gap = cell >= 8 ? 3 : cell >= 5 ? 2 : 1
  const step = cell + gap
  const labelW = cell >= 8 ? 26 : 0
  const headH = 14
  const colX = (col: number) => labelW + col * step

  const cells: { iso: string; day: number; col: number; active: boolean; dom: number }[] = []
  const monthTicks: { x: number; label: string }[] = []
  let lastMonthKey = ''
  let lastTickX = -Infinity

  for (let col = 0; col < columns; col++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + col * 7 + day)
      const iso = localIso(d)
      cells.push({ iso, day, col, active: active.has(iso), dom: d.getDate() })
    }
    const first = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + col * 7)
    // Keyed by year AND month: a 12-month range spans ~13 month boundaries,
    // so the same month name turns up at both ends.
    const key = `${first.getFullYear()}-${first.getMonth()}`
    if (key === lastMonthKey) continue
    lastMonthKey = key
    if (colX(col) - lastTickX >= 26) {
      monthTicks.push({ x: colX(col), label: MONTHS[first.getMonth()] })
      lastTickX = colX(col)
    }
  }

  const w = colX(columns - 1) + cell
  const h = headH + 7 * step - gap

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w > 420 ? '100%' : Math.max(w, 160) }}>
        {monthTicks.map((t) => (
          <text key={`${t.x}-${t.label}`} x={t.x} y={9} className="fill-muted-foreground" fontSize={9}>
            {t.label}
          </text>
        ))}

        {labelW > 0 &&
          [0, 2, 4, 6].map((row) => (
            <text key={row} x={0} y={headH + row * step + cell - (big ? 8 : 2)} className="fill-muted-foreground" fontSize={9}>
              {WEEKDAYS[(firstWeekday + row) % 7]}
            </text>
          ))}

        {cells.map((c) => (
          <g key={c.iso}>
            <rect
              x={colX(c.col)}
              y={headH + c.day * step}
              width={cell}
              height={cell}
              rx={cell >= 8 ? 3 : 1}
              fill={c.active ? COMPARE_COLORS.current : 'var(--secondary)'}
            >
              <title>{`${c.iso}${c.active ? ' · trained' : ''}`}</title>
            </rect>
            {big && (
              <text
                x={colX(c.col) + cell / 2}
                y={headH + c.day * step + cell / 2 + 3}
                textAnchor="middle"
                fontSize={9}
                className={c.active ? 'fill-white' : 'fill-muted-foreground'}
                pointerEvents="none"
              >
                {c.dom}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
