<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function summary(Request $request, ReportService $reports): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);
        $tz = $request->user()->getProfile()->timezone;
        $to = $request->input('to', Carbon::now($tz)->toDateString());
        $from = $request->input('from', Carbon::parse($to)->subDays(29)->toDateString());
        if (Carbon::parse($from)->diffInDays(Carbon::parse($to)) > 366) {
            return response()->json(['message' => 'Range too large (max 1 year).'], 422);
        }

        return response()->json($reports->summary($request->user(), $from, $to));
    }
}
