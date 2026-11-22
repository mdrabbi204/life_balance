<?php

namespace App\Http\Controllers\Api;

use App\Models\IslamicLearningLog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IslamicLearningController extends CrudController
{
    protected string $model = IslamicLearningLog::class;
    protected array $searchable = ['title', 'source', 'notes'];
    protected array $filterable = ['type'];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => $this->req($record).'|date',
            'type' => $this->req($record).'|in:lecture,hadith,book,other',
            'title' => $this->req($record).'|string|max:200',
            'source' => 'nullable|string|max:200',
            'minutes' => 'nullable|integer|min:0|max:1440',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    public function weekly(Request $request): JsonResponse
    {
        $profile = $request->user()->getProfile();
        $start = Carbon::now($profile->timezone)->startOfWeek(Carbon::SATURDAY);
        $logs = IslamicLearningLog::ownedBy($request->user()->id)->whereDate('date', '>=', $start)->get();

        return response()->json([
            'week_start' => $start->toDateString(),
            'minutes' => (int) $logs->sum('minutes'),
            'target_minutes' => (int) $profile->goal('islamic_learning_minutes_week'),
            'by_type' => collect(['lecture', 'hadith', 'book', 'other'])->mapWithKeys(fn ($t) => [$t => ['count' => $logs->where('type', $t)->count(), 'minutes' => (int) $logs->where('type', $t)->sum('minutes')]]),
        ]);
    }
}
