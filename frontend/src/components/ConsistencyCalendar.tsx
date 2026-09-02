export type CalendarLayout = 'timeline' | 'weekly'

interface ConsistencyCalendarProps {
  dates: string[]
  weeks: number
  layout?: CalendarLayout
}

function isoWeekStartUtc(d: Date): Date {
  const dayIndex = (d.getUTCDay() + 6) % 7 // 0 (Mon) .. 6 (Sun)
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - dayIndex)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEKDAY_LABEL = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Cell {
  iso: string
  week: number
  day: number
  active: boolean
}

function buildCells(dates: string[], weeks: number): { cells: Cell[]; start: Date } {
  const active = new Set(dates)
  const start = isoWeekStartUtc(new Date())
  start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7)

  const cells: Cell[] = []
  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + week * 7 + day)
      const iso = d.toISOString().slice(0, 10)
      cells.push({ iso, week, day, active: active.has(iso) })
    }
  }
  return { cells, start }
}

// Two readings of the same grid.
//
// `timeline` is the GitHub shape -- a column per week, running left to right.
// Good for spotting stretches and gaps across a year, poor for spotting
// rhythm, because one week reads top-to-bottom in a 5px column.
//
// `weekly` turns it: seven columns Mon..Sun, one row per week. A Mon/Wed/Fri
// habit shows up as three straight vertical lines, which is exactly the
// question "am I training regularly" asks.
export function ConsistencyCalendar({ dates, weeks, layout = 'timeline' }: ConsistencyCalendarProps) {
  const { cells } = buildCells(dates, weeks)

  if (layout === 'weekly') {
    // Newest week on top: the recent past is what gets read first.
    const rows = weeks
    const cell = rows <= 16 ? 15 : rows <= 30 ? 11 : rows <= 60 ? 7 : 5
    const gap = cell >= 11 ? 3 : 2
    const step = cell + gap
    const labelW = 34
    const headH = 14
    const w = labelW + 7 * step
    const h = headH + rows * step

    // One label per month, on the first row whose Monday lands in it. Reading
    // top-down means walking backwards through time, so the set is filled in
    // that order too -- otherwise a month gets labelled twice at its edges.
    // Keyed by year AND month: a 12-month range spans ~13 month boundaries,
    // so September appears at both ends and a month-only key would drop one.
    const labelled = new Set<string>()
    const monthRow = new Set<string>()
    for (let week = weeks - 1; week >= 0; week--) {
      const monday = cells.find((c) => c.week === week && c.day === 0)
      if (!monday) continue
      const d = new Date(monday.iso)
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      if (labelled.has(key)) continue
      labelled.add(key)
      monthRow.add(monday.iso)
    }

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block" style={{ width: w, maxWidth: '100%' }}>
        {WEEKDAY_SHORT.map((d, i) => (
          <text
            key={`${d}-${i}`}
            x={labelW + i * step + cell / 2}
            y={9}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {d}
          </text>
        ))}

        {cells.map((c) => {
          const row = rows - 1 - c.week
          const d = new Date(c.iso)
          const showLabel = c.day === 0 && monthRow.has(c.iso)
          return (
            <g key={c.iso}>
              {showLabel && (
                <text x={0} y={headH + row * step + cell - 2} className="fill-muted-foreground" fontSize={9}>
                  {MONTHS[d.getUTCMonth()]}
                </text>
              )}
              <rect
                x={labelW + c.day * step}
                y={headH + row * step}
                width={cell}
                height={cell}
                rx={cell >= 11 ? 3 : 2}
                fill={c.active ? 'var(--brand-accent)' : 'var(--secondary)'}
              >
                <title>{`${c.iso}${c.active ? ' · trained' : ''}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    )
  }

  const cell = weeks <= 14 ? 13 : weeks <= 30 ? 8 : weeks <= 60 ? 5 : 3
  const gap = cell >= 8 ? 3 : cell >= 5 ? 2 : 1
  const step = cell + gap
  const labelW = cell >= 8 ? 26 : 0
  const headH = 14

  const monthTicks: { col: number; label: string }[] = []
  let lastMonth = -1
  for (const c of cells) {
    if (c.day !== 0) continue
    const m = new Date(c.iso).getUTCMonth()
    if (m === lastMonth) continue
    lastMonth = m
    const prev = monthTicks[monthTicks.length - 1]
    if (!prev || (c.week - prev.col) * step >= 26) monthTicks.push({ col: c.week, label: MONTHS[m] })
  }

  const w = labelW + weeks * step
  const h = headH + 7 * step

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w > 420 ? '100%' : w }}>
      {monthTicks.map((t) => (
        <text key={`${t.col}-${t.label}`} x={labelW + t.col * step} y={9} className="fill-muted-foreground" fontSize={9}>
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
