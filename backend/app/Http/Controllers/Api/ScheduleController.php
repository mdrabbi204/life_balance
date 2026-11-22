<?php

namespace App\Http\Controllers\Api;

use App\Models\DailySchedule;
use App\Models\DayOverride;
use App\Models\ScheduleOccurrence;
use App\Services\ScheduleService;
use App\Services\TimeHelper;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends CrudController
{
    protected string $model = DailySchedule::class;
    protected ?string $dateColumn = null;
    protected array $searchable = ['title', 'notes'];
    protected array $filterable = ['category'];
    protected array $orderBy = [['start_time', 'asc'], ['id', 'asc']];

    public function __construct(private ScheduleService $schedule) {}

    protected function rules(Request $request, ?Model $record = null): array
    {
        $recurring = $request->boolean('is_recurring', $record?->is_recurring ?? true);

        return [
            'title' => $this->req($record).'|string|max:120',
            'category' => 'sometimes|in:deen,career,fitness,work,commute,family,personal,rest,other',
            'start_time' => $this->req($record).'|date_format:H:i',
            'end_time' => $this->req($record).'|date_format:H:i|after:start_time',
            'is_recurring' => 'sometimes|boolean',
            'days_of_week' => ($recurring ? $this->req($record).'|array|min:1' : 'nullable|array'),
            'days_of_week.*' => 'integer|between:0,6',
            'date' => ($recurring ? 'nullable' : $this->req($record)).'|date',
            'is_flexible' => 'sometimes|boolean',
            'skip_on_rest_day' => 'sometimes|boolean',
            'reminder_minutes' => 'nullable|integer|min:0|max:240',
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'notes' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        if (isset($data['days_of_week'])) {
            $data['days_of_week'] = array_values(array_unique(array_map('intval', $data['days_of_week'])));
            sort($data['days_of_week']);
        }
        if (($data['is_recurring'] ?? $record?->is_recurring ?? true) === true) {
            $data['date'] = null;
        }

        return $data;
    }

    /** Salah-aware timeline for one day. */
    public function day(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $tz = $request->user()->getProfile()->timezone;
        $date = Carbon::parse($request->input('date', Carbon::now($tz)->toDateString()));

        return response()->json($this->schedule->forDate($request->user(), $date));
    }

    /** Timelines for a range of days (calendar week view). */
    public function range(Request $request): JsonResponse
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date|after_or_equal:from']);
        $from = Carbon::parse($request->input('from'));
        $to = Carbon::parse($request->input('to'));
        if ($from->diffInDays($to) > 42) {
            return response()->json(['message' => 'Range too large (max 6 weeks).'], 422);
        }
        $days = collect(CarbonPeriod::create($from, $to))->map(fn ($d) => $this->schedule->forDate($request->user(), $d))->values();

        return response()->json(['days' => $days]);
    }

    /** Mark done/skipped/pending or reschedule a single occurrence. */
    public function occurrence(Request $request, int $id): JsonResponse
    {
        $schedule = $this->find($request, $id);
        $data = $request->validate([
            'date' => 'required|date',
            'status' => 'sometimes|in:pending,done,skipped',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|required_with:start_time|after:start_time',
        ]);
        if (! $schedule->occursOn(Carbon::parse($data['date']))) {
            return response()->json(['message' => 'This activity does not occur on that date.'], 422);
        }
        $occ = ScheduleOccurrence::firstOrNew(['daily_schedule_id' => $schedule->id, 'date' => $data['date']], ['user_id' => $request->user()->id]);
        if (array_key_exists('status', $data)) {
            $occ->status = $data['status'];
        }
        if (array_key_exists('start_time', $data)) {
            $occ->start_time = $data['start_time'];
            $occ->end_time = $data['end_time'] ?? null;
        }
        $occ->status ??= 'pending';
        $occ->save();

        return response()->json(['data' => $occ]);
    }

    public function restDay(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date', 'is_rest_day' => 'required|boolean', 'note' => 'nullable|string|max:255']);
        $default = in_array(Carbon::parse($data['date'])->dayOfWeek, $request->user()->getProfile()->rest_days ?? [], true);
        if ($default === $data['is_rest_day']) {
            DayOverride::ownedBy($request->user()->id)->whereDate('date', $data['date'])->delete();
        } else {
            DayOverride::updateOrCreate(['user_id' => $request->user()->id, 'date' => $data['date']], ['is_rest_day' => $data['is_rest_day'], 'note' => $data['note'] ?? null]);
        }

        return response()->json(['date' => $data['date'], 'is_rest_day' => $data['is_rest_day']]);
    }

    /** Validate a prospective block against existing ones for the given weekdays. */
    public function checkOverlap(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_time' => 'required|date_format:H:i', 'end_time' => 'required|date_format:H:i',
            'days_of_week' => 'nullable|array', 'date' => 'nullable|date', 'ignore_id' => 'nullable|integer',
        ]);
        $s = TimeHelper::toMinutes($data['start_time']);
        $e = TimeHelper::toMinutes($data['end_time']);
        $data['date'] ??= null;
        $days = $data['date'] ? [Carbon::parse($data['date'])->dayOfWeek] : ($data['days_of_week'] ?? range(0, 6));
        $hits = DailySchedule::ownedBy($request->user()->id)->where('is_active', true)
            ->when($data['ignore_id'] ?? null, fn ($q, $id) => $q->where('id', '!=', $id))->get()
            ->filter(function ($x) use ($s, $e, $days, $data) {
                $xDays = $x->is_recurring ? ($x->days_of_week ?? range(0, 6)) : [$x->date->dayOfWeek];
                if ($data['date'] && ! $x->is_recurring && $x->date->toDateString() !== $data['date']) {
                    return false;
                }
                if (! array_intersect($xDays, $days)) {
                    return false;
                }

                return $s < TimeHelper::toMinutes($x->end_time) && TimeHelper::toMinutes($x->start_time) < $e;
            })->values();

        return response()->json(['overlaps' => $hits->map->only(['id', 'title', 'start_time', 'end_time'])]);
    }
}
