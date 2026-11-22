<?php

namespace App\Services;

use App\Models\AdhkarLog;
use App\Models\DailySchedule;
use App\Models\DayOverride;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\LearningSession;
use App\Models\NutritionLog;
use App\Models\PrayerLog;
use App\Models\ProjectTask;
use App\Models\QuranLog;
use App\Models\RunningLog;
use App\Models\ScheduleOccurrence;
use App\Models\SleepLog;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Workout;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * All of a user's tracked data for a date range, loaded with a fixed number of queries
 * and grouped by date — used to compute scores and reports without N+1 queries.
 */
class DayBundle
{
    /** @var array<string, Collection> */
    private array $grouped = [];

    public Collection $habits;
    public Collection $schedules;
    public Collection $overrides;
    public UserProfile $profile;
    public array $habitFirstLogs = [];

    public function __construct(public User $user, public string $from, public string $to) {}

    public static function load(User $user, string $from, string $to): self
    {
        $b = new self($user, $from, $to);
        $b->profile = $user->getProfile();
        $uid = $user->id;
        $range = fn ($q) => $q->where('user_id', $uid)->whereBetween('date', [$from, $to]);
        $group = fn (Collection $c) => $c->groupBy(fn ($r) => $r->date->toDateString());

        $b->grouped['prayers'] = $group($range(PrayerLog::query())->get());
        $b->grouped['quran'] = $group($range(QuranLog::query())->get());
        $b->grouped['adhkar'] = $group($range(AdhkarLog::query())->get());
        $b->grouped['sessions'] = $group($range(LearningSession::query())->get());
        $b->grouped['runs'] = $group($range(RunningLog::query())->get());
        $b->grouped['workouts'] = $group($range(Workout::query())->where('is_template', false)->get());
        $b->grouped['nutrition'] = $group($range(NutritionLog::query())->get());
        $b->grouped['sleep'] = $group($range(SleepLog::query())->get());
        $b->grouped['habitLogs'] = $group($range(HabitLog::query())->where('completed', true)->get());
        $b->grouped['occurrences'] = $group($range(ScheduleOccurrence::query())->get());
        $b->overrides = $range(DayOverride::query())->get();

        $tz = $b->profile->timezone ?: 'UTC';
        $tasks = ProjectTask::where('user_id', $uid)
            ->where(fn ($q) => $q->whereBetween('due_date', [$from, $to])
                ->orWhereBetween('completed_at', [Carbon::parse($from, $tz)->startOfDay()->utc(), Carbon::parse($to, $tz)->endOfDay()->utc()]))
            ->get();
        $b->grouped['tasksDue'] = $tasks->filter(fn ($t) => $t->due_date)->groupBy(fn ($t) => $t->due_date->toDateString());
        $b->grouped['tasksDone'] = $tasks->filter(fn ($t) => $t->completed_at)->groupBy(fn ($t) => $t->completed_at->copy()->setTimezone($tz)->toDateString());

        $b->habits = Habit::where('user_id', $uid)->where('is_active', true)->orderBy('sort_order')->get();
        $b->habitFirstLogs = app(HabitService::class)->firstLogDates($uid);
        $b->schedules = DailySchedule::where('user_id', $uid)->where('is_active', true)->get();

        return $b;
    }

    public function on(string $key, string $date): Collection
    {
        return $this->grouped[$key][$date] ?? collect();
    }

    public function isRestDay(CarbonInterface $date): bool
    {
        $o = $this->overrides->first(fn ($o) => $o->date->toDateString() === $date->toDateString());
        if ($o) {
            return $o->is_rest_day;
        }

        return in_array($date->dayOfWeek, $this->profile->rest_days ?? [], true);
    }

    /** Daily habits that apply on a date (created by then, not rest-exempt on rest days). */
    public function habitsDueOn(string $date): Collection
    {
        $tz = $this->profile->timezone ?: 'UTC';
        $rest = $this->isRestDay(Carbon::parse($date));

        return $this->habits->filter(function (Habit $h) use ($date, $tz, $rest) {
            if ($h->frequency !== 'daily') {
                return false;
            }
            $first = $this->habitFirstLogs[$h->id] ?? null;
            if ($h->created_at && $h->created_at->copy()->setTimezone($tz)->toDateString() > $date && (! $first || $first > $date)) {
                return false;
            }

            return ! ($rest && $h->rest_day_exempt);
        });
    }
}
