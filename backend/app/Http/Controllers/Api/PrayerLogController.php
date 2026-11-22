<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrayerLog;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PrayerLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date', 'from' => 'nullable|date', 'to' => 'nullable|date']);
        $q = PrayerLog::ownedBy($request->user()->id)->orderBy('date');
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

    /** Create or update the log for (date, prayer). */
    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date|before_or_equal:'.Carbon::now($request->user()->getProfile()->timezone)->addDay()->toDateString(),
            'prayer' => ['required', Rule::in(PrayerLog::PRAYERS)],
            'status' => 'required|in:on_time,delayed,missed',
            'prayed_at' => 'nullable|date_format:H:i',
            'in_congregation' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);
        $log = $request->user()->prayerLogs()->updateOrCreate(
            ['date' => $data['date'], 'prayer' => $data['prayer']],
            array_diff_key($data, array_flip(['date', 'prayer'])),
        );

        return response()->json(['data' => $log->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        PrayerLog::ownedBy($request->user()->id)->findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function report(Request $request, ReportService $reports): JsonResponse
    {
        $request->validate(['period' => 'nullable|in:day,week,month', 'date' => 'nullable|date']);
        $tz = $request->user()->getProfile()->timezone;

        return response()->json($reports->salah($request->user(), $request->input('period', 'week'), $request->input('date', Carbon::now($tz)->toDateString())));
    }
}
