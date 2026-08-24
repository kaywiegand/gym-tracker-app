import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { putRow, type LocalBodyMeasurement, type LocalBodyweight } from '@/lib/localDb'
import { pushPending } from '@/lib/syncService'
import { nowIso } from '@/lib/time'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import type {
  BackupImportResult,
  BiaImportResult,
  BiaMeasurement,
  Bodyweight,
  HrImportResult,
  Settings,
  TrainingMode,
} from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { NumberField } from '@/components/NumberField'
import { SegmentedControl } from '@/components/SegmentedControl'
import { BiaMeasurementDetailSheet } from '@/components/BiaMeasurementDetailSheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'

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

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold">Flag a plateau after</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">sessions with no e1RM growth</div>
            </div>
            <NumberField
              width="6rem"
              step={1}
              min={2}
              unit="sessions"
              value={parseInt(settings.plateau_sessions, 10)}
              onChange={(v) => setSettings({ ...settings, plateau_sessions: String(v) })}
              onBlur={() => saveSettings({ plateau_sessions: settings.plateau_sessions })}
              aria-label="Plateau detection threshold"
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
      <BodyMeasurementCard />
      <BiaCard />
      <HeartRateCard />
      <BackupCard />
      <ExportCard />
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

// A successful BIA/HR/backup upload can change data shown on other pages
// (Body-Scope dashboard, Workouts list, ...) that won't refetch until they
// next mount -- reload after a moment so the whole app reflects it, not
// just this card's own list.
function reloadAfterDelay(delayMs = 1200) {
  setTimeout(() => window.location.reload(), delayMs)
}

const MEASUREMENT_SITES = ['waist', 'chest', 'hip', 'arm', 'thigh'] as const

