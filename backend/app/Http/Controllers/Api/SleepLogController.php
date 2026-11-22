<?php

namespace App\Http\Controllers\Api;

use App\Models\SleepLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SleepLogController extends CrudController
{
    protected string $model = SleepLog::class;
    protected array $searchable = ['notes'];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => [$record ? 'sometimes' : 'required', 'date', Rule::unique('sleep_logs')->where('user_id', $request->user()->id)->ignore($record?->id)],
            'bedtime' => $this->req($record).'|date_format:H:i',
            'wake_time' => $this->req($record).'|date_format:H:i',
            'quality' => 'sometimes|integer|between:1,5',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
