<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reusable, user-scoped CRUD controller.
 * Every query is constrained to the authenticated user; records belonging to other users 404.
 */
abstract class CrudController extends Controller
{
    /** @var class-string<Model> */
    protected string $model;

    protected ?string $dateColumn = 'date';
    protected array $searchable = [];
    protected array $filterable = [];
    protected array $with = [];
    protected array $orderBy = [['date', 'desc'], ['id', 'desc']];

    abstract protected function rules(Request $request, ?Model $record = null): array;

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        return $data;
    }

    protected function query(Request $request): Builder
    {
        return $this->model::query()->where('user_id', $request->user()->id)->with($this->with);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'nullable|date', 'from' => 'nullable|date', 'to' => 'nullable|date',
            'q' => 'nullable|string|max:100', 'per_page' => 'nullable|integer|min:1|max:200',
        ]);
        $q = $this->query($request);

        if ($this->dateColumn) {
            if ($request->filled('date')) {
                $q->whereDate($this->dateColumn, $request->date('date'));
            }
            if ($request->filled('from')) {
                $q->whereDate($this->dateColumn, '>=', $request->date('from'));
            }
            if ($request->filled('to')) {
                $q->whereDate($this->dateColumn, '<=', $request->date('to'));
            }
        }
        if ($request->filled('q') && $this->searchable) {
            $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $request->input('q')).'%';
            $q->where(function (Builder $w) use ($term) {
                foreach ($this->searchable as $col) {
                    $w->orWhere($col, 'like', $term);
                }
            });
        }
        foreach ($this->filterable as $col) {
            if ($request->filled($col)) {
                $q->where($col, $request->input($col));
            }
        }
        foreach ($this->orderBy as [$col, $dir]) {
            $q->orderBy($col, $dir);
        }

        if ($request->filled('per_page')) {
            return response()->json($q->paginate($request->integer('per_page')));
        }

        return response()->json(['data' => $q->limit(1000)->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->prepare($request->validate($this->rules($request)), $request);
        $record = new $this->model($data);
        $record->user_id = $request->user()->id;
        $record->save();
        $this->afterSave($record, $request);

        return response()->json(['data' => $record->fresh($this->with)], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->find($request, $id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = $this->find($request, $id);
        $data = $this->prepare($request->validate($this->rules($request, $record)), $request, $record);
        $record->fill($data)->save();
        $this->afterSave($record, $request);

        return response()->json(['data' => $record->fresh($this->with)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->find($request, $id)->delete();

        return response()->json(['message' => 'Deleted']);
    }

    protected function afterSave(Model $record, Request $request): void {}

    protected function find(Request $request, int $id): Model
    {
        return $this->query($request)->findOrFail($id);
    }

    /** "sometimes" on update so partial updates (PATCH-like) work, "required" on create. */
    protected function req(?Model $record): string
    {
        return $record ? 'sometimes|required' : 'required';
    }
}
