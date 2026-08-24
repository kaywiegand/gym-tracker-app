export interface Settings {
  unit_system: string
  default_increment_kg: string
  rounding_kg: string
  progression_trigger: 'all_sets' | 'last_set'
  rest_seconds: string
  theme: 'dark' | 'light'
  plateau_sessions: string
  [key: string]: string
}

export interface TrainingMode {
  id: number
  key: string
  name: string
  rep_low: number
  rep_high: number
  sort: number
}

export interface Muscle {
  id: number
  name_en: string
  region: string
  sort: number
}

export interface ExerciseListItem {
  id: string
  name: string
  movement: string
  equipment: string | null
  mechanic: string | null
  category: string | null
  default_increment_kg: number | null
  region: string | null
  primary_muscle: string | null
}

export interface ExerciseMuscle {
  muscle_id: number
  name_en: string
  region: string
  role: 'primary' | 'secondary'
  weight: number
}

export interface ExerciseMedia {
  id: string
  path: string
  mime: string | null
  sort: number
}

export interface Exercise {
  id: string
  name: string
  movement: string
  equipment: string | null
  mechanic: string | null
  category: string | null
  default_increment_kg: number | null
  source: string
  external_id: string | null
  created_at: string
  updated_at: string
  muscles: ExerciseMuscle[]
  media: ExerciseMedia[]
}

export interface WorkoutListItem {
  id: string
  name: string
  mode_id: number
  mode_key: string
  mode_name: string
  rep_low: number
  rep_high: number
  exercise_count: number
  updated_at: string
}

export interface WorkoutExercise {
  id: string
  exercise_id: string
  exercise_name: string
  region: string | null
  position: number
  planned_sets: number
  rep_low_override: number | null
  rep_high_override: number | null
  increment_override_kg: number | null
  exercise_default_increment_kg: number | null
}

export interface ExerciseHistoryEntry {
  session_id: string
  started_at: string
  best_e1rm: number
  volume_kg: number
  sets_count: number
}

export interface WeeklyMetrics {
  sets: number
  volume_kg: number
  best_e1rm: number
}

export interface MuscleVolumeWeek extends WeeklyMetrics {
  week_start: string
}

export interface MuscleVolumeTarget {
  region: string
  mev: number
  mav: number
  mrv: number
}

export interface MuscleVolumeRegion {
  region: string
  mev: number
  mav: number
  mrv: number
  this_week: WeeklyMetrics
  last_week: WeeklyMetrics
  weeks: MuscleVolumeWeek[]
}

export interface MuscleVolumeResponse {
  regions: MuscleVolumeRegion[]
}

export interface AcwrWeek {
  week_start: string
  ratio: number
}

export interface AcwrResponse {
  acute_kg: number
  chronic_kg: number
  ratio: number
  weekly_series: AcwrWeek[]
}

export interface TrainingLoadResponse {
  weekly_volume: { week_start: string; volume_kg: number }[]
  weekly_sessions: { week_start: string; count: number }[]
}

export interface ConsistencyResponse {
  dates: string[]
}

export interface ExerciseSessionSummary {
  session_id: string
  started_at: string
  sets: { weight_kg: number; reps: number }[]
}

export interface WorkoutMuscleSplitSession {
  session_id: string
  started_at: string
  ended_at: string | null
  by_region: Record<string, number>
}

export interface WorkoutMuscleSplitResponse {
  sessions: WorkoutMuscleSplitSession[]
}

export interface Workout {
  id: string
  name: string
  mode_id: number
  mode_key: string
  mode_name: string
  rep_low: number
  rep_high: number
  notes: string | null
  archived: number
  created_at: string
  updated_at: string
  exercises: WorkoutExercise[]
}

export interface Session {
  id: string
  workout_id: string | null
  started_at: string
  ended_at: string | null
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SetEntry {
  id: string
  session_id: string
  exercise_id: string
  workout_exercise_id: string | null
  set_index: number
  weight_kg: number
  reps: number
  is_warmup: number
  rpe: number | null
  performed_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Bodyweight {
  id: string
  measured_at: string
  weight_kg: number
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BodyMeasurement {
  id: string
  measured_at: string
  site: string
  value_cm: number
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BiaMeasurement {
  id: string
  measured_at: string
  source: string
  external_id: string | null
  created_at: string
}

export interface BiaValue {
  id: string
  category: string
  subcategory: string | null
  metric: string
  value_num: number | null
  value_text: string | null
  unit: string | null
  ref_low: number | null
  ref_high: number | null
}

export interface BiaMeasurementDetail {
  measurement: BiaMeasurement
  values: BiaValue[]
}

export interface BiaImportResult {
  imported: number
  skipped: number
}

export interface HrImportResult {
  matched: number
  sessions_touched: number
}

export interface BackupTableSummary {
  inserted: number
  updated: number
  skipped: number
}

export interface BackupImportResult {
  tables: Record<string, BackupTableSummary>
}
