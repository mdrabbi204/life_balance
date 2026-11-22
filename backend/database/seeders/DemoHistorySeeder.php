<?php

namespace Database\Seeders;

use App\Models\LearningTopic;
use App\Models\User;
use App\Services\HabitService;
use App\Services\PrayerTimes\PrayerTimeService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Model;

/**
 * OPTIONAL: fills the demo account with ~6 weeks of sample activity so every chart and report
 * has something to show while you explore. Everything is stored as normal records —
 * dashboards compute from them exactly as they would from real entries.
 * Never run this against a real account.
 */
class DemoHistorySeeder extends Seeder
{
    public function run(PrayerTimeService $prayerTimes, HabitService $habits): void
    {
        $user = User::where('email', 'demo@lifebalance.test')->firstOrFail();
        $profile = $user->getProfile();
        $today = Carbon::now($profile->timezone)->startOfDay();
        mt_srand(42);

        $topics = LearningTopic::ownedBy($user->id)->get();
        foreach ($topics->take(6) as $i => $t) {
            $t->update(['status' => ['learning', 'practicing', 'learning', 'completed', 'practicing', 'learning'][$i], 'progress' => [45, 70, 30, 100, 60, 20][$i]]);
        }

        $project = $user->projects()->firstOrCreate(['name' => 'LifeBalance app'], [
            'description' => 'Personal life management app built with Laravel and React.',
            'technologies' => ['Laravel', 'React', 'TypeScript', 'MySQL'], 'start_date' => $today->copy()->subDays(40),
            'target_date' => $today->copy()->addDays(20), 'priority' => 'high', 'status' => 'active',
        ]);
        foreach ([['Design database schema', 'done'], ['Build REST API', 'done'], ['Dashboard UI', 'in_progress'], ['Reports and exports', 'todo'], ['Deploy to VPS', 'todo']] as $i => [$title, $status]) {
            $project->tasks()->firstOrCreate(['title' => $title], ['user_id' => $user->id, 'status' => $status, 'position' => $i, 'priority' => 'medium']);
        }

        for ($i = 41; $i >= 1; $i--) {
            $d = $today->copy()->subDays($i);
            $date = $d->toDateString();
            $isFriday = $d->dayOfWeek === Carbon::FRIDAY;

            foreach (PrayerTimeService::PRAYERS as $p) {
                $r = mt_rand(1, 100);
                $status = $r <= 82 ? 'on_time' : ($r <= 95 ? 'delayed' : 'missed');
                $user->prayerLogs()->updateOrCreate(['date' => $date, 'prayer' => $p], ['status' => $status, 'in_congregation' => mt_rand(0, 1) === 1]);
            }
            if (mt_rand(1, 100) <= 80) {
                $user->quranLogs()->create(['date' => $date, 'pages_read' => mt_rand(2, 8), 'minutes' => mt_rand(10, 30), 'surah_number' => min(114, 2 + intdiv(41 - $i, 3))]);
            }
            foreach (['morning' => 85, 'evening' => 70] as $type => $chance) {
                if (mt_rand(1, 100) <= $chance) {
                    $user->adhkarLogs()->updateOrCreate(['date' => $date, 'type' => $type, 'name' => ucfirst($type).' Adhkar'], ['count' => 1, 'target' => 1, 'completed' => true]);
                }
            }
            if (mt_rand(1, 100) <= 85) {
                $user->learningSessions()->create(['date' => $date, 'minutes' => mt_rand(30, 90), 'learning_topic_id' => $topics->random()->id, 'challenges_solved' => mt_rand(0, 3), 'topics_studied' => 'Practice session']);
            }
            if (! $isFriday && mt_rand(1, 100) <= 75) {
                $km = mt_rand(30, 80) / 10;
                $user->runningLogs()->create(['date' => $date, 'distance_km' => $km, 'duration_seconds' => (int) ($km * mt_rand(320, 390)), 'calories' => (int) ($km * 72)]);
            }
            if (in_array($d->dayOfWeek, [0, 2, 4], true)) {
                $tpl = $user->workouts()->where('is_template', true)->inRandomOrder()->first();
                $w = $user->workouts()->create(['date' => $date, 'name' => $tpl->name, 'type' => $tpl->type, 'duration_minutes' => mt_rand(35, 60)]);
                foreach ($tpl->exercises as $ex) {
                    $w->exercises()->create($ex->only(['name', 'category', 'sets', 'reps', 'position']) + ['weight_kg' => in_array($ex->category, ['push', 'pull', 'legs']) ? 20 + (41 - $i) * 0.5 : null]);
                }
            }
            $bed = sprintf('%02d:%02d', mt_rand(0, 3) === 0 ? 23 : 22, mt_rand(0, 50));
            $user->sleepLogs()->updateOrCreate(['date' => $date], ['bedtime' => $bed, 'wake_time' => sprintf('05:%02d', mt_rand(15, 40)), 'quality' => mt_rand(3, 5)]);
            foreach ([['breakfast', 550, 30, 0], ['lunch', 750, 40, 0], ['dinner', 700, 45, 0], ['water', 0, 0, mt_rand(2000, 3200)]] as [$meal, $cal, $pro, $water]) {
                $user->nutritionLogs()->create(['date' => $date, 'meal' => $meal, 'calories' => $cal, 'protein_g' => $pro, 'water_ml' => $water, 'description' => ucfirst($meal)]);
            }
            foreach ($user->habits()->whereNull('system_key')->get() as $h) {
                if (mt_rand(1, 100) <= 75) {
                    $habits->toggle($h, $date, true);
                }
            }
            foreach ($user->schedules()->get() as $s) {
                if ($s->occursOn($d) && ! ($isFriday && $s->skip_on_rest_day)) {
                    $user->scheduleOccurrences()->updateOrCreate(['daily_schedule_id' => $s->id, 'date' => $date], ['status' => mt_rand(1, 100) <= 80 ? 'done' : 'skipped']);
                }
            }
            $habits->syncAutoHabits($user->id, $date);
        }
    }
}
