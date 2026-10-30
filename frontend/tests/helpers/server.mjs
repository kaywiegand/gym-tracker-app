// A fake of POST /sync/push with the server's real conflict rule: a row only
// replaces the stored one when its updated_at is newer (BaseRepository::
// upsertRow). hold() keeps the response back to simulate a running push.
export function fakeServer() {
  const rows = new Map()
  const pushes = []
  let release = null
  let held = null
  let down = false

  const server = {
    rows,
    pushes,
    hold() {
      held = new Promise((r) => {
        release = r
      })
    },
    release() {
      release?.()
      held = null
    },
    setDown(value) {
      down = value
    },
    pushStarted: async (count = 1) => {
      while (pushes.length < count) await new Promise((r) => setTimeout(r, 1))
    },
  }

  globalThis.fetch = async (url, options = {}) => {
    if (down) throw new TypeError('Failed to fetch')
    if (!String(url).endsWith('/sync/push')) return server.onOther?.(String(url)) ?? new Response('{}', { status: 404 })
    const body = JSON.parse(options.body)
    pushes.push(body)
    const waitFor = held
    if (waitFor) await waitFor
    for (const table of ['sessions', 'sets', 'bodyweight', 'body_measurements']) {
      for (const row of body[table]) {
        const existing = rows.get(row.id)
        if (!existing || row.updated_at > existing.updated_at) rows.set(row.id, row)
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  return server
}
