<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use App\Models\ProjectTask;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectTaskController extends CrudController
{
    protected string $model = ProjectTask::class;
    protected ?string $dateColumn = 'due_date';
    protected array $searchable = ['title', 'description'];
    protected array $filterable = ['project_id', 'status', 'priority'];
    protected array $with = ['project:id,name'];
    protected array $orderBy = [['position', 'asc'], ['id', 'asc']];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'project_id' => [$record ? 'sometimes' : 'required', 'integer', Rule::exists('projects', 'id')->where('user_id', $request->user()->id)],
            'title' => $this->req($record).'|string|max:200',
            'description' => 'nullable|string|max:5000',
            'status' => 'sometimes|in:todo,in_progress,review,done',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'position' => 'sometimes|integer|min:0',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        if (! $record && ! isset($data['position'])) {
            $data['position'] = (int) ProjectTask::where('project_id', $data['project_id'])->where('status', $data['status'] ?? 'todo')->max('position') + 1;
        }

        return $data;
    }

    /** Kanban move: set status and reorder the target column. */
    public function move(Request $request, int $id): JsonResponse
    {
        $task = $this->find($request, $id);
        $data = $request->validate(['status' => 'required|in:todo,in_progress,review,done', 'position' => 'required|integer|min:0']);

        DB::transaction(function () use ($task, $data) {
            $column = ProjectTask::where('project_id', $task->project_id)->where('status', $data['status'])
                ->where('id', '!=', $task->id)->orderBy('position')->pluck('id')->all();
            array_splice($column, min($data['position'], count($column)), 0, [$task->id]);
            $task->status = $data['status'];
            $task->position = array_search($task->id, $column, true);
            $task->save();
            foreach ($column as $pos => $taskId) {
                if ($taskId !== $task->id) {
                    ProjectTask::whereKey($taskId)->update(['position' => $pos]);
                }
            }
        });

        return response()->json(['data' => $task->fresh(), 'project' => Project::find($task->project_id)]);
    }
}
