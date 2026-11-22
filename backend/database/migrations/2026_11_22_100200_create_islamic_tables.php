<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prayer_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('prayer', ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
            $table->enum('status', ['on_time', 'delayed', 'missed']);
            $table->time('prayed_at')->nullable();
            $table->boolean('in_congregation')->default(false);
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'date', 'prayer']);
        });

        Schema::create('quran_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedSmallInteger('pages_read')->default(0);
            $table->unsignedTinyInteger('surah_number')->nullable();
            $table->unsignedSmallInteger('ayah_from')->nullable();
            $table->unsignedSmallInteger('ayah_to')->nullable();
            $table->unsignedSmallInteger('minutes')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });

        Schema::create('adhkar_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('type', ['morning', 'evening', 'sleep', 'custom']);
            $table->string('name', 100);
            $table->unsignedInteger('count')->default(0);
            $table->unsignedInteger('target')->default(0);
            $table->boolean('completed')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'date', 'type', 'name']);
        });

        Schema::create('islamic_learning_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('type', ['lecture', 'hadith', 'book', 'other']);
            $table->string('title', 200);
            $table->string('source', 200)->nullable();
            $table->unsignedSmallInteger('minutes')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('islamic_learning_logs');
        Schema::dropIfExists('adhkar_logs');
        Schema::dropIfExists('quran_logs');
        Schema::dropIfExists('prayer_logs');
    }
};
