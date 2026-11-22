<?php

namespace App\Http\Controllers\Api;

use App\Models\Reminder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ReminderController extends CrudController
{
    protected string $model = Reminder::class;
    protected ?string $dateColumn = null;
    protected array $searchable = ['title', 'message'];
    protected array $filterable = ['type'];
    protected array $orderBy = [['id', 'asc']];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'type' => $this->req($record).'|in:salah,quran,running,study,water,sleep,schedule,custom',
            'title' => $this->req($record).'|string|max:120',
            'message' => 'nullable|string|max:255',
            'enabled' => 'sometimes|boolean',
            'time' => 'nullable|date_format:H:i',
            'minutes_before' => 'nullable|integer|min:0|max:180',
            'interval_minutes' => 'nullable|integer|min:15|max:720',
            'window_start' => 'nullable|date_format:H:i',
            'window_end' => 'nullable|date_format:H:i',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'integer|between:0,6',
        ];
    }
}
