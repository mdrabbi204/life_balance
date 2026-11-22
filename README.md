# LifeBalance

A personal daily-life management app for a practicing Muslim, software engineer and fitness-focused person. It plans the day around Salah and tracks Quran, adhkar, Islamic learning, programming study, projects, running, strength training, nutrition, sleep and habits. It also turns everything you log into an honest life-balance score.

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui-style components (Radix), Lucide, Recharts, TanStack Query |
| Backend | Laravel 13 REST API, Sanctum token auth, MySQL 8 |
| Prayer times | Calculated with an astronomical algorithm from your coordinates, date, method and Asr school (optionally from the Aladhan API). Never hard-coded. |

Architecture, the database schema and scoring rules are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Production setup is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Features

- **Dashboard**: greeting, completion %, discipline score, life-balance ring, five area scores with configurable weights, a 7-day trend, a live next-Salah countdown, progress cards (Salah, Quran, programming, workout, water with quick-add, sleep), today's plan and a habit checklist.
- **My Day**: a Salah-aware timeline. You can mark blocks done or skipped, reschedule a single day, toggle a rest day and quick-log Quran, study, runs, meals, water and sleep.
- **Islamic Life**
  - **Salah tracker** with on time / delayed / missed / not yet due, and congregation. It includes daily, weekly and monthly reports and a monthly timetable.
  - **Quran**: pages, surah and ayah range, notes, reading streak and 30-day history.
  - **Adhkar**: morning, evening and before-sleep checklists, plus a tap counter for custom dhikr.
  - **Islamic learning journal**: lectures, hadith and books, with a weekly target.
- **Career**
  - **Coding tracker**: hours, topics, challenges and GitHub contributions.
  - **Learning roadmap**: 17 editable topics with status, progress and target dates.
  - **Projects**: a drag-and-drop Kanban board. Project progress is derived from its tasks.
- **Fitness**
  - **Running**: pace and estimated calories are computed for you, with weekly stats.
  - **Strength**: workout plan templates (push, pull, legs, core and custom), history and weight progression.
  - **Nutrition**: protein, water and calories against goals.
  - **Sleep**: duration and quality, with a chart.
- **Habits**: daily checklist, weekly calendar, monthly heatmap, streaks and missed-habit analysis. Eight default habits are **auto-tracked** from your logs, so you never enter anything twice. Rest-day-exempt habits never break a streak.
- **Calendar**: a week time-grid with Salah blocks injected for each day. Recurring and one-off activities, flexible blocks (moved after Salah) and fixed blocks (split around Salah), with overlap detection.
- **Reports**: daily, weekly and monthly charts for every area, with CSV and PDF export.
- **Reminders**: browser notifications (with your permission) for upcoming Salah, Quran, running, study, water, sleep, schedule blocks and custom reminders. Each one can be turned on or off.
- **Settings**: profile and photo, routine, rest days, location (including "use my location"), timezone, calculation method, Asr school, high-latitude rule, per-prayer minute adjustments, goals, score weights, theme (light, dark or system), JSON backup and restore, and password change.

### Scoring principles
- Every component is **capped at its target**, so doing 4 hours when the goal is 1 hour still scores 100.
- Components that do not apply are **excluded, not counted as zero**: workouts and study on a rest day, a prayer that is not due yet, or a future day.
- The overall score is a weighted average of the five areas, using weights you set.

---

## Local setup

### Requirements
- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo` and `intl`
- Composer 2
- Node.js 20+ and npm
- MySQL 8 (or MariaDB 10.6+)

### 1. Backend (Laravel API)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```
Edit `.env` with your database settings. On WAMP, MySQL usually listens on port **3307**:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=life_balance
DB_USERNAME=root
DB_PASSWORD=
```
Create the database, then migrate and seed:
```bash
mysql -uroot -P3307 -e "CREATE DATABASE life_balance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed
php artisan storage:link
php artisan serve
```
The API runs at `http://127.0.0.1:8000/api`.

`--seed` creates a **demo account**: `demo@lifebalance.test` / `password`. It comes with the default profile, habits, schedule, roadmap, reminders and workout plans. You can also register your own account from the sign-up page; new accounts get the same defaults.

Optional: to fill the demo account with about six weeks of sample activity, so you can explore the charts, run:
```bash
php artisan db:seed --class=DemoHistorySeeder
```
Never run this against a real account.

### 2. Frontend (React SPA)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/storage` to `http://127.0.0.1:8000`, so you don't need any CORS setup locally.

### 3. Tests
The backend tests use a separate MySQL database, `life_balance_test`:
```bash
mysql -uroot -P3307 -e "CREATE DATABASE life_balance_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
cd backend
php artisan test
```
There are 21 tests with 189 assertions. They cover:
- auth
- every module's create, read, update and delete operations, plus validation and ownership isolation
- prayer-time accuracy against the Aladhan reference
- Salah-aware splitting and shifting, and overlap detection
- rest-day scoring
- backup and restore round trips

Frontend checks:
```bash
cd frontend
npm run build
npx oxlint src
```
`npm run build` type-checks and builds the app.

---

## Project structure
```
backend/
  app/Http/Controllers/Api/   Thin controllers (CrudController base: user scoping, search, date filters)
  app/Models/                 Eloquent models (+ BelongsToUser, SyncsHabits traits)
  app/Services/               PrayerTimes/, ScheduleService, ScoreService, HabitService, ReportService, DayBundle, DefaultDataService
  database/migrations/        Full relational schema
  database/seeders/           Demo account + optional history
  tests/                      Feature + unit tests
frontend/src/
  components/ui/              shadcn/ui-style primitives
  components/                 FormDialog (config-driven forms), ResourceTable, charts, layout, NotificationEngine
  features/<module>/          dashboard, myday, islamic, career, fitness, habits, calendar, reports, settings, auth
  lib/                        api client, query hooks, export (CSV/PDF), constants
docs/                         ARCHITECTURE.md, DEPLOYMENT.md
```

## Notes
- **Browser notifications** fire while LifeBalance is open in a tab. In-app toasts always appear. For reminders when the tab is closed you would need a service worker and push notifications; see the roadmap in DEPLOYMENT.md.
- **GitHub contributions** are entered by hand on study sessions. There is no GitHub API integration yet.
- **Calories** for runs are estimated at about 1.04 kcal × body weight (kg) × distance (km). You can override the estimate.
