<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Full JSON export / import of a user's data. */
class BackupController extends Controller
{
    /** Tables in dependency order; parent references are remapped on restore. */
    private const TABLES = [
        'learning_topics', 'projects', 'habits', 'daily_schedules', 'workouts',
        'prayer_logs', 'quran_logs', 'adhkar_logs', 'islamic_learning_logs', 'learning_sessions', 'project_tasks',
        'running_logs', 'nutrition_logs', 'sleep_logs', 'habit_logs', 'schedule_occurrences', 'day_overrides', 'notifications',
    ];

    private const PARENTS = [
        'learning_sessions' => ['learning_topic_id' => 'learning_topics'],
        'project_tasks' => ['project_id' => 'projects'],
        'habit_logs' => ['habit_id' => 'habits'],
        'schedule_occurrences' => ['daily_schedule_id' => 'daily_schedules'],
    ];

    public function export(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = ['version' => 1, 'app' => 'LifeBalance', 'exported_at' => now()->toIso8601String(), 'profile' => $user->getProfile()->makeHidden(['id', 'user_id'])->toArray(), 'tables' => []];
        foreach (self::TABLES as $t) {
            $data['tables'][$t] = DB::table($t)->where('user_id', $user->id)->get();
        }
        $workoutIds = DB::table('workouts')->where('user_id', $user->id)->pluck('id');
        $data['tables']['workout_exercises'] = DB::table('workout_exercises')->whereIn('workout_id', $workoutIds)->get();

        return response()->json($data)->header('Content-Disposition', 'attachment; filename="lifebalance-backup-'.now()->format('Y-m-d').'.json"');
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['backup' => 'required|file|mimetypes:application/json,text/plain|max:20480']);
        $payload = json_decode(file_get_contents($request->file('backup')->getRealPath()), true);
        if (! is_array($payload) || ($payload['app'] ?? null) !== 'LifeBalance' || ! isset($payload['tables'])) {
            return response()->json(['message' => 'This file is not a valid LifeBalance backup.'], 422);
        }
        $user = $request->user();

        DB::transaction(function () use ($user, $payload) {
            $this->wipe($user);
            if (! empty($payload['profile'])) {
                $profileCols = Schema::getColumnListing('user_profiles');
                $profile = array_intersect_key($payload['profile'], array_flip($profileCols));
                unset($profile['id'], $profile['user_id'], $profile['created_at'], $profile['updated_at']);
                $user->getProfile()->fill($profile)->save();
            }
            $idMap = [];
            foreach (array_merge(self::TABLES, ['workout_exercises']) as $table) {
                $rows = $payload['tables'][$table] ?? [];
                $cols = array_flip(Schema::getColumnListing($table));
                foreach ($rows as $row) {
                    $row = array_intersect_key((array) $row, $cols);
                    $oldId = $row['id'] ?? null;
                    unset($row['id']);
                    foreach ($row as $k => $v) {
                        if (is_array($v)) {
                            $row[$k] = json_encode($v);
                        }
                    }
                    if ($table === 'workout_exercises') {
                        $row['workout_id'] = $idMap['workouts'][$row['workout_id']] ?? null;
                        if (! $row['workout_id']) {
                            continue;
                        }
                    } else {
                        $row['user_id'] = $user->id;
                    }
                    foreach (self::PARENTS[$table] ?? [] as $col => $parent) {
                        if (! empty($row[$col])) {
                            $row[$col] = $idMap[$parent][$row[$col]] ?? null;
                        }
                    }
                    if ($table !== 'learning_sessions' && collect(self::PARENTS[$table] ?? [])->keys()->contains(fn ($c) => empty($row[$c]))) {
                        continue; // orphaned child row
                    }
                    $newId = DB::table($table)->insertGetId($row);
                    if ($oldId) {
                        $idMap[$table][$oldId] = $newId;
                    }
                }
            }
        });

        return response()->json(['message' => 'Backup restored successfully.']);
    }

    private function wipe(User $user): void
    {
        foreach (array_reverse(self::TABLES) as $t) {
            DB::table($t)->where('user_id', $user->id)->delete();
        }
    }
}
