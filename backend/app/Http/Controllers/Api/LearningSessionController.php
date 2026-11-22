<?php

namespace App\Http\Controllers\Api;

use App\Models\LearningSession;
use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LearningSessionController extends CrudController
{
    protected string $model = LearningSession::class;
    protected array $searchable = ['topics_studied', 'notes'];
    protected array $filterable = ['learning_topic_id'];
    protected array $with = ['topic:id,name,category'];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => $this->req($record).'|date',
            'minutes' => $this->req($record).'|integer|min:1|max:1440',
            'learning_topic_id' => ['nullable', 'integer', Rule::exists('learning_topics', 'id')->where('user_id', $request->user()->id)],
            'topics_studied' => 'nullable|string|max:255',
            'challenges_solved' => 'nullable|integer|min:0|max:500',
            'github_contributions' => 'nullable|integer|min:0|max:1000',
            'notes' => 'nullable|string|max:10000',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        foreach (['challenges_solved', 'github_contributions'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === null) {
                $data[$k] = 0;
            }
        }

        return $data;
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $tz = $user->getProfile()->timezone;
        $today = Carbon::now($tz);
        $sessions = LearningSession::ownedBy($user->id)->whereDate('date', '>=', $today->copy()->subDays(29))->with('topic:id,name')->get();
        $week = $sessions->filter(fn ($s) => $s->date->gte($today->copy()->subDays(6)->startOfDay()));

        return response()->json([
            'today_minutes' => (int) $sessions->filter(fn ($s) => $s->date->toDateString() === $today->toDateString())->sum('minutes'),
            'week_minutes' => (int) $week->sum('minutes'),
            'month_minutes' => (int) $sessions->sum('minutes'),
            'challenges_month' => (int) $sessions->sum('challenges_solved'),
            'contributions_month' => (int) $sessions->sum('github_contributions'),
            'projects_completed' => Project::ownedBy($user->id)->where('status', 'completed')->count(),
            'daily' => collect(range(13, 0))->map(function ($i) use ($today, $sessions) {
                $d = $today->copy()->subDays($i)->toDateString();

                return ['date' => $d, 'minutes' => (int) $sessions->filter(fn ($s) => $s->date->toDateString() === $d)->sum('minutes')];
            }),
            'by_topic' => $sessions->groupBy(fn ($s) => $s->topic?->name ?? 'General')->map(fn ($c, $k) => ['topic' => $k, 'minutes' => (int) $c->sum('minutes')])->sortByDesc('minutes')->values()->take(8),
        ]);
    }
}
