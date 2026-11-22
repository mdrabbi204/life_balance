<?php

namespace App\Services;

use App\Services\PrayerTimes\PrayerTimeService;
use Carbon\Carbon;

/**
 * Life-balance scoring.
 *
 *  - Every component is capped at its target, so excess activity is never rewarded.
 *  - Components that do not apply (rest day, prayer not yet due, no data yet for a future day)
 *    are excluded from the average instead of counting as zero.
 */
class ScoreService
{
    private const STATUS_POINTS = ['on_time' => 1.0, 'delayed' => 0.6, 'missed' => 0.0];

    public function __construct(private PrayerTimeService $prayerTimes) {}

    public function day(DayBundle $b, string $date, ?int $nowMin): array
    {
        $p = $b->profile;
        $carbon = Carbon::parse($date);
        $isRest = $b->isRestDay($carbon);
        $times = $this->prayerTimes->forDate($p, $date)['times'];
        $started = $nowMin !== null;

        // ---------- Deen ----------
        $logs = $b->on('prayers', $date)->keyBy('prayer');
        $due = 0; $pts = 0.0; $onTime = 0; $prayed = 0; $missed = 0; $delayed = 0;
        foreach (PrayerTimeService::PRAYERS as $k) {
            $log = $logs->get($k);
            $isDue = $started && $nowMin >= TimeHelper::toMinutes($times[$k]);
            if ($log) {
                $due++;
                $pts += self::STATUS_POINTS[$log->status];
                $onTime += $log->status === 'on_time' ? 1 : 0;
                $delayed += $log->status === 'delayed' ? 1 : 0;
                $missed += $log->status === 'missed' ? 1 : 0;
                $prayed += $log->status !== 'missed' ? 1 : 0;
            } elseif ($isDue) {
                $due++;
            }
        }
        $salah = $due ? $pts / $due : null;

        $quranPages = (int) $b->on('quran', $date)->sum('pages_read');
        $quranMinutes = (int) $b->on('quran', $date)->sum('minutes');
        $quranGoal = max(1, $p->goal('quran_pages'));
        $quran = $started ? min(1, $quranPages / $quranGoal) : null;

        $adhkar = $b->on('adhkar', $date);
        $morningDone = $adhkar->where('type', 'morning')->where('completed', true)->isNotEmpty();
        $eveningDone = $adhkar->where('type', 'evening')->where('completed', true)->isNotEmpty();
        $adhkarDue = 0; $adhkarDone = 0;
        if ($morningDone || ($started && $nowMin >= TimeHelper::toMinutes($times['fajr']))) {
            $adhkarDue++;
            $adhkarDone += $morningDone ? 1 : 0;
        }
        if ($eveningDone || ($started && $nowMin >= TimeHelper::toMinutes($times['asr']))) {
            $adhkarDue++;
            $adhkarDone += $eveningDone ? 1 : 0;
        }
        $adhkarScore = $adhkarDue ? $adhkarDone / $adhkarDue : null;
        $deen = $this->weighted(['salah' => [$salah, 0.6], 'quran' => [$quran, 0.2], 'adhkar' => [$adhkarScore, 0.2]]);

        // ---------- Career ----------
        $sessions = $b->on('sessions', $date);
        $studyMinutes = (int) $sessions->sum('minutes');
        $challenges = (int) $sessions->sum('challenges_solved');
        $tasksDone = $b->on('tasksDone', $date)->count();
        $studyGoal = max(1, $p->goal('study_minutes'));
        $practical = $challenges > 0 || $tasksDone > 0;
        if (! $started) {
            $career = null;
        } elseif ($isRest && $studyMinutes === 0) {
            $career = $practical ? 1.0 : null; // rest day: nothing expected
        } else {
            $career = min(1, $studyMinutes / $studyGoal + ($practical ? 0.15 : 0));
        }

        // ---------- Fitness ----------
        $runs = $b->on('runs', $date);
        $workouts = $b->on('workouts', $date);
        $workedOut = $runs->isNotEmpty() || $workouts->isNotEmpty();
        $workout = $workedOut ? 1.0 : (($isRest || ! $started) ? null : 0.0);
        $sleepLog = $b->on('sleep', $date)->first();
        $sleepGoal = max(1, $p->goal('sleep_hours') * 60);
        $sleep = $sleepLog ? min(1, $sleepLog->duration_minutes / $sleepGoal) * 0.7 + ($sleepLog->quality / 5) * 0.3 : null;
        $nutrition = $b->on('nutrition', $date);
        $water = (int) $nutrition->sum('water_ml');
        $protein = (float) $nutrition->sum('protein_g');
        $calories = (int) $nutrition->sum('calories');
        $nutritionScore = $nutrition->isNotEmpty()
            ? (min(1, $water / max(1, $p->goal('water_ml'))) + min(1, $protein / max(1, $p->goal('protein_g')))) / 2
            : null;
        $fitness = $this->weighted(['workout' => [$workout, 0.45], 'sleep' => [$sleep, 0.3], 'nutrition' => [$nutritionScore, 0.25]]);

        // ---------- Productivity ----------
        $occ = $b->on('occurrences', $date)->keyBy('daily_schedule_id');
        $blocksPlanned = 0; $blocksEnded = 0; $blocksDone = 0;
        foreach ($b->schedules as $s) {
            if (! $s->occursOn($carbon) || ($isRest && $s->skip_on_rest_day)) {
                continue;
            }
            $blocksPlanned++;
            $o = $occ->get($s->id);
            $end = TimeHelper::toMinutes($o?->end_time ?? $s->end_time);
            $done = $o?->status === 'done';
            $blocksDone += $done ? 1 : 0;
            if ($done || ($started && $nowMin >= $end)) {
                $blocksEnded++;
            }
        }
        $tasksDue = $b->on('tasksDue', $date);
        $tasksDueDone = $tasksDue->where('status', 'done')->count();
        $prodDen = $blocksEnded + $tasksDue->count();
        $productivity = $prodDen ? ($blocksDone + $tasksDueDone) / $prodDen : null;

        // ---------- Personal & family ----------
        $habitsDue = $b->habitsDueOn($date);
        $habitDoneIds = $b->on('habitLogs', $date)->pluck('habit_id')->all();
        $habitsDone = $habitsDue->filter(fn ($h) => in_array($h->id, $habitDoneIds, true))->count();
        $personal = $habitsDue->where('category', 'personal');
        $personalDone = $personal->filter(fn ($h) => in_array($h->id, $habitDoneIds, true))->count();
        $family = ($started && $personal->count()) ? $personalDone / $personal->count() : null;

        // ---------- Overall ----------
        $domains = ['deen' => $deen, 'career' => $career, 'fitness' => $fitness, 'productivity' => $productivity, 'family' => $family];
        $weights = $p->weights();
        $overall = $this->weighted(collect($domains)->map(fn ($v, $k) => [$v, (float) ($weights[$k] ?? 0)])->all());

        $discNum = $onTime + $habitsDone + $blocksDone;
        $discDen = $due + $habitsDue->count() + $blocksEnded;
        $completionDen = 5 + $habitsDue->count() + $blocksPlanned;

        $pct = fn ($v) => $v === null ? null : (int) round($v * 100);

        return [
            'date' => $date,
            'is_rest_day' => $isRest,
            'scores' => array_map($pct, $domains) + ['overall' => $pct($overall)],
            'discipline' => $discDen ? (int) round($discNum / $discDen * 100) : null,
            'completion' => (int) round(($prayed + $habitsDone + $blocksDone) / max(1, $completionDen) * 100),
            'metrics' => [
                'salah' => ['prayed' => $prayed, 'on_time' => $onTime, 'delayed' => $delayed, 'missed' => $missed, 'due' => $due],
                'quran' => ['pages' => $quranPages, 'minutes' => $quranMinutes, 'goal' => (int) $quranGoal, 'done' => $quranPages >= $quranGoal],
                'adhkar' => ['morning' => $morningDone, 'evening' => $eveningDone],
                'study' => ['minutes' => $studyMinutes, 'goal' => (int) $studyGoal, 'challenges' => $challenges, 'tasks_done' => $tasksDone],
                'workout' => ['done' => $workedOut, 'run_km' => round((float) $runs->sum('distance_km'), 2), 'workouts' => $workouts->count(), 'rest_day' => $isRest],
                'sleep' => $sleepLog ? ['minutes' => $sleepLog->duration_minutes, 'quality' => $sleepLog->quality, 'bedtime' => TimeHelper::hm($sleepLog->bedtime), 'wake_time' => TimeHelper::hm($sleepLog->wake_time)] : null,
                'nutrition' => ['water_ml' => $water, 'water_goal' => (int) $p->goal('water_ml'), 'protein_g' => round($protein, 1), 'protein_goal' => (int) $p->goal('protein_g'), 'calories' => $calories, 'calorie_goal' => (int) $p->goal('calories')],
                'habits' => ['done' => $habitsDone, 'total' => $habitsDue->count()],
                'schedule' => ['planned' => $blocksPlanned, 'done' => $blocksDone, 'ended' => $blocksEnded],
                'tasks' => ['due' => $tasksDue->count(), 'due_done' => $tasksDueDone],
            ],
        ];
    }

    /** @param array<string, array{0: float|null, 1: float}> $parts */
    private function weighted(array $parts): ?float
    {
        $sum = 0.0; $w = 0.0;
        foreach ($parts as [$value, $weight]) {
            if ($value === null || $weight <= 0) {
                continue;
            }
            $sum += $value * $weight;
            $w += $weight;
        }

        return $w > 0 ? $sum / $w : null;
    }
}
