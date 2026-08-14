import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { putRow, type LocalBodyweight } from '@/lib/localDb'
import { pushPending } from '@/lib/syncService'
import { nowIso } from '@/lib/time'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import type { Bodyweight, Settings, TrainingMode } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { NumberField } from '@/components/NumberField'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type TriggerMode = 'all_sets' | 'last_set'

export function SettingsPage() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [settings, setSettings] = useState<Settings | null>(null)
  const [modes, setModes] = useState<TrainingMode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get<Settings>('/settings'), api.get<TrainingMode[]>('/training-modes')])
      .then(([s, m]) => {
        setSettings(s)
        setModes(m)
      })
      .finally(() => setLoading(false))
  }, [])

  function updateMode(key: string, field: 'rep_low' | 'rep_high', value: number) {
    setModes((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)))
  }

  async function saveMode(mode: TrainingMode) {
    const updated = await api.put<TrainingMode[]>(`/training-modes/${mode.key}`, {
      rep_low: mode.rep_low,
      rep_high: mode.rep_high,
    })
    setModes(updated)
  }

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings) return
    const updated = await api.put<Settings>('/settings', patch)
    setSettings(updated)
  }

  if (loading || !settings) {
    return (
      <>
        <PageHeader title="Settings" subtitle="App & training" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="App & training" />

      <div className="mb-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Appearance</div>
      <Card>
        <CardContent className="flex items-center justify-between py-1">
          <span className="text-[13px] text-foreground/80">Theme</span>
          <SegmentedControl
            className="w-[150px]"
            value={theme}
            onChange={(t) => setTheme(t)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Training modes &amp; rep ranges</div>
      <div className="flex flex-col gap-2">
        {modes.map((mode) => (
          <Card key={mode.id}>
            <CardContent className="flex items-center justify-between py-1">
              <span className="text-[14px] font-bold">{mode.name}</span>
              <div className="flex items-center gap-1.5">
                <NumberField
                  width="3.5rem"
                  value={mode.rep_low}
                  onChange={(v) => updateMode(mode.key, 'rep_low', v)}
                  onBlur={() => saveMode(modes.find((m) => m.key === mode.key)!)}
                  aria-label={`${mode.name} lower rep bound`}
                />
                <span className="text-muted-foreground">–</span>
                <NumberField
                  width="3.5rem"
                  value={mode.rep_high}
                  onChange={(v) => updateMode(mode.key, 'rep_high', v)}
                  onBlur={() => saveMode(modes.find((m) => m.key === mode.key)!)}
                  aria-label={`${mode.name} upper rep bound`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Progression &amp; rest</div>
      <Card>
        <CardContent className="flex flex-col gap-4 py-1">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold">Default increment</span>
            <NumberField
              width="5.25rem"
              step={0.5}
              unit="kg"
              value={parseFloat(settings.default_increment_kg)}
              onChange={(v) => setSettings({ ...settings, default_increment_kg: String(v) })}
              onBlur={() => saveSettings({ default_increment_kg: settings.default_increment_kg })}
              aria-label="Default increment"
            />
          </div>

          <div className="h-px bg-border" />

          <div>
            <span className="text-[14px] font-bold">Increase weight when</span>
            <SegmentedControl<TriggerMode>
              className="mt-2"
              value={settings.progression_trigger}
              onChange={(v) => saveSettings({ progression_trigger: v })}
              options={[
                { value: 'all_sets', label: 'all sets hit top' },
                { value: 'last_set', label: 'last set hits top' },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {settings.progression_trigger === 'all_sets'
                ? 'Conservative: only once every working set hits the top of the rep range.'
                : 'Aggressive: as soon as the last (heaviest) set is at the top.'}
            </p>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold">Rest timer</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">starts after a set is marked done</div>
            </div>
            <NumberField
              width="6rem"
              step={15}
              unit="sec"
              value={parseInt(settings.rest_seconds, 10)}
              onChange={(v) => setSettings({ ...settings, rest_seconds: String(v) })}
              onBlur={() => saveSettings({ rest_seconds: settings.rest_seconds })}
              aria-label="Rest timer"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">General</div>
      <Card>
        <CardContent className="flex items-center justify-between py-1">
          <span className="text-[13px] text-foreground/80">Units</span>
          <Badge variant="secondary">Metric · kg / cm</Badge>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Card className="mt-2">
        <CardContent className="py-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
          >
            Log out
          </Button>
        </CardContent>
      </Card>

      <BodyweightCard />

      <p className="mb-2 mt-4 text-center text-[11px] text-muted-foreground">BIA &amp; HR import · PDF/CSV export — later stages</p>
    </>
  )
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (next.length < 4) {
      setStatus({ type: 'error', text: 'New password must be at least 4 characters.' })
      return
    }
    if (next !== confirm) {
      setStatus({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      setStatus({ type: 'success', text: 'Password changed.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof ApiError ? err.message : 'Something went wrong.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Password</div>
      <Card>
        <CardContent className="py-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password" className="text-[12px] text-muted-foreground">
                Current password
              </Label>
              <Input id="current-password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password" className="text-[12px] text-muted-foreground">
                New password
              </Label>
              <Input id="new-password" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password" className="text-[12px] text-muted-foreground">
                Confirm new password
              </Label>
              <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {status && <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-status-good'}>{status.text}</p>}
            <Button type="submit" variant="secondary" disabled={submitting || !current || !next || !confirm}>
              {submitting ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

// Minimal quick-entry card -- no dedicated screen, matching the plan's
// scope decision (the prototype has no bodyweight input UI at all, only a
// Stage-5 analysis view). Writes local-first like the tracking screen.
function BodyweightCard() {
  const [weightKg, setWeightKg] = useState(70)
  const [last, setLast] = useState<Bodyweight | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get<Bodyweight[]>('/bodyweight?limit=1')
      .then((rows) => {
        if (rows[0]) {
          setLast(rows[0])
          setWeightKg(rows[0].weight_kg)
        }
      })
      .catch(() => {
        // non-fatal -- entry still works without a "last" reference
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    const now = nowIso()
    const row: LocalBodyweight = {
      id: crypto.randomUUID(),
      measured_at: now.slice(0, 10),
      weight_kg: weightKg,
      note: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      synced: false,
    }
    await putRow('bodyweight', row)
    pushPending()
    setLast(row)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Body weight</div>
      <Card>
        <CardContent className="flex items-center justify-between py-1">
          <div>
            <div className="text-[14px] font-bold">Log weight</div>
            {last && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Last: {last.weight_kg} kg · {last.measured_at}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NumberField width="5.25rem" step={0.1} unit="kg" value={weightKg} onChange={setWeightKg} aria-label="Body weight" />
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
