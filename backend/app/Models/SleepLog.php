<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Models\Concerns\SyncsHabits;
use Illuminate\Database\Eloquent\Model;

class SleepLog extends Model
{
    use BelongsToUser, SyncsHabits;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }

    protected static function booted(): void
    {
        static::saving(function (SleepLog $log) {
            [$bh, $bm] = array_map('intval', explode(':', $log->bedtime));
            [$wh, $wm] = array_map('intval', explode(':', $log->wake_time));
            $diff = ($wh * 60 + $wm) - ($bh * 60 + $bm);
            $log->duration_minutes = $diff <= 0 ? $diff + 1440 : $diff;
        });
    }
}
