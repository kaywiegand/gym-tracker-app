// Which build am I looking at? Baked in by deploy/deploy.sh so a bug report
// from the phone can be traced back to an exact commit -- and to the backup
// that was taken right before that deploy (same id, see backups/<id>/).
//
// A local `npm run dev` or a hand-run `npm run build` has no build id; that
// is the point -- only a real deploy gets one.
export const buildInfo = {
  id: import.meta.env.VITE_BUILD_ID ?? 'dev',
  commit: import.meta.env.VITE_BUILD_COMMIT ?? '',
  builtAt: import.meta.env.VITE_BUILD_TIME ?? '',
  isRelease: Boolean(import.meta.env.VITE_BUILD_ID),
} as const

export function formatBuildTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
