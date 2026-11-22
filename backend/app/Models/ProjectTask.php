<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTask extends Model
{
    use BelongsToUser;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['due_date' => 'date:Y-m-d', 'completed_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::saving(function (ProjectTask $task) {
            if ($task->isDirty('status')) {
                $task->completed_at = $task->status === 'done' ? now() : null;
            }
        });
        $recalc = fn (ProjectTask $task) => $task->project?->recalculateProgress();
        static::saved($recalc);
        static::deleted($recalc);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
