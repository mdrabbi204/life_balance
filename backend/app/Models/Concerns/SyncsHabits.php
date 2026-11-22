<?php

namespace App\Models\Concerns;

use App\Services\HabitService;

/**
 * Models whose data drives auto-tracked habits (e.g. "Five daily Salah").
 * Whenever a record changes, habit logs for the affected date(s) are re-derived.
 */
trait SyncsHabits
{
    public static function bootSyncsHabits(): void
    {
        $sync = function ($model) {
            if (! $model->user_id || ! $model->date) {
                return;
            }
            $dates = [$model->date->toDateString()];
            $original = $model->getOriginal('date');
            if ($original) {
                $dates[] = \Illuminate\Support\Carbon::parse($original)->toDateString();
            }
            foreach (array_unique($dates) as $date) {
                app(HabitService::class)->syncAutoHabits($model->user_id, $date);
            }
        };
        static::saved($sync);
        static::deleted($sync);
    }
}
