<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Models\Concerns\SyncsHabits;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workout extends Model
{
    use BelongsToUser, SyncsHabits;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'is_template' => 'boolean'];
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(WorkoutExercise::class)->orderBy('position');
    }
}
