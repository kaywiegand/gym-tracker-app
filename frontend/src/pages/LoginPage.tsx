import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const ok = await login(password)
    setSubmitting(false)
    if (ok) {
      const from = (location.state as { from?: string } | null)?.from ?? '/exercises'
      navigate(from, { replace: true })
    } else {
      setError('Wrong password.')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Workout Tracker</CardTitle>
          <CardDescription>Enter the app password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || password === ''}>
              {submitting ? 'Signing in…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
