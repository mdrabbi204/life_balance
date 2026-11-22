<?php

namespace App\Http\Controllers\Api;

use App\Models\RunningLog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RunningLogController extends CrudController
{
    protected string $model = RunningLog::class;
    protected array $searchable = ['notes'];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => $this->req($record).'|date',
            'distance_km' => $this->req($record).'|numeric|min:0.1|max:300',
            'duration_seconds' => $this->req($record).'|integer|min:60|max:86400',
            'calories' => 'nullable|integer|min:0|max:20000',
            'notes' => 'nullable|string|max:2000',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        // Estimated energy cost of running ≈ 1.0 kcal per kg body weight per km.
        if (empty($data['calories']) && isset($data['distance_km'])) {
            $weight = $request->user()->getProfile()->goal('body_weight_kg') ?: 70;
            $data['calories'] = (int) round($weight * (float) $data['distance_km'] * 1.036);
        }

        return $data;
    }

    public function stats(Request $request): JsonResponse
    {
        $profile = $request->user()->getProfile();
        $today = Carbon::now($profile->timezone);
        $logs = RunningLog::ownedBy($request->user()->id)->whereDate('date', '>=', $today->copy()->subWeeks(11)->startOfWeek(Carbon::SATURDAY))->get();
        $weeks = collect(range(11, 0))->map(function ($i) use ($today, $logs) {
            $start = $today->copy()->subWeeks($i)->startOfWeek(Carbon::SATURDAY);
            $end = $start->copy()->addDays(6);
            $w = $logs->filter(fn ($l) => $l->date->between($start, $end));

            return [
                'week' => $start->toDateString(),
                'km' => round((float) $w->sum('distance_km'), 2),
                'runs' => $w->count(),
                'avg_pace' => $w->sum('distance_km') > 0 ? (int) round($w->sum('duration_seconds') / $w->sum('distance_km')) : null,
            ];
        })->values();
        $all = RunningLog::ownedBy($request->user()->id);

        return response()->json([
            'this_week' => $weeks->last(),
            'weekly_goal_km' => $profile->goal('weekly_run_km'),
            'weeks' => $weeks,
            'total_km' => round((float) (clone $all)->sum('distance_km'), 2),
            'total_runs' => (clone $all)->count(),
            'longest_km' => (float) (clone $all)->max('distance_km'),
            'best_pace' => (clone $all)->where('distance_km', '>=', 1)->min('pace_seconds_per_km'),
        ]);
    }
}
