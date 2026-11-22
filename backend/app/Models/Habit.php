<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Habit extends Model
{
    use BelongsToUser;

    /** Auto-tracked habit keys and what drives them. */
    public const SYSTEM_KEYS = [
        'salah' => 'All five prayers logged (not missed)',
        'quran' => 'Any Quran reading logged',
        'morning_adhkar' => 'Morning adhkar completed',
        'evening_adhkar' => 'Evening adhkar completed',
        'workout' => 'A run or workout logged',
        'study' => 'Study time reaches daily goal',
        'water' => 'Water intake reaches daily goal',
        'sleep_on_time' => 'Bedtime within 30 min of planned sleep time',
    ];

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'rest_day_exempt' => 'boolean'];
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }
}
