import type { Settings } from '@/types'

// Profile values live in `settings` as plain strings, like every other
// setting. Height falls back to the last body scan until it is set here.
export const PROFILE_KEYS = {
  heightCm: 'profile_height_cm',
  birthDate: 'profile_birth_date',
  sex: 'profile_sex',
} as const

export type ProfileSex = 'male' | 'female'

export function profileHeightCm(settings: Settings | null): number | null {
  const parsed = parseFloat(settings?.[PROFILE_KEYS.heightCm] ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function computeBmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

// Stored as a date rather than an age so it stays right next year.
export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  let age = today.getFullYear() - year
  const hadBirthday = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!hadBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export interface CurrentBmi {
  value: number | null
  // Set when the value was computed from a logged weight newer than the scan.
  basis: { weightKg: number; date: string } | null
}

interface CurrentBmiInput {
  scanBmi: number | null
  scanDate: string
  heightCm: number | null
  loggedWeight: { weight_kg: number; measured_at: string } | null
}

// One BMI, the most current one: a weight logged after the last scan wins
// over the scan's own figure, otherwise the scan stands.
export function currentBmi({ scanBmi, scanDate, heightCm, loggedWeight }: CurrentBmiInput): CurrentBmi {
  if (loggedWeight && heightCm !== null && loggedWeight.measured_at.slice(0, 10) > scanDate.slice(0, 10)) {
    const value = computeBmi(loggedWeight.weight_kg, heightCm)
    if (value !== null) {
      return { value, basis: { weightKg: loggedWeight.weight_kg, date: loggedWeight.measured_at.slice(0, 10) } }
    }
  }
  return { value: scanBmi, basis: null }
}
