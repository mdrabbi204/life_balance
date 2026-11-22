<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('running_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('distance_km', 6, 2);
            $table->unsignedInteger('duration_seconds');
            $table->unsignedInteger('pace_seconds_per_km')->nullable();
            $table->unsignedInteger('calories')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });

        Schema::create('workouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date')->nullable();
            $table->string('name', 120);
            $table->enum('type', ['push', 'pull', 'legs', 'core', 'full_body', 'custom'])->default('custom');
            $table->boolean('is_template')->default(false);
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'is_template', 'date']);
        });

        Schema::create('workout_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->enum('category', ['push', 'pull', 'legs', 'core', 'cardio', 'other'])->default('other');
            $table->unsignedTinyInteger('sets')->default(3);
            $table->unsignedSmallInteger('reps')->default(10);
            $table->decimal('weight_kg', 6, 2)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('nutrition_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('meal', ['breakfast', 'lunch', 'dinner', 'snack', 'water']);
            $table->string('description', 255)->nullable();
            $table->unsignedSmallInteger('calories')->default(0);
            $table->decimal('protein_g', 6, 1)->default(0);
            $table->unsignedSmallInteger('water_ml')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });

        Schema::create('sleep_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date'); // the morning the user woke up
            $table->time('bedtime');
            $table->time('wake_time');
            $table->unsignedSmallInteger('duration_minutes');
            $table->unsignedTinyInteger('quality')->default(3);
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sleep_logs');
        Schema::dropIfExists('nutrition_logs');
        Schema::dropIfExists('workout_exercises');
        Schema::dropIfExists('workouts');
        Schema::dropIfExists('running_logs');
    }
};
