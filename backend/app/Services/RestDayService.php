<?php

namespace App\Services;

use App\Models\DayOverride;
use App\Models\User;
use Carbon\CarbonInterface;

class RestDayService
{
    public function isRestDay(User $user, CarbonInterface $date, ?iterable $overrides = null): bool
    {
        $override = $overrides !== null
            ? collect($overrides)->first(fn ($o) => $o->date->toDateString() === $date->toDateString())
            : DayOverride::ownedBy($user->id)->whereDate('date', $date)->first();

        if ($override) {
            return (bool) $override->is_rest_day;
        }

        return in_array($date->dayOfWeek, $user->getProfile()->rest_days ?? [], true);
    }
}
