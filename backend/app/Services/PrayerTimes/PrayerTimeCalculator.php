<?php

namespace App\Services\PrayerTimes;

/**
 * Astronomical prayer-time calculator.
 *
 * Implements the widely used algorithm published by PrayTimes.org (sun declination and
 * equation of time from the Julian date), which is the same basis used by most Islamic
 * calendars and APIs. Times are never hard-coded: they are computed for the given date,
 * coordinates, timezone, calculation method and Asr juristic method.
 */
class PrayerTimeCalculator
{
    /** Twilight angles (degrees) or minutes ("90 min") per method. */
    public const METHODS = [
        'Karachi' => ['name' => 'University of Islamic Sciences, Karachi', 'fajr' => 18, 'isha' => 18, 'aladhan' => 1],
        'MWL' => ['name' => 'Muslim World League', 'fajr' => 18, 'isha' => 17, 'aladhan' => 3],
        'ISNA' => ['name' => 'Islamic Society of North America', 'fajr' => 15, 'isha' => 15, 'aladhan' => 2],
        'Egypt' => ['name' => 'Egyptian General Authority of Survey', 'fajr' => 19.5, 'isha' => 17.5, 'aladhan' => 5],
        'Makkah' => ['name' => 'Umm al-Qura University, Makkah', 'fajr' => 18.5, 'isha' => '90 min', 'aladhan' => 4],
        'Dubai' => ['name' => 'Dubai (UAE)', 'fajr' => 18.2, 'isha' => 18.2, 'aladhan' => 16],
        'Kuwait' => ['name' => 'Kuwait', 'fajr' => 18, 'isha' => 17.5, 'aladhan' => 9],
        'Qatar' => ['name' => 'Qatar', 'fajr' => 18, 'isha' => '90 min', 'aladhan' => 10],
        'Singapore' => ['name' => 'Majlis Ugama Islam Singapura', 'fajr' => 20, 'isha' => 18, 'aladhan' => 11],
        'Turkey' => ['name' => 'Diyanet İşleri Başkanlığı, Turkey', 'fajr' => 18, 'isha' => 17, 'aladhan' => 13],
        'Tehran' => ['name' => 'Institute of Geophysics, Tehran', 'fajr' => 17.7, 'isha' => 14, 'maghrib' => 4.5, 'aladhan' => 7],
    ];

    public const ASR_METHODS = ['Standard' => 1, 'Hanafi' => 2];

    private float $lat;
    private float $lng;
    private float $jDate;

    /**
     * @return array<string,string> HH:MM local times for fajr, sunrise, dhuhr, asr, sunset, maghrib, isha
     */
    public function compute(int $year, int $month, int $day, float $lat, float $lng, float $tzOffset, string $method = 'Karachi', string $asrMethod = 'Hanafi', string $highLatRule = 'AngleBased', array $adjustments = []): array
    {
        $params = self::METHODS[$method] ?? self::METHODS['Karachi'];
        $asrFactor = self::ASR_METHODS[$asrMethod] ?? 1;

        $this->lat = $lat;
        $this->lng = $lng;
        $this->jDate = $this->julian($year, $month, $day) - $lng / (15 * 24);

        // Initial guesses (hours) converted to day portions, then one refinement pass.
        $t = ['fajr' => 5, 'sunrise' => 6, 'dhuhr' => 12, 'asr' => 13, 'sunset' => 18, 'maghrib' => 18, 'isha' => 18];
        foreach ($t as $k => $v) {
            $t[$k] = $v / 24;
        }

        $times = [
            'fajr' => $this->sunAngleTime($params['fajr'], $t['fajr'], true),
            'sunrise' => $this->sunAngleTime(0.833, $t['sunrise'], true),
            'dhuhr' => $this->midDay($t['dhuhr']),
            'asr' => $this->asrTime($asrFactor, $t['asr']),
            'sunset' => $this->sunAngleTime(0.833, $t['sunset']),
            'maghrib' => isset($params['maghrib']) ? $this->sunAngleTime($params['maghrib'], $t['maghrib']) : null,
            'isha' => is_numeric($params['isha']) ? $this->sunAngleTime($params['isha'], $t['isha']) : null,
        ];

        // Local time.
        foreach ($times as $k => $v) {
            if ($v !== null) {
                $times[$k] = $v + $tzOffset - $lng / 15;
            }
        }
        $times['maghrib'] ??= $times['sunset'];

        if ($highLatRule !== 'None') {
            $times = $this->adjustHighLatitudes($times, $params, $highLatRule);
        }
        if (! is_numeric($params['isha'])) {
            $times['isha'] = $times['maghrib'] + ((int) $params['isha']) / 60;
        }

        $out = [];
        foreach ($times as $k => $v) {
            $v += ((float) ($adjustments[$k] ?? 0)) / 60;
            $out[$k] = $this->format($v);
        }

        return $out;
    }

