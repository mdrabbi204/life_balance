<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdhkarLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdhkarLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date', 'from' => 'nullable|date', 'to' => 'nullable|date']);
        $q = AdhkarLog::ownedBy($request->user()->id)->orderBy('date')->orderBy('id');
        if ($request->filled('date')) {
            $q->whereDate('date', $request->date('date'));
        }
        if ($request->filled('from')) {
            $q->whereDate('date', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('date', '<=', $request->date('to'));
        }

        return response()->json(['data' => $q->get()]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'type' => 'required|in:morning,evening,sleep,custom',
            'name' => 'required|string|max:100',
            'count' => 'required|integer|min:0|max:1000000',
            'target' => 'nullable|integer|min:0|max:1000000',
            'completed' => 'nullable|boolean',
        ]);
        $target = (int) ($data['target'] ?? 0);
        $completed = $data['completed'] ?? ($target > 0 && $data['count'] >= $target);
        $log = $request->user()->adhkarLogs()->updateOrCreate(
            ['date' => $data['date'], 'type' => $data['type'], 'name' => $data['name']],
            ['count' => $data['count'], 'target' => $target, 'completed' => $completed],
        );

        return response()->json(['data' => $log->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        AdhkarLog::ownedBy($request->user()->id)->findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
