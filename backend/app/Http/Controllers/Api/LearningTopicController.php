<?php

namespace App\Http\Controllers\Api;

use App\Models\LearningTopic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LearningTopicController extends CrudController
{
    protected string $model = LearningTopic::class;
    protected ?string $dateColumn = null;
    protected array $searchable = ['name', 'category', 'notes'];
    protected array $filterable = ['status', 'category'];
    protected array $orderBy = [['sort_order', 'asc'], ['id', 'asc']];

    protected function query(Request $request): Builder
    {
        return parent::query($request)->withSum('sessions as minutes_total', 'minutes')->withCount('sessions');
    }

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'name' => $this->req($record).'|string|max:120',
            'category' => 'nullable|string|max:60',
            'status' => 'sometimes|in:not_started,learning,practicing,completed',
            'progress' => 'sometimes|integer|between:0,100',
            'target_date' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
            'sort_order' => 'sometimes|integer|min:0',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        // Keep status and progress consistent.
        if (($data['status'] ?? null) === 'completed') {
            $data['progress'] = 100;
        } elseif (isset($data['progress']) && $data['progress'] == 100 && ! isset($data['status'])) {
            $data['status'] = 'completed';
        } elseif (isset($data['progress']) && $data['progress'] > 0 && ($record?->status ?? 'not_started') === 'not_started' && ! isset($data['status'])) {
            $data['status'] = 'learning';
        }
        $data['category'] = $data['category'] ?? $record?->category ?? 'General';

        return $data;
    }
}
