<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use BelongsToUser;

    protected $guarded = ['id', 'user_id'];

    public const DEFAULT_WEIGHTS = ['deen' => 30, 'career' => 20, 'fitness' => 20, 'productivity' => 15, 'family' => 15];

    public const DEFAULT_GOALS = [
        'quran_pages' => 4,
        'study_minutes' => 60,
        'water_ml' => 3000,
        'sleep_hours' => 7,
        'protein_g' => 120,
        'calories' => 2400,
        'weekly_run_km' => 20,
        'workouts_per_week' => 4,
        'islamic_learning_minutes_week' => 120,
        'body_weight_kg' => 70,
    ];

    public const DEFAULT_TECH = ['PHP', 'Laravel', 'CodeIgniter', 'MySQL', 'MSSQL', 'React', 'TypeScript', 'Rust', 'System Design', 'Software Architecture'];

    protected function casts(): array
    {
        return [
            'tech_interests' => 'array',
            'prayer_adjustments' => 'array',
            'score_weights' => 'array',
            'goals' => 'array',
            'rest_days' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function weights(): array
    {
        return array_merge(self::DEFAULT_WEIGHTS, $this->score_weights ?? []);
    }

    public function goal(string $key): float
    {
        return (float) (($this->goals ?? [])[$key] ?? self::DEFAULT_GOALS[$key] ?? 0);
    }

    public function allGoals(): array
    {
        return array_merge(self::DEFAULT_GOALS, $this->goals ?? []);
    }
}
