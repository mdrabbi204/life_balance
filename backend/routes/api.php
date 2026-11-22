<?php

use App\Http\Controllers\Api\AdhkarLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HabitController;
use App\Http\Controllers\Api\IslamicLearningController;
use App\Http\Controllers\Api\LearningSessionController;
use App\Http\Controllers\Api\LearningTopicController;
use App\Http\Controllers\Api\NutritionLogController;
use App\Http\Controllers\Api\PrayerLogController;
use App\Http\Controllers\Api\PrayerTimeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectTaskController;
use App\Http\Controllers\Api\QuranLogController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RunningLogController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SleepLogController;
use App\Http\Controllers\Api\WorkoutController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::middleware(['auth:sanctum', 'throttle:240,1'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::put('auth/password', [AuthController::class, 'changePassword']);

    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::post('profile/avatar', [ProfileController::class, 'avatar']);
    Route::delete('profile/avatar', [ProfileController::class, 'removeAvatar']);

    Route::get('dashboard', [DashboardController::class, 'index']);

    // Islamic life
    Route::get('prayer-times', [PrayerTimeController::class, 'day']);
    Route::get('prayer-times/month', [PrayerTimeController::class, 'month']);
    Route::get('prayer-logs', [PrayerLogController::class, 'index']);
    Route::post('prayer-logs', [PrayerLogController::class, 'upsert']);
    Route::delete('prayer-logs/{id}', [PrayerLogController::class, 'destroy']);
    Route::get('reports/salah', [PrayerLogController::class, 'report']);
    Route::get('quran-logs/stats', [QuranLogController::class, 'stats']);
    Route::apiResource('quran-logs', QuranLogController::class)->parameters(['quran-logs' => 'id']);
    Route::get('adhkar-logs', [AdhkarLogController::class, 'index']);
    Route::post('adhkar-logs', [AdhkarLogController::class, 'upsert']);
    Route::delete('adhkar-logs/{id}', [AdhkarLogController::class, 'destroy']);
    Route::get('islamic-learning/weekly', [IslamicLearningController::class, 'weekly']);
    Route::apiResource('islamic-learning', IslamicLearningController::class)->parameters(['islamic-learning' => 'id']);

    // Career
    Route::apiResource('learning-topics', LearningTopicController::class)->parameters(['learning-topics' => 'id']);
    Route::get('learning-sessions/stats', [LearningSessionController::class, 'stats']);
    Route::apiResource('learning-sessions', LearningSessionController::class)->parameters(['learning-sessions' => 'id']);
    Route::apiResource('projects', ProjectController::class)->parameters(['projects' => 'id']);
    Route::patch('project-tasks/{id}/move', [ProjectTaskController::class, 'move']);
    Route::apiResource('project-tasks', ProjectTaskController::class)->parameters(['project-tasks' => 'id']);

    // Fitness
    Route::get('running-logs/stats', [RunningLogController::class, 'stats']);
    Route::apiResource('running-logs', RunningLogController::class)->parameters(['running-logs' => 'id']);
    Route::get('workouts/stats', [WorkoutController::class, 'stats']);
    Route::post('workouts/{id}/duplicate', [WorkoutController::class, 'duplicate']);
    Route::apiResource('workouts', WorkoutController::class)->parameters(['workouts' => 'id']);
    Route::apiResource('nutrition-logs', NutritionLogController::class)->parameters(['nutrition-logs' => 'id']);
    Route::apiResource('sleep-logs', SleepLogController::class)->parameters(['sleep-logs' => 'id']);

    // Habits
    Route::get('habits/stats', [HabitController::class, 'stats']);
    Route::post('habits/{id}/toggle', [HabitController::class, 'toggle']);
    Route::apiResource('habits', HabitController::class)->parameters(['habits' => 'id']);

    // Schedule / calendar
    Route::get('schedule/day', [ScheduleController::class, 'day']);
    Route::get('schedule/range', [ScheduleController::class, 'range']);
    Route::post('schedule/rest-day', [ScheduleController::class, 'restDay']);
    Route::post('schedule/check-overlap', [ScheduleController::class, 'checkOverlap']);
    Route::post('schedules/{id}/occurrence', [ScheduleController::class, 'occurrence']);
    Route::apiResource('schedules', ScheduleController::class)->parameters(['schedules' => 'id']);

    // Reminders
    Route::apiResource('reminders', ReminderController::class)->parameters(['reminders' => 'id']);

    // Reports & backup
    Route::get('reports/summary', [ReportController::class, 'summary']);
    Route::get('backup', [BackupController::class, 'export']);
    Route::post('restore', [BackupController::class, 'import']);
});
