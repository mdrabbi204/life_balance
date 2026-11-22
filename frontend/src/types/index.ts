export type ID = number

export interface Profile {
  wake_time: string; sleep_time: string; office_start: string; office_end: string
  commute_minutes: number; transport: string; morning_activity: string; career_title: string
  tech_interests: string[] | null; bio: string | null
  city: string; country: string; latitude: number; longitude: number; timezone: string
  prayer_method: string; asr_method: string; high_lat_rule: string; prayer_provider: string
  prayer_adjustments: Record<string, number> | null
  prayer_duration_minutes: number; jumuah_duration_minutes: number
  theme: 'light' | 'dark' | 'system'
  score_weights: Record<string, number> | null
  goals: Record<string, number> | null
  rest_days: number[] | null
}

export interface User { id: ID; name: string; email: string; avatar_url: string | null; profile?: Profile }

export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type PrayerStatus = 'on_time' | 'delayed' | 'missed'

export interface PrayerTimes {
  date: string
  times: Record<Prayer | 'sunrise' | 'sunset', string>
  source: string; method: string; asr_method: string; timezone: string
  windows?: Record<Prayer, [string, string]>
  tomorrow_fajr?: string
  location?: { city: string; country: string }
}

export interface PrayerLog { id: ID; date: string; prayer: Prayer; status: PrayerStatus; prayed_at: string | null; in_congregation: boolean; notes: string | null }
export interface QuranLog { id: ID; date: string; pages_read: number; surah_number: number | null; ayah_from: number | null; ayah_to: number | null; minutes: number; notes: string | null }
export interface AdhkarLog { id: ID; date: string; type: 'morning' | 'evening' | 'sleep' | 'custom'; name: string; count: number; target: number; completed: boolean }
export interface IslamicLearningLog { id: ID; date: string; type: 'lecture' | 'hadith' | 'book' | 'other'; title: string; source: string | null; minutes: number; notes: string | null }

export type TopicStatus = 'not_started' | 'learning' | 'practicing' | 'completed'
export interface LearningTopic { id: ID; name: string; category: string; status: TopicStatus; progress: number; target_date: string | null; notes: string | null; sort_order: number; minutes_total: number | null; sessions_count: number }
export interface LearningSession { id: ID; date: string; minutes: number; learning_topic_id: ID | null; topic?: { id: ID; name: string } | null; topics_studied: string | null; challenges_solved: number; github_contributions: number; notes: string | null }

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export interface Project { id: ID; name: string; description: string | null; technologies: string[] | null; start_date: string | null; target_date: string | null; priority: Priority; status: 'planning' | 'active' | 'on_hold' | 'completed'; progress: number; tasks_count?: number; done_tasks_count?: number; tasks?: ProjectTask[] }
export interface ProjectTask { id: ID; project_id: ID; title: string; description: string | null; status: TaskStatus; priority: Priority; due_date: string | null; position: number; project?: { id: ID; name: string } }

export interface RunningLog { id: ID; date: string; distance_km: number; duration_seconds: number; pace_seconds_per_km: number | null; calories: number | null; notes: string | null }
export interface WorkoutExercise { id?: ID; name: string; category: string; sets: number; reps: number; weight_kg: number | null }
export interface Workout { id: ID; date: string | null; name: string; type: string; is_template: boolean; duration_minutes: number | null; notes: string | null; exercises: WorkoutExercise[] }
export interface NutritionLog { id: ID; date: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'water'; description: string | null; calories: number; protein_g: number; water_ml: number }
export interface SleepLog { id: ID; date: string; bedtime: string; wake_time: string; duration_minutes: number; quality: number; notes: string | null }

export interface Habit {
  id: ID; name: string; category: 'deen' | 'career' | 'fitness' | 'productivity' | 'personal'; icon: string; color: string
  frequency: 'daily' | 'weekly'; target_per_week: number; rest_day_exempt: boolean; system_key: string | null; is_active: boolean; sort_order: number
  completed?: boolean; auto?: boolean; auto_description?: string | null; current_streak?: number; best_streak?: number
  week?: { date: string; completed: boolean; rest: boolean }[]
}

export interface Schedule {
  id: ID; title: string; category: string; start_time: string; end_time: string; is_recurring: boolean; days_of_week: number[] | null
  date: string | null; is_flexible: boolean; skip_on_rest_day: boolean; reminder_minutes: number | null; color: string | null; notes: string | null; is_active: boolean
}

export interface TimelineItem {
  key: string; is_prayer: boolean; prayer?: Prayer; schedule_id?: ID; title: string; category: string; color?: string | null
  start: string; end: string; start_min: number; end_min: number; duration: number
  status: string; adjustment: string | null; segment: number; is_current: boolean; is_past: boolean
  is_flexible?: boolean; rescheduled?: boolean; reminder_minutes?: number | null; original_start?: string; original_end?: string; notes?: string | null
}

export interface DayTimeline {
  date: string; is_rest_day: boolean; prayer_times: PrayerTimes; items: TimelineItem[]
  conflicts: { type: 'salah' | 'overlap'; title: string; message: string }[]
  summary: { planned: number; completed: number; skipped: number; pending: number }
}

export type ScoreKey = 'deen' | 'career' | 'fitness' | 'productivity' | 'family'
export interface DayScore {
  date: string; is_rest_day: boolean
  scores: Record<ScoreKey | 'overall', number | null>
  discipline: number | null; completion: number
  metrics: {
    salah: { prayed: number; on_time: number; delayed: number; missed: number; due: number }
    quran: { pages: number; minutes: number; goal: number; done: boolean }
    adhkar: { morning: boolean; evening: boolean }
    study: { minutes: number; goal: number; challenges: number; tasks_done: number }
    workout: { done: boolean; run_km: number; workouts: number; rest_day: boolean }
    sleep: { minutes: number; quality: number; bedtime: string; wake_time: string } | null
    nutrition: { water_ml: number; water_goal: number; protein_g: number; protein_goal: number; calories: number; calorie_goal: number }
    habits: { done: number; total: number }
    schedule: { planned: number; done: number; ended: number }
    tasks: { due: number; due_done: number }
  }
}

export interface Reminder {
  id: ID; type: string; title: string; message: string | null; enabled: boolean; time: string | null; minutes_before: number | null
  interval_minutes: number | null; window_start: string | null; window_end: string | null; days_of_week: number[] | null
}
