import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { api, UNAUTHORIZED_EVENT } from '@/lib/api'
import { initSyncListeners, pushPending } from '@/lib/syncService'
import type { Settings } from '@/types'
import { RequireAuth } from '@/components/RequireAuth'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExercisesPage } from '@/pages/ExercisesPage'
import { ExerciseEditPage } from '@/pages/ExerciseEditPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { WorkoutEditPage } from '@/pages/WorkoutEditPage'
import { WorkoutGroupsPage } from '@/pages/WorkoutGroupsPage'
import { TrackingPage } from '@/pages/TrackingPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReportPage } from '@/pages/ReportPage'

export default function App() {
  const status = useAuthStore((s) => s.status)
  const checkStatus = useAuthStore((s) => s.checkStatus)
  const recheck = useAuthStore((s) => s.recheck)
  const setTheme = useThemeStore((s) => s.setTheme)

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    initSyncListeners()
  }, [])

  useEffect(() => {
    // The PHP session can expire while the app stays open. Without this the
    // app kept rendering as if it were logged in and every list came back
    // empty, which reads as "the data is gone" instead of "log in again".
    const onUnauthorized = () => void recheck()
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [recheck])

  useEffect(() => {
    if (status === 'authenticated') {
      pushPending()
    }
  }, [status])

  useEffect(() => {
    // Settings.theme in the DB is the source of truth across devices; sync
    // it into the theme store (and localStorage) once we know we're logged in.
    if (status !== 'authenticated') {
      return
    }
    api
      .get<Settings>('/settings')
      .then((settings) => setTheme(settings.theme, false))
      .catch(() => {
        // non-fatal -- keep whatever theme is already applied
      })
  }, [status, setTheme])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/track/:workoutId" element={<TrackingPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/exercises/:id/edit" element={<ExerciseEditPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/workout-groups" element={<WorkoutGroupsPage />} />
          <Route path="/workouts/new" element={<WorkoutEditPage />} />
          <Route path="/workouts/:id/edit" element={<WorkoutEditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
