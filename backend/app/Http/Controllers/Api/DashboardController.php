<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DayBundle;
use App\Services\HabitService;
use App\Services\ScheduleService;
use App\Services\ScoreService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private ScoreService $scores, private ScheduleService $schedule, private HabitService $habits) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $user = $request->user();
        $tz = $user->getProfile()->timezone;
        $date = Carbon::parse($request->input('date', Carbon::now($tz)->toDateString()));
        $ds = $date->toDateString();

        $bundle = DayBundle::load($user, $date->copy()->subDays(6)->toDateString(), $ds);
        $nowMin = $this->schedule->nowMinutes($user, $date);
        $today = $this->scores->day($bundle, $ds, $nowMin);

        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = $date->copy()->subDays($i);
            $s = $i === 0 ? $today : $this->scores->day($bundle, $d->toDateString(), $this->schedule->nowMinutes($user, $d));
            $trend[] = ['date' => $d->toDateString(), 'overall' => $s['scores']['overall'], 'discipline' => $s['discipline']] + $s['scores'];
        }

        $timeline = $this->schedule->forDate($user, $date);

        return response()->json([
            'date' => $ds,
            'today' => $today,
            'trend' => $trend,
            'timeline' => $timeline,
            'habits' => collect($this->habits->forDate($user, $ds))->where('is_active', true)->values(),
            'weights' => $user->getProfile()->weights(),
        ]);
    }
}
