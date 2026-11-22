<?php

namespace App\Services;

use App\Models\DailySchedule;
use App\Models\PrayerLog;
use App\Models\ScheduleOccurrence;
use App\Models\User;
use App\Services\PrayerTimes\PrayerTimeService;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Builds a Salah-aware timeline for a date.
 *
 * Rules:
 *  - Prayer blocks are injected from the computed prayer times (never fixed).
 *  - Salah always wins: flexible activities are shifted after the prayer; fixed activities
 *    (office, commute...) are split around it.
 *  - Remaining overlaps between activities are reported as conflicts.
 *  - On rest days, activities flagged skip_on_rest_day are marked as "rest".
 */
class ScheduleService
{
    public const PRAYER_NAMES = ['fajr' => 'Fajr', 'dhuhr' => 'Dhuhr', 'asr' => 'Asr', 'maghrib' => 'Maghrib', 'isha' => 'Isha'];

    public function __construct(private PrayerTimeService $prayerTimes, private RestDayService $restDays) {}

    public function forDate(User $user, CarbonInterface $date, ?CarbonInterface $now = null): array
    {
        $profile = $user->getProfile();
        $prayer = $this->prayerTimes->forDate($profile, $date);
        $prayer['windows'] = $this->prayerTimes->windows($prayer['times']);
        $prayer['tomorrow_fajr'] = $this->prayerTimes->forDate($profile, $date->copy()->addDay())['times']['fajr'];
        $prayer['location'] = ['city' => $profile->city, 'country' => $profile->country];
        $isRest = $this->restDays->isRestDay($user, $date);
        $nowMin = $this->nowMinutes($user, $date, $now);

        $prayerBlocks = $this->prayerBlocks($user, $date, $prayer['times'], $nowMin);

        $schedules = DailySchedule::ownedBy($user->id)->where('is_active', true)->get()
            ->filter(fn (DailySchedule $s) => $s->occursOn($date));
        $occurrences = ScheduleOccurrence::ownedBy($user->id)->whereDate('date', $date)->get()->keyBy('daily_schedule_id');

        $items = [];
        $conflicts = [];
        foreach ($schedules as $s) {
            $occ = $occurrences->get($s->id);
            $start = TimeHelper::toMinutes($occ?->start_time ?? $s->start_time);
            $end = TimeHelper::toMinutes($occ?->end_time ?? $s->end_time);
            $status = $occ?->status ?? 'pending';
            if ($isRest && $s->skip_on_rest_day) {
                $status = 'rest';
            }

            $base = [
                'schedule_id' => $s->id,
                'title' => $s->title,
                'category' => $s->category,
                'color' => $s->color,
                'notes' => $s->notes,
                'is_flexible' => $s->is_flexible,
                'is_recurring' => $s->is_recurring,
                'reminder_minutes' => $s->reminder_minutes,
                'rescheduled' => (bool) ($occ?->start_time),
                'status' => $status,
                'is_prayer' => false,
                'original_start' => TimeHelper::fromMinutes($start),
                'original_end' => TimeHelper::fromMinutes($end),
            ];

            if ($status === 'rest') {
                $items[] = $base + $this->span($start, $end) + ['segment' => 0, 'adjustment' => 'Rest day — skipped'];
                continue;
            }

            [$segments, $notes] = $this->fitAroundPrayers($start, $end, $s->is_flexible, $prayerBlocks);
            foreach ($notes as $note) {
                $conflicts[] = ['type' => 'salah', 'schedule_id' => $s->id, 'title' => $s->title, 'message' => $note];
            }
            foreach ($segments as $i => [$a, $b]) {
                $items[] = $base + $this->span($a, $b) + ['segment' => $i, 'adjustment' => $notes ? implode('; ', $notes) : null];
            }
        }

        $conflicts = array_merge($conflicts, $this->detectOverlaps($items));

        $all = array_merge($prayerBlocks, $items);
        usort($all, fn ($a, $b) => [$a['start_min'], $a['is_prayer'] ? 0 : 1] <=> [$b['start_min'], $b['is_prayer'] ? 0 : 1]);

        foreach ($all as &$it) {
            $it['key'] = $it['is_prayer'] ? 'prayer-'.$it['prayer'] : 's'.$it['schedule_id'].'-'.$it['segment'];
            $it['is_current'] = $nowMin !== null && $nowMin >= $it['start_min'] && $nowMin < $it['end_min'];
            $it['is_past'] = $nowMin !== null && $nowMin >= $it['end_min'];
        }
        unset($it);

        $activities = collect($items)->where('status', '!=', 'rest')->unique('schedule_id');

        return [
            'date' => $date->toDateString(),
            'is_rest_day' => $isRest,
            'prayer_times' => $prayer,
            'items' => $all,
            'conflicts' => $conflicts,
            'summary' => [
                'planned' => $activities->count(),
                'completed' => $activities->where('status', 'done')->count(),
                'skipped' => $activities->where('status', 'skipped')->count(),
                'pending' => $activities->where('status', 'pending')->count(),
            ],
        ];
    }

