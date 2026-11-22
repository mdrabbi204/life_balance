<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PrayerTimes\PrayerTimeService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrayerTimeController extends Controller
{
    public function __construct(private PrayerTimeService $service) {}

    public function day(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $profile = $request->user()->getProfile();
        $date = $request->input('date', Carbon::now($profile->timezone)->toDateString());
        $today = $this->service->forDate($profile, $date);
        $tomorrow = $this->service->forDate($profile, Carbon::parse($date)->addDay());

        return response()->json([
            ...$today,
            'windows' => $this->service->windows($today['times']),
            'tomorrow_fajr' => $tomorrow['times']['fajr'],
            'location' => ['city' => $profile->city, 'country' => $profile->country, 'latitude' => $profile->latitude, 'longitude' => $profile->longitude],
        ]);
    }

    public function month(Request $request): JsonResponse
    {
        $request->validate(['month' => 'nullable|date_format:Y-m']);
        $profile = $request->user()->getProfile();
        $start = Carbon::parse(($request->input('month') ?? Carbon::now($profile->timezone)->format('Y-m')).'-01');
        $days = collect(CarbonPeriod::create($start, $start->copy()->endOfMonth()))
            ->map(fn ($d) => ['date' => $d->toDateString(), 'times' => $this->service->forDate($profile, $d)['times']])
            ->values();

        return response()->json(['month' => $start->format('Y-m'), 'days' => $days]);
    }
}
