<?php

namespace App\Http\Controllers\Api;

use App\Models\Workout;
use App\Models\WorkoutExercise;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkoutController extends CrudController
{
    protected string $model = Workout::class;
    protected array $searchable = ['name', 'notes'];
    protected array $filterable = ['type'];
    protected array $with = ['exercises'];

    public function index(Request $request): JsonResponse
    {
        $request->merge(['is_template' => $request->boolean('templates') ? 1 : 0]);
        $this->filterable[] = 'is_template';

        return parent::index($request);
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        $isTemplate = $request->boolean('is_template', (bool) $record?->is_template);

        return [
            'name' => $this->req($record).'|string|max:120',
            'type' => 'sometimes|in:push,pull,legs,core,full_body,custom',
            'is_template' => 'sometimes|boolean',
            'date' => ($isTemplate ? 'nullable' : $this->req($record)).'|date',
            'duration_minutes' => 'nullable|integer|min:1|max:600',
            'notes' => 'nullable|string|max:2000',
            'exercises' => 'sometimes|array|max:40',
            'exercises.*.name' => 'required|string|max:120',
            'exercises.*.category' => 'nullable|in:push,pull,legs,core,cardio,other',
            'exercises.*.sets' => 'required|integer|min:1|max:50',
            'exercises.*.reps' => 'required|integer|min:1|max:1000',
            'exercises.*.weight_kg' => 'nullable|numeric|min:0|max:1000',
        ];
    }

    public function store(Request $request): JsonResponse
    {
        return DB::transaction(fn () => parent::store($request));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return DB::transaction(fn () => parent::update($request, $id));
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        unset($data['exercises']);
        if (! empty($data['is_template'])) {
            $data['date'] = null;
        }

        return $data;
    }

    protected function afterSave(Model $record, Request $request): void
    {
        if (! $request->has('exercises')) {
            return;
        }
        $record->exercises()->delete();
        foreach (array_values($request->input('exercises', [])) as $i => $ex) {
            $record->exercises()->create([
                'name' => $ex['name'], 'category' => $ex['category'] ?? 'other', 'sets' => $ex['sets'],
                'reps' => $ex['reps'], 'weight_kg' => $ex['weight_kg'] ?? null, 'position' => $i,
            ]);
        }
    }

    /** Start a workout log from a template (or repeat a past workout). */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        $source = $this->find($request, $id);
        $data = $request->validate(['date' => 'required|date']);
        $copy = DB::transaction(function () use ($source, $data) {
            $w = $source->replicate(['is_template', 'date']);
            $w->is_template = false;
            $w->date = $data['date'];
            $w->save();
            foreach ($source->exercises as $ex) {
                $w->exercises()->create($ex->only(['name', 'category', 'sets', 'reps', 'weight_kg', 'position']));
            }

            return $w;
        });

        return response()->json(['data' => $copy->load('exercises')], 201);
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->getProfile();
        $today = Carbon::now($profile->timezone);
        $logs = Workout::ownedBy($user->id)->where('is_template', false)->whereDate('date', '>=', $today->copy()->subWeeks(7)->startOfWeek(Carbon::SATURDAY))->with('exercises')->get();

        // Weight progression: best weight per exercise per workout date.
        $progress = WorkoutExercise::query()
            ->join('workouts', 'workouts.id', '=', 'workout_exercises.workout_id')
            ->where('workouts.user_id', $user->id)->where('workouts.is_template', false)->whereNotNull('workout_exercises.weight_kg')
            ->groupBy('workout_exercises.name', 'workouts.date')
            ->selectRaw('workout_exercises.name as name, workouts.date as date, MAX(workout_exercises.weight_kg) as weight')
            ->orderBy('workouts.date')->get()
            ->groupBy('name')->map(fn ($rows) => $rows->map(fn ($r) => ['date' => Carbon::parse($r->date)->toDateString(), 'weight' => (float) $r->weight])->values());

        return response()->json([
            'this_week' => $logs->filter(fn ($w) => $w->date->gte($today->copy()->startOfWeek(Carbon::SATURDAY)->startOfDay()))->count(),
            'goal_per_week' => (int) $profile->goal('workouts_per_week'),
            'weeks' => collect(range(7, 0))->map(function ($i) use ($today, $logs) {
                $start = $today->copy()->subWeeks($i)->startOfWeek(Carbon::SATURDAY);
                $w = $logs->filter(fn ($l) => $l->date->between($start, $start->copy()->addDays(6)));

                return ['week' => $start->toDateString(), 'count' => $w->count(), 'volume' => (int) $w->sum(fn ($x) => $x->exercises->sum(fn ($e) => $e->sets * $e->reps * ($e->weight_kg ?? 0)))];
            })->values(),
            'by_type' => $logs->groupBy('type')->map->count(),
            'progression' => $progress,
        ]);
    }
}
