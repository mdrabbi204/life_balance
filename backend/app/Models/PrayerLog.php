<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Models\Concerns\SyncsHabits;
use Illuminate\Database\Eloquent\Model;

class PrayerLog extends Model
{
    use BelongsToUser, SyncsHabits;

    public const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'in_congregation' => 'boolean'];
    }
}
