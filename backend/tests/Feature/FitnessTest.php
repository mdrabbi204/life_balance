<?php

namespace Tests\Feature;

class FitnessTest extends ApiTestCase
{
    public function test_running_computes_pace_and_calories(): void
    {
        $res = $this->postJson('/api/running-logs', ['date' => $this->today(), 'distance_km' => 5, 'duration_seconds' => 1500])->assertCreated();
        $this->assertSame(300, $res->json('data.pace_seconds_per_km'));
        $this->assertGreaterThan(0, $res->json('data.calories'));
        $this->getJson('/api/running-logs/stats')->assertOk()->assertJsonPath('total_runs', 1);
        $this->assertTrue($this->user->habits()->where('system_key', 'workout')->first()->logs()->exists());
    }

    public function test_workout_templates_duplicate_and_progression(): void
    {
        $tpl = $this->user->workouts()->where('is_template', true)->first();
        $copy = $this->postJson("/api/workouts/{$tpl->id}/duplicate", ['date' => $this->today()])->assertCreated();
        $this->assertCount($tpl->exercises()->count(), $copy->json('data.exercises'));

        $id = $this->postJson('/api/workouts', ['name' => 'Custom', 'date' => $this->today(), 'exercises' => [['name' => 'Squat', 'category' => 'legs', 'sets' => 5, 'reps' => 5, 'weight_kg' => 80]]])->assertCreated()->json('data.id');
        $this->putJson("/api/workouts/$id", ['name' => 'Custom 2', 'exercises' => [['name' => 'Squat', 'sets' => 5, 'reps' => 5, 'weight_kg' => 85], ['name' => 'Lunge', 'sets' => 3, 'reps' => 10]]])->assertOk()->assertJsonCount(2, 'data.exercises');
        $this->getJson('/api/workouts?templates=1')->assertOk()->assertJsonCount(4, 'data');
        $this->getJson('/api/workouts/stats')->assertOk()->assertJsonPath('progression.Squat.0.weight', 85);
        $this->postJson('/api/workouts', ['name' => 'No date'])->assertStatus(422);
    }

    public function test_nutrition_and_sleep(): void
    {
        $d = $this->today();
        $this->postJson('/api/nutrition-logs', ['date' => $d, 'meal' => 'lunch', 'calories' => 700, 'protein_g' => 40])->assertCreated()->assertJsonPath('data.water_ml', 0);
        $this->postJson('/api/nutrition-logs', ['date' => $d, 'meal' => 'water', 'water_ml' => 3000])->assertCreated();
        $this->assertTrue($this->user->habits()->where('system_key', 'water')->first()->logs()->exists());

        $res = $this->postJson('/api/sleep-logs', ['date' => $d, 'bedtime' => '22:30', 'wake_time' => '05:30', 'quality' => 4])->assertCreated();
        $this->assertSame(420, $res->json('data.duration_minutes'));
        $this->postJson('/api/sleep-logs', ['date' => $d, 'bedtime' => '23:00', 'wake_time' => '06:00'])->assertStatus(422);
    }
}