    private function adjustHighLatitudes(array $times, array $params, string $rule): array
    {
        $night = $this->fixHour($times['sunrise'] - $times['sunset']);
        $portion = fn (float $angle) => match ($rule) {
            'NightMiddle' => 0.5,
            'OneSeventh' => 1 / 7,
            default => $angle / 60, // AngleBased
        } * $night;

        $fajrPortion = $portion((float) $params['fajr']);
        $diff = $this->fixHour($times['sunrise'] - $times['fajr']);
        if (is_nan($times['fajr']) || $diff > $fajrPortion) {
            $times['fajr'] = $times['sunrise'] - $fajrPortion;
        }

        if (is_numeric($params['isha'])) {
            $ishaPortion = $portion((float) $params['isha']);
            $diff = $this->fixHour($times['isha'] - $times['sunset']);
            if (is_nan($times['isha']) || $diff > $ishaPortion) {
                $times['isha'] = $times['sunset'] + $ishaPortion;
            }
        }

        return $times;
    }

    private function julian(int $year, int $month, int $day): float
    {
        if ($month <= 2) {
            $year--;
            $month += 12;
        }
        $a = floor($year / 100);
        $b = 2 - $a + floor($a / 4);

        return floor(365.25 * ($year + 4716)) + floor(30.6001 * ($month + 1)) + $day + $b - 1524.5;
    }

    /** @return array{0: float, 1: float} [declination, equation of time] */
    private function sunPosition(float $jd): array
    {
        $d = $jd - 2451545.0;
        $g = $this->fixAngle(357.529 + 0.98560028 * $d);
        $q = $this->fixAngle(280.459 + 0.98564736 * $d);
        $l = $this->fixAngle($q + 1.915 * $this->sin($g) + 0.020 * $this->sin(2 * $g));
        $e = 23.439 - 0.00000036 * $d;
        $ra = $this->atan2($this->cos($e) * $this->sin($l), $this->cos($l)) / 15;
        $eqt = $q / 15 - $this->fixHour($ra);
        $decl = $this->asin($this->sin($e) * $this->sin($l));

        return [$decl, $eqt];
    }

    private function midDay(float $time): float
    {
        $eqt = $this->sunPosition($this->jDate + $time)[1];

        return $this->fixHour(12 - $eqt);
    }

    private function sunAngleTime(float $angle, float $time, bool $ccw = false): float
    {
        $decl = $this->sunPosition($this->jDate + $time)[0];
        $noon = $this->midDay($time);
        $cosT = (-$this->sin($angle) - $this->sin($decl) * $this->sin($this->lat)) / ($this->cos($decl) * $this->cos($this->lat));
        if ($cosT < -1 || $cosT > 1) {
            return NAN;
        }
        $t = $this->acos($cosT) / 15;

        return $noon + ($ccw ? -$t : $t);
    }

    private function asrTime(float $factor, float $time): float
    {
        $decl = $this->sunPosition($this->jDate + $time)[0];
        $angle = -rad2deg(atan(1 / ($factor + $this->tan(abs($this->lat - $decl)))));

        return $this->sunAngleTime($angle, $time);
    }

    private function format(float $time): string
    {
        if (is_nan($time)) {
            return '--:--';
        }
        $time = $this->fixHour($time + 0.5 / 60); // round to nearest minute
        $h = (int) floor($time);
        $m = (int) floor(($time - $h) * 60);

        return sprintf('%02d:%02d', $h, $m);
    }

    private function fixAngle(float $a): float { return $this->fix($a, 360); }
    private function fixHour(float $a): float { return $this->fix($a, 24); }
    private function fix(float $a, float $b): float
    {
        if (is_nan($a)) {
            return $a;
        }
        $a = $a - $b * floor($a / $b);

        return $a < 0 ? $a + $b : $a;
    }
    private function sin(float $d): float { return sin(deg2rad($d)); }
    private function cos(float $d): float { return cos(deg2rad($d)); }
    private function tan(float $d): float { return tan(deg2rad($d)); }
    private function asin(float $x): float { return rad2deg(asin($x)); }
    private function acos(float $x): float { return rad2deg(acos($x)); }
    private function atan2(float $y, float $x): float { return rad2deg(atan2($y, $x)); }
}
