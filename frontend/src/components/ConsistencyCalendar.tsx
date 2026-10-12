import { addDays, COMPARE_COLORS, localIso, parseIso } from '@/lib/dashboardRanges'

interface ConsistencyCalendarProps {
  dates: string[]
  // Length of the (current) window in whole weeks.
  weeks: number
  // Also draw the `weeks` weeks directly before it, in grey, set apart by a
  // gap -- the "selected range vs. previous range" view (BACKLOG #82). Only
  // pass true when that previous window is fully covered by the data.
  compare?: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Activity grid: one column per week, running left to right, ending today.
//
// Columns are rolling 7-day blocks (the dashboard's whole-week windows), not
// Monday-aligned calendar weeks: a window then consists of complete columns,
// the previous window can sit left of a clean gap, and the last cell is
// always today. Consequently every row is one fixed weekday -- the rows are
// labelled with the weekday they stand for, starting at the first column's
// weekday.
//
// Cells shrink with the number of columns so a year (two with the
// comparison) still fits without scrolling; below ~3px they stop being
// readable, so that is the floor. With one or two columns (7D/14D) cells are
// large and carry their day of month.
export function ConsistencyCalendar({ dates, weeks, compare = false }: ConsistencyCalendarProps) {
  const active = new Set(dates)
  const columns = compare ? weeks * 2 : weeks
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
  const sepGap = compare ? Math.max(6, step) : 0
  const colX = (col: number) => labelW + col * step + (compare && col >= weeks ? sepGap : 0)

  const cells: { iso: string; day: number; col: number; active: boolean; previous: boolean; dom: number }[] = []
  const monthTicks: { x: number; label: string }[] = []
  let lastMonthKey = ''
  let lastTickX = -Infinity

  for (let col = 0; col < columns; col++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + col * 7 + day)
      const iso = localIso(d)
      cells.push({ iso, day, col, active: active.has(iso), previous: compare && col < weeks, dom: d.getDate() })
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

        {compare && (
          <line
            x1={colX(weeks) - sepGap / 2 - gap / 2}
            x2={colX(weeks) - sepGap / 2 - gap / 2}
            y1={headH}
            y2={h}
            stroke="var(--border)"
            strokeWidth={1}
          />
        )}

        {cells.map((c) => (
          <g key={c.iso}>
            <rect
              x={colX(c.col)}
              y={headH + c.day * step}
              width={cell}
              height={cell}
              rx={cell >= 8 ? 3 : 1}
              fill={c.active ? (c.previous ? COMPARE_COLORS.previous : COMPARE_COLORS.current) : 'var(--secondary)'}
            >
              <title>{`${c.iso}${c.active ? ' · trained' : ''}${c.previous ? ' · previous period' : ''}`}</title>
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

      {compare && (
        <div className="mt-1.5 flex gap-4">
          {([
            ['Current', COMPARE_COLORS.current],
            ['Previous', COMPARE_COLORS.previous],
          ] as const).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
