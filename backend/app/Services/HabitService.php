<?php

namespace App\Services;

use App\Models\AdhkarLog;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\LearningSession;
use App\Models\NutritionLog;
use App\Models\PrayerLog;
use App\Models\QuranLog;
use App\Models\RunningLog;
use App\Models\SleepLog;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class HabitService
{
    public function __construct(private RestDayService $restDays) {}

    /** Re-derive auto-tracked habits for a date from the underlying logs. */
    public function syncAutoHabits(int $userId, string $date): void
    {
        $habits = Habit::where('user_id', $userId)->whereNotNull('system_key')->get();
        if ($habits->isEmpty()) {
            return;
        }
        $user = User::find($userId);
        if (! $user) {
            return;
        }
        foreach ($habits as $habit) {
            $done = $this->evaluate($user, $habit->system_key, $date);
            if ($done) {
                HabitLog::updateOrCreate(['habit_id' => $habit->id, 'date' => $date], ['user_id' => $userId, 'completed' => true]);
            } else {
                HabitLog::where('habit_id', $habit->id)->whereDate('date', $date)->delete();
            }
        }
    }

    public function evaluate(User $user, string $key, string $date): bool
    {
        $uid = $user->id;
        $profile = $user->getProfile();

        return match ($key) {
            'salah' => PrayerLog::where('user_id', $uid)->whereDate('date', $date)->where('status', '!=', 'missed')->count() >= 5,
            'quran' => QuranLog::where('user_id', $uid)->whereDate('date', $date)->where(fn ($q) => $q->where('pages_read', '>', 0)->orWhere('minutes', '>', 0))->exists(),
            'morning_adhkar' => AdhkarLog::where('user_id', $uid)->whereDate('date', $date)->where('type', 'morning')->where('completed', true)->exists(),
            'evening_adhkar' => AdhkarLog::where('user_id', $uid)->whereDate('date', $date)->where('type', 'evening')->where('completed', true)->exists(),
            'workout' => RunningLog::where('user_id', $uid)->whereDate('date', $date)->exists()
                || Workout::where('user_id', $uid)->where('is_template', false)->whereDate('date', $date)->exists(),
            'study' => LearningSession::where('user_id', $uid)->whereDate('date', $date)->sum('minutes') >= $profile->goal('study_minutes'),
            'water' => NutritionLog::where('user_id', $uid)->whereDate('date', $date)->sum('water_ml') >= $profile->goal('water_ml'),
            'sleep_on_time' => $this->sleptOnTime($user, $date),
            default => false,
        };
    }

    private function sleptOnTime(User $user, string $date): bool
    {
        // The habit for date D is about going to bed on the night of D, logged on D+1's sleep log.
        $log = SleepLog::where('user_id', $user->id)->whereDate('date', Carbon::parse($date)->addDay())->first();
        if (! $log) {
            return false;
        }
        $bed = TimeHelper::toMinutes($log->bedtime);
        $target = TimeHelper::toMinutes($user->getProfile()->sleep_time);
        if ($bed < 12 * 60) {
            $bed += 1440;
        }
        if ($target < 12 * 60) {
            $target += 1440;
        }

        return $bed <= $target + 30;
    }

    /** Toggle a manual habit for a date. Returns the new completed state. */
    public function toggle(Habit $habit, string $date, ?bool $completed = null): bool
    {
        $log = HabitLog::where('habit_id', $habit->id)->whereDate('date', $date)->first();
        $target = $completed ?? ! $log;
        if ($target && ! $log) {
            HabitLog::create(['habit_id' => $habit->id, 'user_id' => $habit->user_id, 'date' => $date, 'completed' => true]);
        } elseif (! $target && $log) {
            $log->delete();
        }

        return $target;
    }

    /** Habits for a date with completion state, streaks and the last 7 days. */
    public function forDate(User $user, string $date): array
    {
        $habits = Habit::ownedBy($user->id)->orderBy('sort_order')->orderBy('id')->get();
        $from = Carbon::parse($date)->subDays(400)->toDateString();
        $logs = HabitLog::ownedBy($user->id)->whereBetween('date', [$from, $date])->where('completed', true)->get()
            ->groupBy('habit_id')->map(fn ($c) => $c->map(fn ($l) => $l->date->toDateString())->flip());
        $restCache = [];
        $isRest = function (string $d) use ($user, &$restCache) {
            return $restCache[$d] ??= $this->restDays->isRestDay($user, Carbon::parse($d));
        };

        $week = collect(CarbonPeriod::create(Carbon::parse($date)->subDays(6), Carbon::parse($date)))->map->toDateString()->all();

        return $habits->map(function (Habit $h) use ($logs, $date, $week, $isRest) {
            $set = $logs->get($h->id, collect());
            [$current, $best] = $this->streaks($h, $set, $date, $isRest);

            return $h->toArray() + [
                'completed' => $set->has($date),
                'auto' => (bool) $h->system_key,
                'auto_description' => $h->system_key ? (Habit::SYSTEM_KEYS[$h->system_key] ?? null) : null,
                'current_streak' => $current,
                'best_streak' => $best,
                'week' => array_map(fn ($d) => ['date' => $d, 'completed' => $set->has($d), 'rest' => $h->rest_day_exempt && $isRest($d)], $week),
            ];
        })->values()->all();
    }

    /**
     * Daily habits: consecutive completed days (rest days skipped for exempt habits; an
     * unfinished today never breaks the streak). Weekly habits: consecutive weeks meeting target.
     *
     * @return array{0:int,1:int}
     */
    public function streaks(Habit $h, Collection $doneSet, string $upTo, callable $isRest): array
    {
        $limit = Carbon::parse($upTo)->subDays(400);
        $start = $h->created_at ? Carbon::parse($h->created_at->toDateString()) : $limit->copy();
        if ($start->lt($limit)) {
            $start = $limit->copy();
        }
        // Include logged history that predates the habit record (e.g. restored backups).
        $firstLog = $doneSet->keys()->min();
        if ($firstLog && $firstLog < $start->toDateString()) {
            $start = Carbon::parse(max($firstLog, $limit->toDateString()));
        }
        $end = Carbon::parse($upTo);

        if ($h->frequency === 'weekly') {
            $weeks = [];
            foreach ($doneSet->keys() as $d) {
                $weeks[Carbon::parse($d)->startOfWeek()->toDateString()] = ($weeks[Carbon::parse($d)->startOfWeek()->toDateString()] ?? 0) + 1;
            }
            $best = 0; $run = 0; $current = 0;
            for ($w = $start->copy()->startOfWeek(); $w <= $end; $w->addWeek()) {
                $met = ($weeks[$w->toDateString()] ?? 0) >= $h->target_per_week;
                $isCurrentWeek = $w->toDateString() === $end->copy()->startOfWeek()->toDateString();
                if ($met) {
                    $run++;
                } elseif (! $isCurrentWeek) {
                    $run = 0;
                }
                $best = max($best, $run);
                $current = $run;
            }

            return [$current, $best];
        }

        $best = 0; $run = 0;
        for ($d = $start->copy(); $d <= $end; $d->addDay()) {
            $ds = $d->toDateString();
            if ($doneSet->has($ds)) {
                $run++;
            } elseif ($h->rest_day_exempt && $isRest($ds)) {
                continue;
            } elseif ($ds !== $upTo) {
                $run = 0;
            }
            $best = max($best, $run);
        }

        return [$run, $best];
    }

    /** Earliest logged date per habit: a habit applies from its creation or first log, whichever is earlier. */
    public function firstLogDates(int $userId): array
    {
        return HabitLog::where('user_id', $userId)->groupBy('habit_id')->selectRaw('habit_id, MIN(date) as first_date')
            ->pluck('first_date', 'habit_id')->map(fn ($d) => Carbon::parse($d)->toDateString())->all();
    }

    /** Monthly heatmap, per-habit consistency and missed-habit analysis. */
    public function stats(User $user, string $from, string $to): array
    {
        $tz = $user->getProfile()->timezone ?: 'UTC';
        $today = Carbon::now($tz)->toDateString();
        $lastDay = min($to, $today);
        $habits = Habit::ownedBy($user->id)->where('is_active', true)->orderBy('sort_order')->get();
        $logs = HabitLog::ownedBy($user->id)->whereBetween('date', [$from, $to])->where('completed', true)->get();
        $byHabit = $logs->groupBy('habit_id')->map(fn ($c) => $c->map(fn ($l) => $l->date->toDateString())->flip());
        $byDate = $logs->groupBy(fn ($l) => $l->date->toDateString());
        $restCache = [];
        $isRest = function (string $d) use ($user, &$restCache) {
            return $restCache[$d] ??= $this->restDays->isRestDay($user, Carbon::parse($d));
        };
        $firstLogs = $this->firstLogDates($user->id);
        $createdOn = fn (Habit $h) => min(array_filter([
            $h->created_at ? $h->created_at->copy()->setTimezone($tz)->toDateString() : $from,
            $firstLogs[$h->id] ?? null,
        ]));

        $days = $from <= $lastDay ? collect(CarbonPeriod::create($from, $lastDay))->map->toDateString() : collect();

        $heatmap = collect(CarbonPeriod::create($from, $to))->map(function ($d) use ($habits, $byDate, $isRest, $createdOn, $lastDay) {
            $ds = $d->toDateString();
            if ($ds > $lastDay) {
                return ['date' => $ds, 'rate' => null, 'done' => 0, 'total' => 0];
            }
            $due = $habits->filter(fn ($h) => $h->frequency === 'daily' && $createdOn($h) <= $ds && ! ($h->rest_day_exempt && $isRest($ds)));
            $doneIds = ($byDate[$ds] ?? collect())->pluck('habit_id')->all();
            $done = $due->filter(fn ($h) => in_array($h->id, $doneIds, true))->count();

            return ['date' => $ds, 'rate' => $due->count() ? (int) round($done / $due->count() * 100) : null, 'done' => $done, 'total' => $due->count()];
        })->values();

        $weekdayMisses = array_fill(0, 7, 0);
        $perHabit = $habits->map(function (Habit $h) use ($days, $byHabit, $isRest, $createdOn, $lastDay, &$weekdayMisses) {
            $set = $byHabit->get($h->id, collect());
            $eligible = 0; $done = 0;
            if ($h->frequency === 'weekly') {
                $weeks = $days->groupBy(fn ($d) => Carbon::parse($d)->startOfWeek()->toDateString());
                $rates = $weeks->map(fn ($ds) => min(1, $ds->filter(fn ($d) => $set->has($d))->count() / max(1, $h->target_per_week)));
                $rate = $rates->count() ? (int) round($rates->avg() * 100) : null;
                $done = $set->count();
                $eligible = $weeks->count() * $h->target_per_week;
            } else {
                foreach ($days as $d) {
                    if ($createdOn($h) > $d || ($h->rest_day_exempt && $isRest($d))) {
                        continue;
                    }
                    if ($d === $lastDay && ! $set->has($d)) {
                        continue; // today is still in progress
                    }
                    $eligible++;
                    if ($set->has($d)) {
                        $done++;
                    } else {
                        $weekdayMisses[Carbon::parse($d)->dayOfWeek]++;
                    }
                }
                $rate = $eligible ? (int) round($done / $eligible * 100) : null;
            }
            [$current, $best] = $this->streaks($h, $set, $lastDay, $isRest);

            return [
                'id' => $h->id, 'name' => $h->name, 'category' => $h->category, 'color' => $h->color, 'frequency' => $h->frequency,
                'done' => $done, 'eligible' => $eligible, 'missed' => max(0, $eligible - $done), 'rate' => $rate,
                'current_streak' => $current, 'best_streak' => $best,
            ];
        })->values();

        $names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $rates = $perHabit->pluck('rate')->filter(fn ($r) => $r !== null);

        return [
            'from' => $from,
            'to' => $to,
            'overall_rate' => $rates->count() ? (int) round($rates->avg()) : null,
            'heatmap' => $heatmap,
            'habits' => $perHabit,
            'most_missed' => $perHabit->where('missed', '>', 0)->sortByDesc('missed')->take(3)->values(),
            'weekday_misses' => collect($weekdayMisses)->map(fn ($c, $i) => ['day' => $names[$i], 'missed' => $c])->values(),
        ];
    }
}
