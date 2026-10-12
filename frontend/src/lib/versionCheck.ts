import { useSyncExternalStore } from 'react'
import { buildInfo } from '@/lib/buildInfo'
import { useTrackingStore } from '@/store/useTrackingStore'
import { pushPending } from '@/lib/syncService'
import { decideVersionAction, isBusyRoute } from '@/lib/versionDecision'

// Why this exists: on an installed iOS PWA the service worker is only
// re-checked on a fresh launch, and a standalone app resumed from the
// background does no check at all -- so after a deploy the phone kept
// running the old build (BACKLOG #91). We ask the server which build is
// live (/build.json, written by deploy/deploy.sh) whenever the app starts or
// comes back to the foreground, and switch over when it differs from the
// build compiled into this bundle.
//
// Only Cache Storage and the service worker are touched. IndexedDB (local
// rows, sync queue) is never read for deletion or modified here.

const MIN_INTERVAL_MS = 5_000
const SW_WAIT_MS = 4_000
const FLAG_PREFIX = 'gym.versionReload.'

let updateAvailable = false
const listeners = new Set<() => void>()
let lastCheck = 0
let checking = false
let applying = false

function setUpdateAvailable(value: boolean) {
  if (updateAvailable === value) return
  updateAvailable = value
  listeners.forEach((l) => l())
}

export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => updateAvailable,
  )
}

function isBusy(): boolean {
  if (useTrackingStore.getState().sessionId !== null) return true
  if (isBusyRoute(window.location.pathname)) return true
  const el = document.activeElement
  if (el instanceof HTMLElement) {
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true
  }
  return false
}

function wasTried(id: string): boolean {
  try {
    return sessionStorage.getItem(FLAG_PREFIX + id) === '1'
  } catch {
    return false // no storage -> cannot remember; the SW_WAIT/fallback path still ends in one reload per check
  }
}

function markTried(id: string) {
  try {
    sessionStorage.setItem(FLAG_PREFIX + id, '1')
  } catch {
    // ignore
  }
}

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL}build.json?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { build_id?: unknown }
    return typeof data.build_id === 'string' && data.build_id ? data.build_id : null
  } catch {
    return null // offline, 404, HTML fallback -- all mean "don't know"
  }
}

// Fresh service worker first (skipWaiting + clientsClaim are on, so a new
// worker takes control by itself); if that does not happen quickly, drop
// the caches and the registration so the reload goes straight to the network.
async function switchToNewBuild(): Promise<void> {
  // Flush the sync queue best-effort; rows stay in IndexedDB either way.
  await Promise.race([pushPending(), new Promise((r) => setTimeout(r, 3_000))])

  let switched = false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      const controllerChange = new Promise<boolean>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true })
        setTimeout(() => resolve(false), SW_WAIT_MS)
      })
      await reg.update()
      switched = await controllerChange
    }
  } catch {
    // fall through to the hard fallback
  }

  if (!switched) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      // ignore
    }
    try {
      const regs = await navigator.serviceWorker?.getRegistrations()
      await Promise.all((regs ?? []).map((r) => r.unregister()))
    } catch {
      // ignore
    }
  }
  window.location.reload()
}

/** Banner tap: reload to the new build now (not an auto attempt). */
export async function applyUpdate(): Promise<void> {
  if (applying) return
  applying = true
  await switchToNewBuild()
}

export async function checkForNewVersion(): Promise<void> {
  if (!buildInfo.isRelease || checking || applying) return
  const now = Date.now()
  if (now - lastCheck < MIN_INTERVAL_MS) return
  lastCheck = now
  checking = true
  try {
    const server = await fetchServerBuildId()
    const action = decideVersionAction({
      current: buildInfo.id,
      server,
      busy: isBusy(),
      alreadyTried: server ? wasTried(server) : false,
    })
    if (action === 'banner') {
      setUpdateAvailable(true)
    } else if (action === 'reload' && server) {
      markTried(server)
      applying = true
      await switchToNewBuild()
    } else {
      setUpdateAvailable(false)
    }
  } finally {
    checking = false
  }
}

export function initVersionCheck(): () => void {
  if (!buildInfo.isRelease) return () => {}
  const run = () => void checkForNewVersion()
  const onVisibility = () => {
    if (document.visibilityState === 'visible') run()
  }
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) run()
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('online', run)
  run()
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('online', run)
  }
}
