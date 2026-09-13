import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { LoginPage } from '@/pages/LoginPage'

export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const expired = useAuthStore((s) => s.expired)
  const location = useLocation()

  if (status === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (status === 'unauthenticated' && !expired) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // A session that died mid-use gets the login on top of the current screen.
  // Same element shape either way, so the screen underneath never remounts --
  // redirecting to /login used to throw away an unsaved workout edit.
  return (
    <>
      <Outlet />
      {status === 'unauthenticated' && <LoginPage overlay />}
    </>
  )
}
