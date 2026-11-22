<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectController extends CrudController
{
    protected string $model = Project::class;
    protected ?string $dateColumn = 'start_date';
    protected array $searchable = ['name', 'description'];
    protected array $filterable = ['status', 'priority'];
    protected array $orderBy = [['updated_at', 'desc']];

    protected function query(Request $request): Builder
    {
        return parent::query($request)
            ->withCount(['tasks', 'tasks as done_tasks_count' => fn ($q) => $q->where('status', 'done')]);
    }

    public function show(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        return response()->json(['data' => $this->find($request, $id)->load('tasks')]);
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'name' => $this->req($record).'|string|max:150',
            'description' => 'nullable|string|max:5000',
            'technologies' => 'nullable|array|max:20',
            'technologies.*' => 'string|max:40',
            'start_date' => 'nullable|date',
            'target_date' => 'nullable|date|after_or_equal:start_date',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'status' => 'sometimes|in:planning,active,on_hold,completed',
            'progress' => 'sometimes|integer|between:0,100',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        if (isset($data['status'])) {
            $data['completed_at'] = $data['status'] === 'completed' ? ($record?->completed_at ?? now()) : null;
            if ($data['status'] === 'completed' && (! $record || $record->tasks()->count() === 0)) {
                $data['progress'] = 100;
            }
        }

        return $data;
    }

    protected function afterSave(Model $record, Request $request): void
    {
        /** @var Project $record */
        $record->recalculateProgress();
    }
}
