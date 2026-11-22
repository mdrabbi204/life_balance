<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningTopic extends Model
{
    use BelongsToUser;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['target_date' => 'date:Y-m-d', 'progress' => 'integer'];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(LearningSession::class);
    }
}
