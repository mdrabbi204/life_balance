<?php

namespace App\Http\Controllers\Api;

use App\Models\Habit;
use App\Services\HabitService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HabitController extends CrudController
{
    protected string $model = Habit::class;
    protected ?string $dateColumn = null;
    protected array $orderBy = [['sort_order', 'asc'], ['id', 'asc']];

    public function __construct(private HabitService $habits) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $date = $request->input('date', Carbon::now($request->user()->getProfile()->timezone)->toDateString());

        return response()->json(['date' => $date, 'data' => $this->habits->forDate($request->user(), $date)]);
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'name' => $this->req($record).'|string|max:120',
            'category' => 'sometimes|in:deen,career,fitness,productivity,personal',
            'icon' => 'sometimes|string|max:40',
            'color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'frequency' => 'sometimes|in:daily,weekly',
            'target_per_week' => 'sometimes|integer|between:1,7',
            'rest_day_exempt' => 'sometimes|boolean',
            'system_key' => ['nullable', Rule::in(array_keys(Habit::SYSTEM_KEYS))],
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        if (! $record && ! isset($data['sort_order'])) {
            $data['sort_order'] = (int) Habit::ownedBy($request->user()->id)->max('sort_order') + 1;
        }
        if (($data['frequency'] ?? $record?->frequency) === 'daily') {
            $data['target_per_week'] = 7;
        }

        return $data;
    }

    protected function afterSave(Model $record, Request $request): void
    {
        if ($record->system_key && $record->wasChanged('system_key') || ($record->wasRecentlyCreated && $record->system_key)) {
            $this->habits->syncAutoHabits($record->user_id, Carbon::now($request->user()->getProfile()->timezone)->toDateString());
        }
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        /** @var Habit $habit */
        $habit = $this->find($request, $id);
        $data = $request->validate(['date' => 'required|date|before_or_equal:'.Carbon::now($request->user()->getProfile()->timezone)->toDateString(), 'completed' => 'nullable|boolean']);
        if ($habit->system_key) {
            return response()->json(['message' => 'This habit is tracked automatically from your logs ('.(Habit::SYSTEM_KEYS[$habit->system_key] ?? '').'). Log the activity instead.'], 422);
        }
        $completed = $this->habits->toggle($habit, $data['date'], $data['completed'] ?? null);

        return response()->json(['completed' => $completed]);
    }

    public function stats(Request $request): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from', 'month' => 'nullable|date_format:Y-m']);
        $tz = $request->user()->getProfile()->timezone;
        if ($request->filled('month')) {
            $from = Carbon::parse($request->input('month').'-01');
            $to = $from->copy()->endOfMonth();
        } else {
            $to = Carbon::parse($request->input('to', Carbon::now($tz)->toDateString()));
            $from = Carbon::parse($request->input('from', $to->copy()->subDays(29)->toDateString()));
        }
        if ($from->diffInDays($to) > 400) {
            return response()->json(['message' => 'Range too large (max 400 days).'], 422);
        }

        return response()->json($this->habits->stats($request->user(), $from->toDateString(), $to->toDateString()));
    }
}
