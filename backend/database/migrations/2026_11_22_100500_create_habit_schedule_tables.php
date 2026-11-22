<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->enum('category', ['deen', 'career', 'fitness', 'productivity', 'personal'])->default('personal');
            $table->string('icon', 40)->default('circle-check');
            $table->string('color', 20)->default('#0f766e');
            $table->enum('frequency', ['daily', 'weekly'])->default('daily');
            $table->unsignedTinyInteger('target_per_week')->default(7);
            $table->boolean('rest_day_exempt')->default(false);
            $table->string('system_key', 40)->nullable(); // auto-tracked habits derive from logs
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'is_active']);
        });

        Schema::create('habit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->boolean('completed')->default(true);
            $table->timestamps();
            $table->unique(['habit_id', 'date']);
            $table->index(['user_id', 'date']);
        });

        Schema::create('daily_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->enum('category', ['deen', 'career', 'fitness', 'work', 'commute', 'family', 'personal', 'rest', 'other'])->default('other');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_recurring')->default(true);
            $table->json('days_of_week')->nullable(); // 0=Sun..6=Sat
            $table->date('date')->nullable(); // one-off activities
            $table->boolean('is_flexible')->default(false); // flexible blocks shift around Salah, fixed ones split
            $table->boolean('skip_on_rest_day')->default(false);
            $table->unsignedSmallInteger('reminder_minutes')->nullable();
            $table->string('color', 20)->nullable();
            $table->string('notes', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['user_id', 'is_active']);
        });

        Schema::create('schedule_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('daily_schedule_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('status', ['pending', 'done', 'skipped'])->default('pending');
            $table->time('start_time')->nullable(); // per-day reschedule
            $table->time('end_time')->nullable();
            $table->timestamps();
            $table->unique(['daily_schedule_id', 'date']);
        });

        Schema::create('day_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->boolean('is_rest_day');
            $table->string('note', 255)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'date']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['salah', 'quran', 'running', 'study', 'water', 'sleep', 'schedule', 'custom']);
            $table->string('title', 120);
            $table->string('message', 255)->nullable();
            $table->boolean('enabled')->default(true);
            $table->time('time')->nullable();
            $table->unsignedSmallInteger('minutes_before')->nullable();
            $table->unsignedSmallInteger('interval_minutes')->nullable();
            $table->time('window_start')->nullable();
            $table->time('window_end')->nullable();
            $table->json('days_of_week')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('day_overrides');
        Schema::dropIfExists('schedule_occurrences');
        Schema::dropIfExists('daily_schedules');
        Schema::dropIfExists('habit_logs');
        Schema::dropIfExists('habits');
    }
};
