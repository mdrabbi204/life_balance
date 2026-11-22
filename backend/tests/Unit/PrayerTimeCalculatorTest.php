<?php

namespace Tests\Unit;

use App\Services\PrayerTimes\PrayerTimeCalculator;
use PHPUnit\Framework\TestCase;

class PrayerTimeCalculatorTest extends TestCase
{
    /** Reference values from api.aladhan.com (Karachi method, Hanafi) for Dhaka, 22 Nov 2026. */
    public function test_dhaka_times_match_reference_within_two_minutes(): void
    {
        $t = (new PrayerTimeCalculator)->compute(2026, 11, 22, 23.8103, 90.4125, 6, 'Karachi', 'Hanafi');
        $ref = ['fajr' => '04:59', 'sunrise' => '06:18', 'dhuhr' => '11:44', 'asr' => '15:36', 'maghrib' => '17:11', 'isha' => '18:30'];
        foreach ($ref as $k => $v) {
            $this->assertLessThanOrEqual(2, abs($this->min($t[$k]) - $this->min($v)), "$k: got {$t[$k]}, expected ~$v");
        }
    }

    public function test_times_change_with_date_and_location(): void
    {
        $c = new PrayerTimeCalculator;
        $winter = $c->compute(2026, 12, 21, 23.81, 90.41, 6);
        $summer = $c->compute(2026, 6, 21, 23.81, 90.41, 6);
        $this->assertNotEquals($winter['fajr'], $summer['fajr']);
        $london = $c->compute(2026, 6, 21, 51.5074, -0.1278, 1, 'MWL', 'Standard');
        $this->assertNotEquals('--:--', $london['fajr'], 'high-latitude rule should resolve fajr');
        $this->assertNotEquals('--:--', $london['isha']);
    }

    public function test_hanafi_asr_is_later_than_standard(): void
    {
        $c = new PrayerTimeCalculator;
        $h = $c->compute(2026, 11, 22, 23.81, 90.41, 6, 'Karachi', 'Hanafi');
        $s = $c->compute(2026, 11, 22, 23.81, 90.41, 6, 'Karachi', 'Standard');
        $this->assertGreaterThan($this->min($s['asr']), $this->min($h['asr']));
    }

    private function min(string $t): int
    {
        [$h, $m] = explode(':', $t);

        return (int) $h * 60 + (int) $m;
    }
}
