// Keeps the phone screen on during a workout. Between sets a set of hands is
// busy holding a barbell, not tapping the screen, so iOS dims and locks --
// which also killed the rest timer's usefulness (you never saw it finish).
//
// Screen Wake Lock is supported by iOS Safari 16.4+ and Chrome. Where it is
// missing this is simply a no-op: nothing depends on it working.
//
// The lock is released by the browser whenever the tab is hidden (switching
// apps, the user locking the phone by hand), and is NOT restored on return --
// hence the visibilitychange re-acquire.

type Sentinel = { released: boolean; release: () => Promise<void> }

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> }
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

// Returns a cleanup function -- call it when the workout ends.
export function keepScreenAwake(): () => void {
  if (!isWakeLockSupported()) return () => {}

  let sentinel: Sentinel | null = null
  let cancelled = false

  const acquire = async () => {
    if (cancelled || document.visibilityState !== 'visible') return
    if (sentinel && !sentinel.released) return
    try {
      sentinel = await (navigator as WakeLockNavigator).wakeLock!.request('screen')
    } catch {
      // Denied (low battery, unsupported context) -- not worth surfacing.
      sentinel = null
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void acquire()
  }

  void acquire()
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    cancelled = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void sentinel?.release().catch(() => {})
    sentinel = null
  }
}
