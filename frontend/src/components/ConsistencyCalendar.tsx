import { addDays, COMPARE_COLORS, localIso, parseIso } from '@/lib/dashboardRanges'

interface ConsistencyCalendarProps {
  dates: string[]
  // Length of the window in whole weeks. No previous-period comparison here
  // (BACKLOG #88): the calendar only shows the selected range, but never
  // less than MIN_WEEKS (2 months, BACKLOG #105) -- a calendar of one or two
  // weeks says nothing.
  weeks: number
}

const MIN_WEEKS = 8

// Drawing width in viewBox units. The SVG scales to the full tile width, so
// this is the one number the cell size derives from.
const VIEW_W = 340

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Activity grid: one column per calendar week (Monday to Sunday), running
// left to right; the last column is the current week and stops at today.
// Every row is one fixed weekday (Monday on top), labelled on the left.
//
// The grid always spans the full tile width (BACKLOG #107): cells are sized
// from the number of columns, so 8 weeks give large cells that carry their
// day of month and a year gives small ones.
export function ConsistencyCalendar({ dates, weeks }: ConsistencyCalendarProps) {
  const active = new Set(dates)
  const columns = Math.max(weeks, MIN_WEEKS)
  const today = localIso(new Date())
  // Columns are calendar weeks, Monday to Sunday; the last one is the
  // current week (BACKLOG #93).
  const todayWeekday = (parseIso(today).getDay() + 6) % 7 // 0 = Mon
  const start = addDays(today, -todayWeekday - (columns - 1) * 7)
  const startDate = parseIso(start)

  const labelW = 26
  const gapFor = (s: number) => (s >= 12 ? 3 : s >= 5 ? 2 : 1)
  const gap = gapFor((VIEW_W - labelW) / columns)
  const step = (VIEW_W - labelW + gap) / columns
  const cell = step - gap
  const big = step >= 18
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
      if (iso > today) continue // days of the current week still to come
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

  // +3: with small cells the "Sun" label reaches below the last row.
  const h = headH + 7 * step - gap + 3
  // Few columns leave room for all four labels; many only for Monday and Sunday.
  const labelRows = step >= 5.5 ? [0, 2, 4, 6] : [0, 6]

  // Counted over exactly the days drawn below, so caption and grid agree
  // even when the grid is wider than the selected range (BACKLOG #104).
  const trained = cells.filter((c) => c.active).length

  return (
    <div>
      <p className="mb-2 text-[10.5px] text-muted-foreground">
        {trained} training {trained === 1 ? 'day' : 'days'} · last {columns} weeks
      </p>
      <svg viewBox={`0 0 ${VIEW_W} ${h}`} className="block w-full">
        {monthTicks.map((t) => (
          <text key={`${t.x}-${t.label}`} x={t.x} y={9} className="fill-muted-foreground" fontSize={9}>
            {t.label}
          </text>
        ))}

        {labelRows.map((row) => (
          <text key={row} x={0} y={headH + row * step + cell / 2 + 3} className="fill-muted-foreground" fontSize={9}>
            {WEEKDAYS[row]}
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
            />
            {big && (
              <text
                x={colX(c.col) + cell / 2}
                y={headH + c.day * step + cell / 2 + 3}
                textAnchor="middle"
                fontSize={10}
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
