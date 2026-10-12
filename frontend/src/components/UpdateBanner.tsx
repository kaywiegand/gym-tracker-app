import { applyUpdate, useUpdateAvailable } from '@/lib/versionCheck'

// Shown only when a new build is live but reloading automatically would be
// disruptive (workout running, form open). Tap = reload to the new build.
export function UpdateBanner() {
  const available = useUpdateAvailable()
  if (!available) return null
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3.5"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
    >
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="rounded-full border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-lg"
      >
        New version available — <span className="underline">Reload</span>
      </button>
    </div>
  )
}
