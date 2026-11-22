<?php

namespace App\Http\Controllers\Api;

use App\Models\NutritionLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NutritionLogController extends CrudController
{
    protected string $model = NutritionLog::class;
    protected array $searchable = ['description'];
    protected array $filterable = ['meal'];
    protected array $orderBy = [['date', 'desc'], ['created_at', 'asc']];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => $this->req($record).'|date',
            'meal' => $this->req($record).'|in:breakfast,lunch,dinner,snack,water',
            'description' => 'nullable|string|max:255',
            'calories' => 'nullable|integer|min:0|max:10000',
            'protein_g' => 'nullable|numeric|min:0|max:1000',
            'water_ml' => 'nullable|integer|min:0|max:10000',
        ];
    }

    protected function prepare(array $data, Request $request, ?Model $record = null): array
    {
        foreach (['calories', 'protein_g', 'water_ml'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === null) {
                $data[$k] = 0;
            }
        }

        return $data;
    }
}
