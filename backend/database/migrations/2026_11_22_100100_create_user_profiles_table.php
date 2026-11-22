<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            // Daily routine
            $table->time('wake_time')->default('05:30');
            $table->time('sleep_time')->default('22:00');
            $table->time('office_start')->default('10:00');
            $table->time('office_end')->default('19:00');
            $table->unsignedSmallInteger('commute_minutes')->default(80);
            $table->string('transport', 50)->default('Bus');
            $table->string('morning_activity', 100)->default('Running');
            $table->string('career_title', 100)->default('Software Engineer');
            $table->json('tech_interests')->nullable();
            $table->text('bio')->nullable();
            // Location & prayer configuration
            $table->string('city', 100)->default('Dhaka');
            $table->string('country', 100)->default('Bangladesh');
            $table->decimal('latitude', 10, 7)->default(23.8103);
            $table->decimal('longitude', 10, 7)->default(90.4125);
            $table->string('timezone', 64)->default('Asia/Dhaka');
            $table->string('prayer_method', 32)->default('Karachi');
            $table->string('asr_method', 16)->default('Hanafi');
            $table->string('high_lat_rule', 16)->default('AngleBased');
            $table->string('prayer_provider', 16)->default('local');
            $table->json('prayer_adjustments')->nullable();
            $table->unsignedSmallInteger('prayer_duration_minutes')->default(20);
            $table->unsignedSmallInteger('jumuah_duration_minutes')->default(60);
            // Preferences
            $table->string('theme', 10)->default('system');
            $table->json('score_weights')->nullable();
            $table->json('goals')->nullable();
            $table->json('rest_days')->nullable(); // weekday numbers 0=Sun..6=Sat
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
