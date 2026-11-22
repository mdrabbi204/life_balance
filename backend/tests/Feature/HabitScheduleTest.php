<?php

namespace Tests\Feature;

use Carbon\Carbon;

class HabitScheduleTest extends ApiTestCase
{
    public function test_manual_habit_toggle_and_auto_habit_protection(): void
    {
        $manual = $this->user->habits()->whereNull('system_key')->first();
        $auto = $this->user->habits()->whereNotNull('system_key')->first();
        $this->postJson("/api/habits/{$manual->id}/toggle", ['date' => $this->today()])->assertOk()->assertJsonPath('completed', true);
        $this->postJson("/api/habits/{$manual->id}/toggle", ['date' => $this->today()])->assertOk()->assertJsonPath('completed', false);
        $this->postJson("/api/habits/{$auto->id}/toggle", ['date' => $this->today()])->assertStatus(422);
        $this->postJson("/api/habits/{$manual->id}/toggle", ['date' => now()->addDays(3)->toDateString()])->assertStatus(422);

        $id = $this->postJson('/api/habits', ['name' => 'Read a book', 'frequency' => 'weekly', 'target_per_week' => 3])->assertCreated()->json('data.id');
        $this->getJson('/api/habits')->assertOk()->assertJsonCount(11, 'data');
        $this->getJson('/api/habits/stats')->assertOk()->assertJsonStructure(['heatmap', 'habits', 'weekday_misses', 'most_missed']);
        $this->deleteJson("/api/habits/$id")->assertOk();
    }

    public function test_salah_aware_timeline_splits_and_shifts(): void
    {
        // Sunday 22 Nov 2026 in Dhaka: Dhuhr 11:44, so a fixed office block is split around it.
        $res = $this->getJson('/api/schedule/day?date=2026-11-22')->assertOk();
        $office = collect($res->json('items'))->where('title', 'Office work');
        $this->assertGreaterThan(1, $office->count());
        $this->assertTrue(collect($res->json('items'))->contains(fn ($i) => $i['is_prayer'] && $i['prayer'] === 'dhuhr'));

        // A flexible block overlapping Dhuhr moves after the prayer.
        $this->postJson('/api/schedules', ['title' => 'Walk', 'start_time' => '11:40', 'end_time' => '12:00', 'days_of_week' => [0], 'is_flexible' => true])->assertCreated();
        $walk = collect($this->getJson('/api/schedule/day?date=2026-11-22')->json('items'))->firstWhere('title', 'Walk');
        $this->assertSame('12:04', $walk['start']);

        // Overlap detection.
        $this->postJson('/api/schedules', ['title' => 'Call', 'start_time' => '06:30', 'end_time' => '06:45', 'days_of_week' => [0]])->assertCreated();
        $conflicts = $this->getJson('/api/schedule/day?date=2026-11-22')->json('conflicts');
        $this->assertTrue(collect($conflicts)->contains('type', 'overlap'));
        $this->postJson('/api/schedule/check-overlap', ['start_time' => '06:30', 'end_time' => '06:40', 'days_of_week' => [0]])->assertOk()->assertJsonCount(2, 'overlaps');

        $this->postJson('/api/schedules', ['title' => 'Bad', 'start_time' => '10:00', 'end_time' => '09:00', 'days_of_week' => [0]])->assertStatus(422);
    }

    public function test_occurrence_status_reschedule_and_rest_day(): void
    {
        $run = $this->user->schedules()->where('title', 'Morning running')->first();
        $this->postJson("/api/schedules/{$run->id}/occurrence", ['date' => '2026-11-22', 'status' => 'done'])->assertOk();
        $this->postJson("/api/schedules/{$run->id}/occurrence", ['date' => '2026-11-22', 'start_time' => '06:00', 'end_time' => '06:40'])->assertOk();
        $item = collect($this->getJson('/api/schedule/day?date=2026-11-22')->json('items'))->firstWhere('title', 'Morning running');
        $this->assertSame('done', $item['status']);
        $this->assertSame('06:00', $item['start']);

        $this->postJson('/api/schedule/rest-day', ['date' => '2026-11-22', 'is_rest_day' => true])->assertOk();
        $day = $this->getJson('/api/schedule/day?date=2026-11-22')->json();
        $this->assertTrue($day['is_rest_day']);
        $this->assertSame('rest', collect($day['items'])->firstWhere('title', 'Morning running')['status']);
        $this->getJson('/api/schedule/range?from=2026-11-21&to=2026-11-27')->assertOk()->assertJsonCount(7, 'days');
    }

    public function test_rest_day_does_not_penalise_fitness_score(): void
    {
        $friday = Carbon::parse('2026-11-20'); // default rest day
        $this->postJson('/api/sleep-logs', ['date' => $friday->toDateString(), 'bedtime' => '22:00', 'wake_time' => '05:30', 'quality' => 5]);
        $fitness = $this->getJson('/api/reports/summary?from=2026-11-20&to=2026-11-20')->json('days.0.fitness');
        $this->assertSame(100, $fitness, 'no workout on a rest day must not reduce the fitness score');
    }
}
