<?php

namespace App\Services\PrayerTimes;

use App\Models\UserProfile;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PrayerTimeService
{
    public const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    public function __construct(private PrayerTimeCalculator $calculator) {}

    /**
     * Prayer times for one date in the profile's location/timezone.
     *
     * @return array{date:string, times:array<string,string>, source:string, method:string, timezone:string}
     */
    public function forDate(UserProfile $profile, CarbonInterface|string $date): array
    {
        $date = $date instanceof CarbonInterface ? $date->toDateString() : Carbon::parse($date)->toDateString();
        $key = $this->cacheKey($profile, $date);

        return Cache::remember($key, now()->addDays(2), function () use ($profile, $date) {
            if ($profile->prayer_provider === 'aladhan') {
                $remote = $this->fromAladhan($profile, $date);
                if ($remote) {
                    return $remote;
                }
            }

            return $this->calculate($profile, $date);
        });
    }

    public function calculate(UserProfile $profile, string $date): array
    {
        [$y, $m, $d] = array_map('intval', explode('-', $date));
        $tz = new \DateTimeZone($profile->timezone ?: 'UTC');
        $offset = $tz->getOffset(new \DateTime("$date 12:00:00", $tz)) / 3600;

        $times = $this->calculator->compute(
            $y, $m, $d,
            (float) $profile->latitude, (float) $profile->longitude, $offset,
            $profile->prayer_method, $profile->asr_method, $profile->high_lat_rule ?? 'AngleBased',
            $profile->prayer_adjustments ?? [],
        );

        return [
            'date' => $date,
            'times' => $times,
            'source' => 'calculated',
            'method' => PrayerTimeCalculator::METHODS[$profile->prayer_method]['name'] ?? $profile->prayer_method,
            'asr_method' => $profile->asr_method,
            'timezone' => $profile->timezone,
        ];
    }

    private function fromAladhan(UserProfile $profile, string $date): ?array
    {
        try {
            $method = PrayerTimeCalculator::METHODS[$profile->prayer_method]['aladhan'] ?? 1;
            $res = Http::timeout(6)->get('https://api.aladhan.com/v1/timings/'.Carbon::parse($date)->format('d-m-Y'), [
                'latitude' => $profile->latitude,
                'longitude' => $profile->longitude,
                'method' => $method,
                'school' => $profile->asr_method === 'Hanafi' ? 1 : 0,
                'timezonestring' => $profile->timezone,
            ]);
            if (! $res->ok()) {
                return null;
            }
            $t = $res->json('data.timings');
            $adj = $profile->prayer_adjustments ?? [];
            $times = [];
            foreach (['fajr' => 'Fajr', 'sunrise' => 'Sunrise', 'dhuhr' => 'Dhuhr', 'asr' => 'Asr', 'sunset' => 'Sunset', 'maghrib' => 'Maghrib', 'isha' => 'Isha'] as $k => $src) {
                $hm = substr(trim(explode(' ', $t[$src])[0]), 0, 5);
                $times[$k] = Carbon::createFromFormat('H:i', $hm)->addMinutes((int) ($adj[$k] ?? 0))->format('H:i');
            }

            return [
                'date' => $date,
                'times' => $times,
                'source' => 'aladhan',
                'method' => PrayerTimeCalculator::METHODS[$profile->prayer_method]['name'] ?? $profile->prayer_method,
                'asr_method' => $profile->asr_method,
                'timezone' => $profile->timezone,
            ];
        } catch (\Throwable $e) {
            Log::warning('Aladhan prayer time lookup failed, falling back to calculation', ['error' => $e->getMessage()]);

            return null;
        }
    }

    public function cacheKey(UserProfile $profile, string $date): string
    {
        return 'prayer:'.md5(implode('|', [
            $profile->latitude, $profile->longitude, $profile->timezone, $profile->prayer_method,
            $profile->asr_method, $profile->high_lat_rule, $profile->prayer_provider,
            json_encode($profile->prayer_adjustments ?? []), $date,
        ]));
    }

    /** End of each prayer's preferred window (used to suggest on-time vs. delayed). */
    public function windows(array $times): array
    {
        return [
            'fajr' => [$times['fajr'], $times['sunrise']],
            'dhuhr' => [$times['dhuhr'], $times['asr']],
            'asr' => [$times['asr'], $times['maghrib']],
            'maghrib' => [$times['maghrib'], $times['isha']],
            'isha' => [$times['isha'], '23:59'],
        ];
    }
}
