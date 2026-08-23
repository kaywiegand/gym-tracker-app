import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AcwrResponse, MuscleVolumeResponse } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { AcwrCard } from '@/components/AcwrCard'
import { MuscleVolumeStatusList } from '@/components/MuscleVolumeStatusList'
import { MuscleHeatmap } from '@/components/MuscleHeatmap'
import { MuscleRadar } from '@/components/MuscleRadar'
import { Card } from '@/components/ui/card'

export function DashboardPage() {
  const [acwr, setAcwr] = useState<AcwrResponse | null>(null)
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get<AcwrResponse>('/dashboard/acwr'), api.get<MuscleVolumeResponse>('/dashboard/muscle-volume?weeks=8')])
      .then(([acwrData, muscleVolumeData]) => {
        setAcwr(acwrData)
        setMuscleVolume(muscleVolumeData)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" subtitle="This week at a glance" />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && acwr && <AcwrCard acwr={acwr} />}

      {!loading && muscleVolume && (
        <div className="mt-3 flex flex-col gap-3">
          <MuscleVolumeStatusList regions={muscleVolume.regions} />

          <Card className="p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Weekly volume by muscle
            </div>
            <MuscleHeatmap regions={muscleVolume.regions} />
          </Card>

          <Card className="p-3.5">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              This week vs. last week
            </div>
            <MuscleRadar regions={muscleVolume.regions} />
          </Card>
        </div>
      )}
    </>
  )
}
