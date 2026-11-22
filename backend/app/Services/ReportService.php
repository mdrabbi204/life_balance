<?php

namespace App\Services;

use App\Models\LearningTopic;
use App\Models\Project;
use App\Models\User;
use App\Services\PrayerTimes\PrayerTimeService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ReportService
{
    public function __construct(private ScoreService $scores, private ScheduleService $schedule, private HabitService $habits) {}

    public function summary(User $user, string $from, string $to): array
    {
        $bundle = DayBundle::load($user, $from, $to);
        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $d) {
            $date = $d->toDateString();
            $nowMin = $this->schedule->nowMinutes($user, $d);
            $s = $this->scores->day($bundle, $date, $nowMin);
            $m = $s['metrics'];
            $days[] = [
                'date' => $date,
                'is_future' => $nowMin === null,
                'is_rest_day' => $s['is_rest_day'],
                ...$s['scores'],
                'discipline' => $s['discipline'],
                'completion' => $nowMin === null ? null : $s['completion'],
                'salah_on_time' => $m['salah']['on_time'],
                'salah_delayed' => $m['salah']['delayed'],
                'salah_missed' => $m['salah']['missed'],
                'salah_prayed' => $m['salah']['prayed'],
                'quran_pages' => $m['quran']['pages'],
                'quran_minutes' => $m['quran']['minutes'],
                'study_minutes' => $m['study']['minutes'],
                'challenges' => $m['study']['challenges'],
                'run_km' => $m['workout']['run_km'],
                'workouts' => $m['workout']['workouts'],
                'sleep_minutes' => $m['sleep']['minutes'] ?? null,
                'sleep_quality' => $m['sleep']['quality'] ?? null,
                'water_ml' => $m['nutrition']['water_ml'],
                'protein_g' => $m['nutrition']['protein_g'],
                'calories' => $m['nutrition']['calories'],
                'habits_done' => $m['habits']['done'],
                'habits_total' => $m['habits']['total'],
            ];
        }

        $past = collect($days)->where('is_future', false);
        $avg = fn (string $k) => ($v = $past->pluck($k)->filter(fn ($x) => $x !== null))->count() ? (int) round($v->avg()) : null;
        $sleepDays = $past->pluck('sleep_minutes')->filter();

        $topics = LearningTopic::ownedBy($user->id)->get();

        return [
            'from' => $from,
            'to' => $to,
            'days' => $days,
            'totals' => [
                'overall_avg' => $avg('overall'),
                'deen_avg' => $avg('deen'),
                'career_avg' => $avg('career'),
                'fitness_avg' => $avg('fitness'),
                'productivity_avg' => $avg('productivity'),
                'family_avg' => $avg('family'),
                'discipline_avg' => $avg('discipline'),
                'salah_on_time' => $past->sum('salah_on_time'),
                'salah_delayed' => $past->sum('salah_delayed'),
                'salah_missed' => $past->sum('salah_missed'),
                'salah_expected' => $past->count() * 5,
                'quran_pages' => $past->sum('quran_pages'),
                'quran_days' => $past->where('quran_pages', '>', 0)->count(),
                'study_minutes' => $past->sum('study_minutes'),
                'challenges' => $past->sum('challenges'),
                'run_km' => round($past->sum('run_km'), 2),
                'run_days' => $past->where('run_km', '>', 0)->count(),
                'workouts' => $past->sum('workouts'),
                'active_days' => $past->filter(fn ($d) => $d['run_km'] > 0 || $d['workouts'] > 0)->count(),
                'sleep_avg_minutes' => $sleepDays->count() ? (int) round($sleepDays->avg()) : null,
                'days' => $past->count(),
            ],
            'salah_by_prayer' => $this->salahByPrayer($user, $from, $to),
            'learning' => [
                'topics' => $topics->count(),
                'by_status' => collect(['not_started', 'learning', 'practicing', 'completed'])->mapWithKeys(fn ($s) => [$s => $topics->where('status', $s)->count()]),
                'avg_progress' => $topics->count() ? (int) round($topics->avg('progress')) : 0,
                'items' => $topics->sortByDesc('progress')->values()->map->only(['id', 'name', 'category', 'status', 'progress']),
            ],
            'projects' => Project::ownedBy($user->id)->get()->groupBy('status')->map->count(),
            'habits' => $this->habits->stats($user, $from, $to),
        ];
    }

    public function salahByPrayer(User $user, string $from, string $to): array
    {
        $logs = $user->prayerLogs()->whereBetween('date', [$from, $to])->get()->groupBy('prayer');

        return collect(PrayerTimeService::PRAYERS)->map(fn ($p) => [
            'prayer' => $p,
            'on_time' => ($logs[$p] ?? collect())->where('status', 'on_time')->count(),
            'delayed' => ($logs[$p] ?? collect())->where('status', 'delayed')->count(),
            'missed' => ($logs[$p] ?? collect())->where('status', 'missed')->count(),
            'congregation' => ($logs[$p] ?? collect())->where('in_congregation', true)->count(),
        ])->all();
    }

    /** Salah report for a period ending at $date: day | week | month. */
    public function salah(User $user, string $period, string $date): array
    {
        $end = Carbon::parse($date);
        $start = match ($period) {
            'week' => $end->copy()->subDays(6),
            'month' => $end->copy()->subDays(29),
            default => $end->copy(),
        };
        $logs = $user->prayerLogs()->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get()
            ->groupBy(fn ($l) => $l->date->toDateString());
        $days = collect(CarbonPeriod::create($start, $end))->map(function ($d) use ($logs) {
            $l = $logs[$d->toDateString()] ?? collect();

            return [
                'date' => $d->toDateString(),
                'on_time' => $l->where('status', 'on_time')->count(),
                'delayed' => $l->where('status', 'delayed')->count(),
                'missed' => $l->where('status', 'missed')->count(),
                'prayers' => $l->mapWithKeys(fn ($x) => [$x->prayer => $x->status]),
            ];
        })->values();

        $expected = $days->count() * 5;
        $onTime = $days->sum('on_time');
        $delayed = $days->sum('delayed');

        return [
            'period' => $period,
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'days' => $days,
            'by_prayer' => $this->salahByPrayer($user, $start->toDateString(), $end->toDateString()),
            'totals' => [
                'expected' => $expected,
                'on_time' => $onTime,
                'delayed' => $delayed,
                'missed' => $days->sum('missed'),
                'unlogged' => max(0, $expected - $onTime - $delayed - $days->sum('missed')),
                'consistency' => $expected ? (int) round(($onTime + $delayed) / $expected * 100) : 0,
                'on_time_rate' => $expected ? (int) round($onTime / $expected * 100) : 0,
            ],
        ];
    }
}
