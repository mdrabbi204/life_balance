# LifeBalance — Architecture, Schema & Development Plan

## 1. System overview

```
┌──────────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│ frontend/  (SPA)             │  ─────────────────────────► │ backend/  (Laravel REST API) │
│ React 19 + TypeScript + Vite │   Bearer token (Sanctum)    │ Sanctum auth · FormRequests  │
│ Tailwind 4 + shadcn/ui-style │ ◄─────────────────────────  │ Services · Eloquent models   │
│ Recharts · Lucide · TanStack │                             │ PrayerTimeService            │
│ Query · React Router         │                             │   (local astronomical calc + │
│ Browser Notification API     │                             │    optional Aladhan API)     │
└──────────────────────────────┘                             └──────────────┬───────────────┘
                                                                            │
                                                                     ┌──────▼──────┐
                                                                     │   MySQL 8   │
                                                                     └─────────────┘
```

### Backend layers (`backend/app`)
| Layer | Responsibility |
|---|---|
| `Http/Controllers/Api` | Thin controllers: authorize → validate (FormRequest) → call service/model → return JSON Resource |
| `Http/Requests` | All validation rules |
| `Models` | Eloquent models; every user-owned model uses `BelongsToUser` trait (global user scoping helpers) |
| `Services` | Domain logic: `PrayerTimeService`, `ScheduleService` (Salah-aware time-blocking, overlap detection), `ScoreService` (life-balance scores), `HabitService` (streaks/heatmap), `ReportService` (aggregations), `DefaultDataSeeder` (per-user defaults on registration) |
| `Policies` | Ownership checks — a user can only touch their own records |

### Frontend structure (`frontend/src`)
| Folder | Responsibility |
|---|---|
| `lib/` | `api.ts` (axios + token), `utils.ts`, `date.ts`, `export.ts` (CSV/PDF) |
| `components/ui/` | shadcn/ui-style primitives (Button, Card, Dialog, Select, Tabs, …) built on Radix |
| `components/` | Shared composite components (StatCard, ProgressRing, EmptyState, PageHeader, CrudDialog, …) |
| `features/<module>/` | Pages + module components: dashboard, myday, islamic, career, fitness, habits, calendar, reports, settings, auth |
| `hooks/` | `useAuth`, `useNotifications`, `useNow`, query hooks |

## 2. Prayer-time strategy (never hard-coded)
* `PrayerTimeService` computes times from **latitude, longitude, timezone, calculation method and Asr juristic method** stored in the user's profile, using the standard astronomical algorithm (sun declination + equation of time, as used by PrayTimes.org / most Islamic calendars).
* Supported methods: Karachi (default for Bangladesh), MWL, ISNA, Egypt, Makkah (Umm al-Qura), Dubai, Kuwait, Qatar, Singapore, Turkey, Tehran.
* Optional provider `aladhan`: fetches from `api.aladhan.com` and caches per day; falls back to local calculation if offline.
* Per-prayer minute adjustments are configurable.

## 3. Salah-aware scheduling rules
* Daily schedule blocks are stored as recurring templates (`daily_schedules`, with `days_of_week`) or one-off date entries.
* `ScheduleService::forDate()` builds the day: it injects prayer blocks (prayer time → +`prayer_duration` minutes), and any activity overlapping a prayer is **split / shifted** around it (prayer always wins). Conflicts are reported back so the UI can show them.
* Blocks marked `is_rest_day` days skip workout blocks; overlapping user blocks are flagged.

## 4. Scoring (no reward for excess, no penalty for rest)
Each domain score is 0–100 and **capped** at target (doing 4h when target is 2h = 100, not 200).
* **Deen**: Salah (on-time 1.0, delayed 0.6, missed 0) 60%, Quran target 20%, Adhkar 20%.
* **Career**: study minutes vs. daily target (capped) 70%, learning-session/project-task activity 30%.
* **Fitness**: on a rest day the workout component is excluded (not counted as zero); sleep quality + nutrition/water fill the rest.
* **Productivity**: completed vs. planned schedule blocks & tasks due today.
* **Personal/Family**: family-time habit + sleep on time + custom personal habits.
* **Overall** = weighted average with user-configurable weights (stored in `user_profiles.score_weights`).
* **Discipline score**: share of items completed *on time* (Salah on time, habits checked, blocks done).

## 5. Database schema

All tables have `id` (bigint PK), `created_at`, `updated_at`. All user data has `user_id` FK → `users.id` `ON DELETE CASCADE`.

