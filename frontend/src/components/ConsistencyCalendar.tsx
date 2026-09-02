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

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
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

// Seven columns Mon..Sun, one row per week, newest on top. The GitHub shape
// (a column per week, running left to right) was the other candidate, but it
// answers "when were the gaps" and not "am I training regularly" -- in a
// 52-week grid one week is a 5px column read top-to-bottom. Here a Mon/Wed/Fri
// habit shows as three straight vertical lines.
export function ConsistencyCalendar({ dates, weeks }: ConsistencyCalendarProps) {
  const { cells } = buildCells(dates, weeks)

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
