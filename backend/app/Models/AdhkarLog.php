<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Models\Concerns\SyncsHabits;
use Illuminate\Database\Eloquent\Model;

class AdhkarLog extends Model
{
    use BelongsToUser, SyncsHabits;

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'completed' => 'boolean'];
    }
}
