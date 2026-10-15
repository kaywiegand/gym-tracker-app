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

// Naming: `name` is the untouched source name (FEDB). `display_name` is the
// structured name the server assembles from muscle + movement + equipment +
// variant, and `display_subtitle` is the common gym name. Render those two --
// never `name` directly. See api/lib/ExerciseNaming.php.
export interface ExerciseNames {
  name: string
  movement: string | null
  variant: string | null
  display_alias: string | null
  display_name: string
  display_subtitle: string
  is_curated: number
}

export interface ExerciseListItem extends ExerciseNames {
  id: string
  equipment: string | null
  mechanic: string | null
  category: string | null
  default_increment_kg: number | null
  region: string | null
  primary_muscle: string | null
  // 1 when the exercise sits in a workout or has ever been logged -- the
  // pickers mark these (BACKLOG #38).
  is_used: number
  has_sets: number
}

export interface RecentWorkout {
  id: string
  name: string
  last_used: string
  exercise_count: number
  exercises: ExerciseListItem[]
}

export interface ExerciseNamingVocabulary {
  movements: string[]
  variants: string[]
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

export interface Exercise extends ExerciseNames {
  id: string
  primary_muscle: string | null
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

// Optional grouping for the workout list. A workout belongs to at most one
// group; ungrouped is a normal state, not a missing value.
export interface WorkoutGroup {
  id: string
  name: string
  sort: number
  workout_count: number
}

export interface WorkoutListItem {
  id: string
  name: string
  group_id: string | null
  group_name: string | null
  group_sort: number | null
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
  // Render exercise_display_name -- exercise_name is the raw source name and
  // exists only as the fallback the server already applied.
  exercise_name: string
  exercise_display_name: string
  exercise_display_subtitle: string
  region: string | null
  position: number
  planned_sets: number
  rep_low_override: number | null
  rep_high_override: number | null
  increment_override_kg: number | null
  exercise_default_increment_kg: number | null
}

// Rep range and weight step of the workout an exercise sits in -- what the
// progression engine needs outside a tracking session (#124).
export interface ProgressionContext {
  workout_id: string
  workout_name: string
  rep_low: number
  rep_high: number
  increment_kg: number | null
}

export interface ExerciseHistoryEntry {
  session_id: string
  started_at: string
  best_e1rm: number
  top_weight_kg: number
  best_reps: number
  volume_kg: number
  sets_count: number
}

export interface TopExercise {
  exercise_id: string
  exercise_display_name: string
  exercise_display_subtitle: string
  sessions: number
  sets_count: number
  volume_kg: number
  top_weight_kg: number
  last_performed_at: string
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
  // Rolling 7-day windows (now-7d..now / now-14d..now-7d), not calendar
  // weeks -- what the dashboard cards actually read (BACKLOG #31). Kept
  // alongside this_week/last_week rather than replacing them: an installed
  // PWA can run the previous bundle for one launch after a deploy.
  last_7_days: WeeklyMetrics
  prev_7_days: WeeklyMetrics
  // The selected dashboard range (`days` query param) vs. the same length
  // before it, in local calendar days (BACKLOG #82). Optional: absent on an
  // older API.
  window_current?: WeeklyMetrics
  window_previous?: WeeklyMetrics
  weeks: MuscleVolumeWeek[]
}

export interface MuscleVolumeResponse {
  regions: MuscleVolumeRegion[]
}

export interface AcwrWeek {
  week_start: string
  ratio: number
}

// Recovery tendency (BACKLOG #129): share of exercises whose latest session
// fell below their recent level. `unknown` = too few rated exercises.
export interface RecoveryResponse {
  status: 'on_track' | 'watch' | 'deload' | 'unknown'
  total: number
  falling: number
  rising: number
  falling_share_pct: number
  drop_pct: number
  watch_share_pct: number
  deload_share_pct: number
  exercises: {
    exercise_id: string
    exercise_display_name: string
    last_session_at: string
    change_pct: number
    trend: 'falling' | 'steady' | 'rising'
  }[]
}

export interface AcwrResponse {
  acute_kg: number
  chronic_kg: number
  ratio: number
  weekly_series: AcwrWeek[]
  // One ratio per day over the requested range, oldest first; ratio is null
  // before any load exists. Optional: absent on an older API (BACKLOG #83).
  daily_series?: AcwrDay[]
}

export interface AcwrDay {
  date: string
  ratio: number | null
}

export interface SessionVolume {
  session_id: string
  date: string
  volume_kg: number
}

export interface SessionVolumesResponse {
  sessions: SessionVolume[]
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

export interface RegionMetrics {
  sets: number
  volume_kg: number
  best_e1rm: number
}

export interface WorkoutMuscleSplitSession {
  session_id: string
  started_at: string
  ended_at: string | null
  // Timestamp of the latest logged working set; null for an older API.
  last_set_at?: string | null
  // Weighted sets per region -- unchanged shape, so a cached older client
  // keeps working after a deploy.
  by_region: Record<string, number>
  metrics_by_region: Record<string, RegionMetrics>
  // Whole-session totals (not region-weighted). e1rm_index = Σ best e1RM per
  // exercise. Optional: absent on an older API.
  totals?: { sets: number; volume_kg: number; e1rm_index: number }
}

export interface WorkoutMuscleSplitResponse {
  sessions: WorkoutMuscleSplitSession[]
}

export interface Workout {
  id: string
  name: string
  group_id: string | null
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

// The session a just-finished one is compared against. `scope` says whether
// it was the same workout or -- when that workout has no history yet -- the
// most recent session of any workout.
export interface PreviousSession {
  session_id: string
  started_at: string
  workout_name: string | null
  volume_kg: number
  sets_count: number
  scope: 'same_workout' | 'any_workout'
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

// One request for the whole Body dashboard: every measurement, oldest
// first, with its values inlined (GET /bia/series).
export interface BiaSeriesEntry extends BiaMeasurement {
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