// Tape-measure quick entry -- mirrors BodyweightCard exactly (Stage-5 plan
// §4.7: body measurements are offline-first like bodyweight, unlike the
// file-import cards below which are inherently online actions).
function BodyMeasurementCard() {
  const [site, setSite] = useState<(typeof MEASUREMENT_SITES)[number]>('waist')
  const [valueCm, setValueCm] = useState(80)
  const [last, setLast] = useState<Record<string, { value_cm: number; measured_at: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get<{ site: string; value_cm: number; measured_at: string }[]>('/body-measurements?limit=50')
      .then((rows) => {
        const bySite: Record<string, { value_cm: number; measured_at: string }> = {}
        for (const row of rows) {
          if (!bySite[row.site]) {
            bySite[row.site] = { value_cm: row.value_cm, measured_at: row.measured_at }
          }
        }
        setLast(bySite)
        if (bySite[site]) {
          setValueCm(bySite[site].value_cm)
        }
      })
      .catch(() => {
        // non-fatal -- entry still works without a "last" reference
      })
  }, [site])

  async function handleSave() {
    setSaving(true)
    const now = nowIso()
    const row: LocalBodyMeasurement = {
      id: crypto.randomUUID(),
      measured_at: now.slice(0, 10),
      site,
      value_cm: valueCm,
      note: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      synced: false,
    }
    await putRow('body_measurements', row)
    pushPending()
    setLast((prev) => ({ ...prev, [site]: { value_cm: valueCm, measured_at: row.measured_at } }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const lastForSite = last[site]

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Body measurements</div>
      <Card>
        <CardContent className="flex items-center justify-between py-1">
          <div>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value as (typeof MEASUREMENT_SITES)[number])}
              className="rounded-md border border-border bg-secondary px-2 py-1.5 text-[13px] font-bold capitalize outline-none"
              aria-label="Measurement site"
            >
              {MEASUREMENT_SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {lastForSite && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Last: {lastForSite.value_cm} cm · {lastForSite.measured_at}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NumberField width="5.25rem" step={0.5} unit="cm" value={valueCm} onChange={setValueCm} aria-label="Measurement value" />
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// BIA import (Stage-5 plan §4.1): photograph the scan printout, use an
// external AI to fill in the downloadable CSV template, upload it here --
// a genuine mobile-friendly workflow, no fixed server-side file path.
function BiaCard() {
  const [measurements, setMeasurements] = useState<BiaMeasurement[]>([])
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [openMeasurementId, setOpenMeasurementId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadMeasurements() {
    api.get<BiaMeasurement[]>('/bia/measurements?limit=50').then(setMeasurements)
  }

  useEffect(() => {
    loadMeasurements()
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setStatus(null)
    try {
      const result = await api.upload<BiaImportResult>('/bia/import', file)
      setStatus({ type: 'success', text: `Imported ${result.imported} scan(s), skipped ${result.skipped} already-known.` })
      loadMeasurements()
      reloadAfterDelay()
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof ApiError ? err.message : 'Import failed.' })
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/bia/measurements/${id}`)
    loadMeasurements()
  }

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Body composition (BIA)</div>
      <Card>
        <CardContent className="flex flex-col gap-3 py-1">
          <p className="text-[12px] text-muted-foreground">
            Photograph your scan printout, have an AI fill in the CSV template, then upload it here.
          </p>
          <div className="flex gap-2">
            <a href="/api/bia/template">
              <Button type="button" variant="outline" size="sm">
                Download CSV template
              </Button>
            </a>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Importing…' : 'Upload & import'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </div>
          {status && <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-status-good'}>{status.text}</p>}

          {measurements.length > 0 && (
            <div className="flex flex-col">
              {measurements.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-b-0">
                  <button type="button" className="text-[13px] font-semibold" onClick={() => setOpenMeasurementId(m.id)}>
                    {m.measured_at.slice(0, 10)}
                  </button>
                  <button type="button" aria-label={`Delete scan from ${m.measured_at.slice(0, 10)}`} onClick={() => handleDelete(m.id)}>
                    <Trash2 className="size-[15px] text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <BiaMeasurementDetailSheet measurementId={openMeasurementId} onOpenChange={(open) => !open && setOpenMeasurementId(null)} />
    </>
  )
}

// HR import from an Apple Health export.xml (Stage-5 plan §4.2). The
// export can be 100+ MB -- if the upload fails with a size error, the
// server's upload_max_filesize/post_max_size need raising (see README).
function HeartRateCard() {
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setStatus(null)
    try {
      const result = await api.upload<HrImportResult>('/hr/import', file)
      setStatus({
        type: 'success',
        text: `Matched ${result.matched} new heart-rate sample(s) across ${result.sessions_touched} session(s).`,
      })
      reloadAfterDelay()
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof ApiError ? err.message : 'Import failed.' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Heart rate</div>
      <Card>
        <CardContent className="flex flex-col gap-3 py-1">
          <p className="text-[12px] text-muted-foreground">
            Upload an Apple Health export.xml — only samples inside a logged training session are kept.
          </p>
          <div>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Uploading & matching…' : 'Upload & import'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={handleFileChange} />
          </div>
          {status && <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-status-good'}>{status.text}</p>}
        </CardContent>
      </Card>
    </>
  )
}

// Manual full backup/restore of all user-generated data (Stage-5 plan
// §4.3), motivated by CLAUDE.md §2 ("Datenhoheit ... kein Lock-in").
function BackupCard() {
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRestoring(true)
    setStatus(null)
    try {
      const result = await api.upload<BackupImportResult>('/backup/import', file)
      const total = Object.values(result.tables).reduce((sum, t) => sum + t.inserted + t.updated, 0)
      setStatus({ type: 'success', text: `Restore complete — ${total} row(s) inserted or updated across ${Object.keys(result.tables).length} tables.` })
      reloadAfterDelay()
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof ApiError ? err.message : 'Restore failed.' })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Backup</div>
      <Card>
        <CardContent className="flex flex-col gap-3 py-1">
          <p className="text-[12px] text-muted-foreground">
            Full backup of everything you've entered (workouts, custom exercises, tracking history, body/BIA/heart-rate data) — includes
            your login password. Restoring always applies the file's data, even over newer changes already in the database.
          </p>
          <div className="flex gap-2">
            <a href="/api/backup/export">
              <Button type="button" variant="outline" size="sm">
                Download full backup
              </Button>
            </a>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={restoring}>
              {restoring ? 'Restoring…' : 'Restore from backup'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
          </div>
          {status && <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-status-good'}>{status.text}</p>}
        </CardContent>
      </Card>
    </>
  )
}

// Human-readable export (Stage 6, CLAUDE.md §2) -- distinct from the Backup
// card above, which is a raw disaster-recovery snapshot. CSV is generated
// server-side; the PDF path is a print-optimized page (window.print()) so
// this stays dependency-free (CLAUDE.md §3/§12 -- no PHP PDF library).
function ExportCard() {
  return (
    <>
      <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Export</div>
      <Card>
        <CardContent className="flex flex-col gap-3 py-1">
          <p className="text-[12px] text-muted-foreground">A human-readable export of your training log, or a printable progress report.</p>
          <div className="flex gap-2">
            <a href="/api/export/training-log.csv">
              <Button type="button" variant="outline" size="sm">
                Download training log (CSV)
              </Button>
            </a>
            <Link to="/report">
              <Button type="button" size="sm">
                Print report (PDF)
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
