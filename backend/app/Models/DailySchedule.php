<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailySchedule extends Model
{
    use BelongsToUser;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return [
            'days_of_week' => 'array',
            'date' => 'date:Y-m-d',
            'is_recurring' => 'boolean',
            'is_flexible' => 'boolean',
            'skip_on_rest_day' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(ScheduleOccurrence::class);
    }

    public function occursOn(\Carbon\CarbonInterface $date): bool
    {
        if (! $this->is_active) {
            return false;
        }
        if (! $this->is_recurring) {
            return $this->date?->toDateString() === $date->toDateString();
        }
        $days = $this->days_of_week ?? [0, 1, 2, 3, 4, 5, 6];

        return in_array($date->dayOfWeek, $days, true);
    }
}
