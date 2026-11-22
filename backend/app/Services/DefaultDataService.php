<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/** Creates the default LifeBalance setup for a new account (profile, habits, schedule, roadmap, reminders). */
class DefaultDataService
{
    public const LEARNING_TOPICS = [
        ['Advanced PHP', 'Backend'], ['Laravel', 'Backend'], ['CodeIgniter', 'Backend'], ['MySQL and MSSQL', 'Databases'],
        ['Database optimization', 'Databases'], ['Data structures and algorithms', 'Fundamentals'], ['React', 'Frontend'],
        ['TypeScript', 'Frontend'], ['Rust', 'Languages'], ['REST APIs', 'Backend'], ['Software architecture', 'Architecture'],
        ['System design', 'Architecture'], ['Docker', 'DevOps'], ['Linux', 'DevOps'], ['AWS', 'Cloud'], ['CI/CD', 'DevOps'],
        ['AI-assisted development', 'AI'],
    ];

    public function seedFor(User $user): void
    {
        DB::transaction(function () use ($user) {
            $this->profile($user);
            $this->habits($user);
            $this->schedule($user);
            $this->learningTopics($user);
            $this->reminders($user);
            $this->workoutTemplates($user);
        });
    }

    public function profile(User $user): void
    {
        $user->profile()->firstOrCreate([], [
            'tech_interests' => UserProfile::DEFAULT_TECH,
            'score_weights' => UserProfile::DEFAULT_WEIGHTS,
            'goals' => UserProfile::DEFAULT_GOALS,
            'rest_days' => [5], // Friday
            'prayer_adjustments' => ['fajr' => 0, 'sunrise' => 0, 'dhuhr' => 0, 'asr' => 0, 'maghrib' => 0, 'isha' => 0],
        ]);
    }

    public function habits(User $user): void
    {
        $habits = [
            ['Five daily Salah', 'deen', 'moon', '#0f766e', 'salah', false],
            ['Quran reading', 'deen', 'book-open', '#059669', 'quran', false],
            ['Morning Adhkar', 'deen', 'sunrise', '#0d9488', 'morning_adhkar', false],
            ['Evening Adhkar', 'deen', 'sunset', '#0e7490', 'evening_adhkar', false],
            ['Morning running', 'fitness', 'footprints', '#ea580c', 'workout', true],
            ['Software engineering study', 'career', 'code', '#4f46e5', 'study', false],
            ['Healthy eating', 'fitness', 'salad', '#65a30d', null, false],
            ['Sufficient water', 'fitness', 'glass-water', '#0284c7', 'water', false],
            ['Family time', 'personal', 'heart', '#db2777', null, false],
            ['Sleep on time', 'personal', 'bed', '#7c3aed', 'sleep_on_time', false],
        ];
        foreach ($habits as $i => [$name, $cat, $icon, $color, $key, $restExempt]) {
            $user->habits()->firstOrCreate(['name' => $name], [
                'category' => $cat, 'icon' => $icon, 'color' => $color, 'system_key' => $key,
                'rest_day_exempt' => $restExempt, 'sort_order' => $i,
            ]);
        }
    }

    public function schedule(User $user): void
    {
        $all = [0, 1, 2, 3, 4, 5, 6];
        $office = [0, 1, 2, 3, 4]; // Sun–Thu
        $rows = [
            ['Morning running', 'fitness', '05:30', '06:15', $all, true, true, 10, '#ea580c'],
            ['Shower and breakfast', 'personal', '06:15', '07:00', $all, true, false, null, '#64748b'],
            ['Software engineering study', 'career', '07:00', '08:00', $all, true, false, 5, '#4f46e5'],
            ['Preparation and commute', 'commute', '08:00', '08:40', $office, false, false, null, '#94a3b8'],
            ['Bus journey', 'commute', '08:40', '10:00', $office, false, false, null, '#94a3b8'],
            ['Office work', 'work', '10:00', '19:00', $office, false, false, null, '#0ea5e9'],
            ['Return commute', 'commute', '19:00', '20:20', $office, false, false, null, '#94a3b8'],
            ['Family, dinner and Isha', 'family', '20:20', '21:30', $all, false, false, null, '#db2777'],
            ['Sleep preparation', 'rest', '21:30', '22:00', $all, true, false, 15, '#7c3aed'],
        ];
        foreach ($rows as [$title, $cat, $start, $end, $days, $flex, $skipRest, $reminder, $color]) {
            $user->schedules()->firstOrCreate(['title' => $title], [
                'category' => $cat, 'start_time' => $start, 'end_time' => $end, 'days_of_week' => $days,
                'is_recurring' => true, 'is_flexible' => $flex, 'skip_on_rest_day' => $skipRest,
                'reminder_minutes' => $reminder, 'color' => $color,
            ]);
        }
    }

    public function learningTopics(User $user): void
    {
        foreach (self::LEARNING_TOPICS as $i => [$name, $category]) {
            $user->learningTopics()->firstOrCreate(['name' => $name], ['category' => $category, 'sort_order' => $i]);
        }
    }

    public function reminders(User $user): void
    {
        $rows = [
            ['salah', 'Upcoming Salah', 'Prepare for prayer — wudu and a calm heart.', ['minutes_before' => 10]],
            ['quran', 'Quran reading', 'Time for your daily Quran pages.', ['time' => '05:20']],
            ['running', 'Morning run', 'Lace up — your run starts soon.', ['time' => '05:25']],
            ['study', 'Programming study', 'Deep-work study block is starting.', ['time' => '06:55']],
            ['water', 'Drink water', 'Stay hydrated — have a glass of water.', ['interval_minutes' => 90, 'window_start' => '08:00', 'window_end' => '21:00']],
            ['sleep', 'Sleep preparation', 'Wind down: evening adhkar, screens off.', ['time' => '21:30']],
            ['schedule', 'Activity reminders', 'Reminders for schedule blocks that have a reminder set.', []],
        ];
        foreach ($rows as [$type, $title, $message, $extra]) {
            $user->reminders()->firstOrCreate(['type' => $type, 'title' => $title], ['message' => $message, 'enabled' => true] + $extra);
        }
    }

    public function workoutTemplates(User $user): void
    {
        $templates = [
            ['Push day', 'push', [['Push-ups', 'push', 4, 15], ['Bench press', 'push', 4, 8], ['Overhead press', 'push', 3, 10], ['Dips', 'push', 3, 10]]],
            ['Pull day', 'pull', [['Pull-ups', 'pull', 4, 8], ['Barbell row', 'pull', 4, 10], ['Face pulls', 'pull', 3, 15], ['Biceps curls', 'pull', 3, 12]]],
            ['Leg day', 'legs', [['Squats', 'legs', 4, 8], ['Romanian deadlift', 'legs', 3, 10], ['Walking lunges', 'legs', 3, 12], ['Calf raises', 'legs', 3, 20]]],
            ['Core', 'core', [['Plank (sec)', 'core', 3, 60], ['Hanging leg raises', 'core', 3, 12], ['Russian twists', 'core', 3, 20], ['Dead bug', 'core', 3, 12]]],
        ];
        foreach ($templates as [$name, $type, $exercises]) {
            if ($user->workouts()->where('is_template', true)->where('name', $name)->exists()) {
                continue;
            }
            $w = $user->workouts()->create(['name' => $name, 'type' => $type, 'is_template' => true, 'duration_minutes' => 45]);
            foreach ($exercises as $i => [$ex, $cat, $sets, $reps]) {
                $w->exercises()->create(['name' => $ex, 'category' => $cat, 'sets' => $sets, 'reps' => $reps, 'position' => $i]);
            }
        }
    }
}
