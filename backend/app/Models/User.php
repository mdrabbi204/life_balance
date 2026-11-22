<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'avatar_path'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? '/storage/'.$this->avatar_path : null;
    }

    public function profile(): HasOne { return $this->hasOne(UserProfile::class); }
    public function prayerLogs(): HasMany { return $this->hasMany(PrayerLog::class); }
    public function quranLogs(): HasMany { return $this->hasMany(QuranLog::class); }
    public function adhkarLogs(): HasMany { return $this->hasMany(AdhkarLog::class); }
    public function islamicLearningLogs(): HasMany { return $this->hasMany(IslamicLearningLog::class); }
    public function learningTopics(): HasMany { return $this->hasMany(LearningTopic::class); }
    public function learningSessions(): HasMany { return $this->hasMany(LearningSession::class); }
    public function projects(): HasMany { return $this->hasMany(Project::class); }
    public function projectTasks(): HasMany { return $this->hasMany(ProjectTask::class); }
    public function runningLogs(): HasMany { return $this->hasMany(RunningLog::class); }
    public function workouts(): HasMany { return $this->hasMany(Workout::class); }
    public function nutritionLogs(): HasMany { return $this->hasMany(NutritionLog::class); }
    public function sleepLogs(): HasMany { return $this->hasMany(SleepLog::class); }
    public function habits(): HasMany { return $this->hasMany(Habit::class); }
    public function habitLogs(): HasMany { return $this->hasMany(HabitLog::class); }
    public function schedules(): HasMany { return $this->hasMany(DailySchedule::class); }
    public function scheduleOccurrences(): HasMany { return $this->hasMany(ScheduleOccurrence::class); }
    public function dayOverrides(): HasMany { return $this->hasMany(DayOverride::class); }
    public function reminders(): HasMany { return $this->hasMany(Reminder::class); }

    /** Profile is always present; created lazily for safety. */
    public function getProfile(): UserProfile
    {
        return $this->profile ?? $this->profile()->create([]);
    }
}