| Table | Key columns |
|---|---|
| `users` | name, email (unique), password, avatar_path |
| `personal_access_tokens` | Sanctum |
| `user_profiles` | user_id (unique), wake_time, sleep_time, office_start, office_end, commute_minutes, transport, morning_activity, career_title, tech_interests (json), city, country, latitude, longitude, timezone, prayer_method, asr_method, prayer_provider, prayer_adjustments (json), prayer_duration_minutes, theme, score_weights (json), goals (json: quran_pages, study_minutes, water_ml, sleep_hours, protein_g, calories, weekly_run_km, workouts_per_week), notification_settings (json), rest_days (json) |
| `prayer_logs` | user_id, date, prayer (enum fajr..isha), status (on_time/delayed/missed), prayed_at, notes · unique(user_id,date,prayer) |
| `quran_logs` | user_id, date, pages_read, surah_from, surah_to, ayah_from, ayah_to, minutes, notes |
| `adhkar_logs` | user_id, date, type (morning/evening/sleep/custom), name, count, target, completed |
| `islamic_learning_logs` | user_id, date, type (lecture/hadith/book), title, source, minutes, notes |
| `learning_topics` | user_id, name, category, status (not_started/learning/practicing/completed), progress, target_date, notes, sort_order |
| `learning_sessions` | user_id, learning_topic_id (nullable FK), date, minutes, topics_studied, challenges_solved, notes |
| `projects` | user_id, name, description, technologies (json), start_date, target_date, priority, status, progress (derived from tasks when tasks exist) |
| `project_tasks` | project_id, user_id, title, description, status (todo/in_progress/review/done), priority, due_date, position |
| `running_logs` | user_id, date, distance_km, duration_seconds, pace_seconds_per_km (computed), calories (estimated), notes |
| `workouts` | user_id, date (nullable for templates), name, type (push/pull/legs/core/full/custom), is_template, duration_minutes, notes |
| `workout_exercises` | workout_id, name, category, sets, reps, weight_kg, position |
| `nutrition_logs` | user_id, date, meal (breakfast/lunch/dinner/snack/water), description, calories, protein_g, water_ml |
| `sleep_logs` | user_id, date (wake date), bedtime, wake_time, duration_minutes (computed), quality 1–5, notes |
| `habits` | user_id, name, category (deen/career/fitness/productivity/personal), icon, color, frequency (daily/weekly), target_per_week, is_active, sort_order, system_key |
| `habit_logs` | habit_id, user_id, date, completed · unique(habit_id,date) |
| `daily_schedules` | user_id, title, category, start_time, end_time, days_of_week (json), date (nullable one-off), is_recurring, is_flexible, skip_on_rest_day, reminder_minutes, color, notes |
| `schedule_completions` | user_id, daily_schedule_id, date, status (done/skipped) |
| `notifications` | user_id, type, title, enabled, time (nullable), interval_minutes, days_of_week, last_sent_at |

## 6. REST API (prefix `/api`, Bearer token)
```
POST /auth/register  POST /auth/login  POST /auth/logout  GET /auth/me
GET/PUT /profile     POST /profile/avatar
GET /prayer-times?date=            GET /prayer-times/month?month=
GET /dashboard?date=               GET /scores?date=
apiResource: prayer-logs (upsert), quran-logs, adhkar-logs, islamic-learning,
             learning-topics, learning-sessions, projects, project-tasks (+PATCH move),
             running-logs, workouts (+POST {id}/duplicate), nutrition-logs, sleep-logs,
             habits (+POST {id}/toggle), schedules (+POST {id}/complete), notifications
GET /schedule/day?date=            (Salah-aware timeline + conflicts)
GET /habits/stats?month=           GET /reports/summary?from=&to=
GET /reports/salah?period=         GET /backup  POST /restore
```

## 7. Development plan
1. Schema & migrations, models, seeders (demo user + defaults).
2. UI shell: sidebar/topbar/mobile nav, theming (light/dark), routing.
3. Auth (Sanctum tokens) + API foundations (resources, policies, validation, errors).
4. Islamic module: prayer times, Salah tracker + reports, Quran, Adhkar + counter, learning.
5. Career: coding tracker, roadmap, projects + Kanban.
6. Fitness: running, strength planner/templates, nutrition, sleep.
7. Habits (checklist, weekly calendar, heatmap, streaks), calendar/time-blocking, reminders.
8. Reports & analytics with CSV/PDF export.
9. Feature tests + manual end-to-end pass.
10. Setup & deployment docs (`README.md`, `docs/DEPLOYMENT.md`).
