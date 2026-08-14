import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
