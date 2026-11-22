<?php

namespace App\Services;

final class TimeHelper
{
    public static function toMinutes(?string $time): int
    {
        if (! $time) {
            return 0;
        }
        [$h, $m] = array_map('intval', explode(':', $time));

        return $h * 60 + $m;
    }

    public static function fromMinutes(int $minutes): string
    {
        $minutes = max(0, min(1439, $minutes));

        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    public static function hm(?string $time): ?string
    {
        return $time ? substr($time, 0, 5) : null;
    }
}
