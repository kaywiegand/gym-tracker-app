// Pure decision logic for the version check (kept free of browser APIs so it
// can be unit-checked in isolation). See lib/versionCheck.ts for the I/O.

export type VersionAction = 'none' | 'reload' | 'banner'

export interface VersionState {
  /** Build id compiled into this bundle. */
  current: string
  /** Build id the server reports in /build.json (null = unknown/unreachable). */
  server: string | null
  /** A workout is being tracked, a form is open or a field has focus. */
  busy: boolean
  /** An automatic reload for this server build id was already attempted. */
  alreadyTried: boolean
}

export function decideVersionAction({ current, server, busy, alreadyTried }: VersionState): VersionAction {
  if (!server || server === current) return 'none'
  // Never reload under the user's hands; and never loop automatically.
  if (busy || alreadyTried) return 'banner'
  return 'reload'
}

// Routes with a form that may hold unsaved input.
const FORM_ROUTE = /^\/(track\/|workouts\/new$|workouts\/[^/]+\/edit$|exercises\/[^/]+\/edit$)/

export function isBusyRoute(pathname: string): boolean {
  return FORM_ROUTE.test(pathname)
}
