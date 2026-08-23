-- Workout Tracker — schema (CLAUDE.md §6)
-- Conventions: syncable tables use TEXT id (client-generated UUID) + updated_at (ISO-8601 UTC)
-- + deleted_at (soft delete, NULL = active). Reference/seed tables (muscles, training_modes)
-- use INTEGER PK. Portable ANSI SQL — no SQLite-only syntax (MySQL fallback via repository layer).
-- PRAGMA foreign_keys=ON is set by the connection (Db.php), not here — MySQL has no such pragma.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS training_modes (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  name TEXT,
  rep_low INTEGER,
  rep_high INTEGER,
  sort INTEGER
);

CREATE TABLE IF NOT EXISTS muscles (
  id INTEGER PRIMARY KEY,
  name_en TEXT,
  region TEXT,
  sort INTEGER
);

-- Weekly working-set volume landmarks per muscle region (CLAUDE.md §8:
-- "Bewertung an MEV/MAV/MRV") -- dedicated reference table, same pattern as
-- training_modes/muscles, rather than overloading the generic settings KV
-- store with 18 prefixed keys.
CREATE TABLE IF NOT EXISTS muscle_volume_targets (
  region TEXT PRIMARY KEY,
  mev INTEGER,
  mav INTEGER,
  mrv INTEGER
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT,
  movement TEXT,
  equipment TEXT,
  mechanic TEXT,
  category TEXT,
  default_increment_kg REAL,
  source TEXT,
  external_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS exercise_muscles (
  exercise_id TEXT,
  muscle_id INTEGER,
  role TEXT,
  weight REAL,
  PRIMARY KEY (exercise_id, muscle_id)
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  kind TEXT,
  exercise_id TEXT,
  bia_measurement_id TEXT,
  path TEXT,
  mime TEXT,
  sort INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  name TEXT,
  mode_id INTEGER,
  notes TEXT,
  archived INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT,
  exercise_id TEXT,
  position INTEGER,
  planned_sets INTEGER,
  rep_low_override INTEGER,
  rep_high_override INTEGER,
  increment_override_kg REAL,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  workout_id TEXT,
  started_at TEXT,
  ended_at TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  exercise_id TEXT,
  workout_exercise_id TEXT,
  set_index INTEGER,
  weight_kg REAL,
  reps INTEGER,
  is_warmup INTEGER DEFAULT 0,
  rpe REAL,
  performed_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS bodyweight (
  id TEXT PRIMARY KEY,
  measured_at TEXT,
  weight_kg REAL,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY,
  measured_at TEXT,
  site TEXT,
  value_cm REAL,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS bia_measurements (
  id TEXT PRIMARY KEY,
  measured_at TEXT,
  source TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS bia_values (
  id TEXT PRIMARY KEY,
  measurement_id TEXT,
  category TEXT,
  subcategory TEXT,
  metric TEXT,
  value_num REAL,
  value_text TEXT,
  unit TEXT,
  ref_low REAL,
  ref_high REAL
);

CREATE TABLE IF NOT EXISTS hr_samples (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  ts TEXT,
  bpm INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sets_exercise_performed ON sets(exercise_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workout_started ON sessions(workout_id, started_at);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_position ON workout_exercises(workout_id, position);
CREATE INDEX IF NOT EXISTS idx_bia_values_measurement ON bia_values(measurement_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON exercise_muscles(muscle_id);