    /** Minutes since midnight in the user's timezone if $date is today; 1440 for past dates; null for future. */
    public function nowMinutes(User $user, CarbonInterface $date, ?CarbonInterface $now = null): ?int
    {
        $tz = $user->getProfile()->timezone ?: 'UTC';
        $now = ($now ?? Carbon::now())->copy()->setTimezone($tz);
        $d = $date->toDateString();
        $today = $now->toDateString();
        if ($d < $today) {
            return 1440;
        }
        if ($d > $today) {
            return null;
        }

        return $now->hour * 60 + $now->minute;
    }

    private function prayerBlocks(User $user, CarbonInterface $date, array $times, ?int $nowMin): array
    {
        $profile = $user->getProfile();
        $logs = PrayerLog::ownedBy($user->id)->whereDate('date', $date)->get()->keyBy('prayer');
        $blocks = [];
        foreach (self::PRAYER_NAMES as $key => $name) {
            $start = TimeHelper::toMinutes($times[$key]);
            $isJumuah = $key === 'dhuhr' && $date->dayOfWeek === Carbon::FRIDAY;
            $duration = $isJumuah ? $profile->jumuah_duration_minutes : $profile->prayer_duration_minutes;
            $log = $logs->get($key);
            $status = $log?->status ?? ($nowMin === null || $nowMin < $start ? 'upcoming' : 'pending');
            $blocks[] = [
                'is_prayer' => true,
                'prayer' => $key,
                'title' => $isJumuah ? "Jumu'ah" : $name,
                'category' => 'salah',
                'status' => $status,
                'segment' => 0,
                'adjustment' => null,
            ] + $this->span($start, min(1439, $start + $duration));
        }

        return $blocks;
    }

    /**
     * @return array{0: array<int, array{0:int,1:int}>, 1: string[]}
     */
    private function fitAroundPrayers(int $start, int $end, bool $flexible, array $prayers): array
    {
        $notes = [];
        if ($end <= $start) {
            return [[[$start, $end]], $notes];
        }

        if ($flexible) {
            $duration = $end - $start;
            for ($i = 0; $i < 6; $i++) {
                $hit = collect($prayers)->first(fn ($p) => $start < $p['end_min'] && $p['start_min'] < $end);
                if (! $hit) {
                    break;
                }
                $notes[] = sprintf('Moved after %s (%s → %s)', $hit['title'], TimeHelper::fromMinutes($start), TimeHelper::fromMinutes($hit['end_min']));
                $start = $hit['end_min'];
                $end = min(1439, $start + $duration);
            }

            return [[[$start, $end]], $notes];
        }

        $segments = [[$start, $end]];
        foreach ($prayers as $p) {
            $next = [];
            foreach ($segments as [$a, $b]) {
                if ($a < $p['end_min'] && $p['start_min'] < $b) {
                    $notes[] = sprintf('Paused for %s at %s', $p['title'], TimeHelper::fromMinutes($p['start_min']));
                    if ($p['start_min'] > $a) {
                        $next[] = [$a, $p['start_min']];
                    }
                    if ($p['end_min'] < $b) {
                        $next[] = [$p['end_min'], $b];
                    }
                } else {
                    $next[] = [$a, $b];
                }
            }
            $segments = $next;
        }

        return [array_values(array_filter($segments, fn ($s) => $s[1] - $s[0] >= 5)) ?: [[$start, $start]], $notes];
    }

    private function detectOverlaps(array $items): array
    {
        $active = array_values(array_filter($items, fn ($i) => $i['status'] !== 'rest' && $i['end_min'] > $i['start_min']));
        $found = [];
        $count = count($active);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $a = $active[$i];
                $b = $active[$j];
                if ($a['schedule_id'] === $b['schedule_id']) {
                    continue;
                }
                if ($a['start_min'] < $b['end_min'] && $b['start_min'] < $a['end_min']) {
                    $pair = min($a['schedule_id'], $b['schedule_id']).'-'.max($a['schedule_id'], $b['schedule_id']);
                    $found[$pair] = [
                        'type' => 'overlap',
                        'schedule_ids' => [$a['schedule_id'], $b['schedule_id']],
                        'title' => $a['title'].' / '.$b['title'],
                        'message' => sprintf('"%s" overlaps "%s" (%s–%s)', $a['title'], $b['title'], TimeHelper::fromMinutes(max($a['start_min'], $b['start_min'])), TimeHelper::fromMinutes(min($a['end_min'], $b['end_min']))),
                    ];
                }
            }
        }

        return array_values($found);
    }

    private function span(int $start, int $end): array
    {
        return [
            'start' => TimeHelper::fromMinutes($start),
            'end' => TimeHelper::fromMinutes($end),
            'start_min' => $start,
            'end_min' => $end,
            'duration' => max(0, $end - $start),
        ];
    }
}
