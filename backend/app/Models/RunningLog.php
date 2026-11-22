<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Models\Concerns\SyncsHabits;
use Illuminate\Database\Eloquent\Model;

class RunningLog extends Model
{
    use BelongsToUser, SyncsHabits;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'distance_km' => 'float'];
    }

    protected static function booted(): void
    {
        static::saving(function (RunningLog $log) {
            $log->pace_seconds_per_km = $log->distance_km > 0 ? (int) round($log->duration_seconds / $log->distance_km) : null;
        });
    }
}
