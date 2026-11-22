<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

/** Stored in the `notifications` table: user-configurable reminder rules. */
class Reminder extends Model
{
    use BelongsToUser;

    protected $table = 'notifications';

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'days_of_week' => 'array', 'last_sent_at' => 'datetime'];
    }
}
