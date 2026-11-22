<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use BelongsToUser;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return [
            'technologies' => 'array',
            'start_date' => 'date:Y-m-d',
            'target_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'progress' => 'integer',
        ];
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class)->orderBy('position');
    }

    /** When a project has tasks, progress is derived from them. */
    public function recalculateProgress(): void
    {
        $total = $this->tasks()->count();
        if ($total === 0) {
            return;
        }
        $done = $this->tasks()->where('status', 'done')->count();
        $this->progress = (int) round($done / $total * 100);
        if ($this->progress === 100 && $this->status !== 'completed') {
            $this->status = 'completed';
            $this->completed_at = now();
        } elseif ($this->progress < 100 && $this->status === 'completed') {
            $this->status = 'active';
            $this->completed_at = null;
        }
        $this->saveQuietly();
    }
}
