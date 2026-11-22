<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;

class DashboardReportBackupTest extends ApiTestCase
{
    public function test_dashboard_and_reports_derive_from_stored_data(): void
    {
        $d = $this->today();
        $this->postJson('/api/learning-sessions', ['date' => $d, 'minutes' => 120]);
        $dash = $this->getJson('/api/dashboard')->assertOk()->assertJsonStructure(['today' => ['scores', 'discipline', 'completion', 'metrics'], 'trend', 'timeline', 'habits']);
        $this->assertSame(120, $dash->json('today.metrics.study.minutes'));
        $this->assertLessThanOrEqual(100, $dash->json('today.scores.career'), 'excess study must be capped');

        $this->getJson('/api/reports/summary')->assertOk()->assertJsonCount(30, 'days')->assertJsonPath('totals.study_minutes', 120);
    }

    public function test_profile_update_and_validation(): void
    {
        $this->putJson('/api/profile', ['city' => 'Chattogram', 'latitude' => 22.3569, 'longitude' => 91.7832, 'prayer_method' => 'MWL', 'goals' => ['quran_pages' => 10], 'rest_days' => [5, 6]])->assertOk()
            ->assertJsonPath('user.profile.city', 'Chattogram')->assertJsonPath('user.profile.goals.quran_pages', 10)->assertJsonPath('user.profile.goals.study_minutes', 60);
        $this->putJson('/api/profile', ['prayer_method' => 'Unknown', 'latitude' => 200, 'timezone' => 'Mars/Base'])->assertStatus(422)->assertJsonValidationErrors(['prayer_method', 'latitude', 'timezone']);
        $this->postJson('/api/profile/avatar', ['avatar' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')])->assertStatus(422);
    }

    public function test_backup_and_restore_round_trip(): void
    {
        $this->postJson('/api/quran-logs', ['date' => $this->today(), 'pages_read' => 3]);
        $topic = $this->user->learningTopics()->first();
        $this->postJson('/api/learning-sessions', ['date' => $this->today(), 'minutes' => 30, 'learning_topic_id' => $topic->id]);
        $json = $this->getJson('/api/backup')->assertOk()->getContent();

        $this->user->quranLogs()->delete();
        $file = UploadedFile::fake()->createWithContent('backup.json', $json);
        $this->postJson('/api/restore', ['backup' => $file])->assertOk();
        $this->assertSame(1, $this->user->quranLogs()->count());
        $this->assertNotNull($this->user->learningSessions()->first()->learning_topic_id, 'parent ids remapped');
        $this->assertSame(10, $this->user->habits()->count());

        $bad = UploadedFile::fake()->createWithContent('bad.json', '{"hello":1}');
        $this->postJson('/api/restore', ['backup' => $bad])->assertStatus(422);
    }

    public function test_reminders_crud(): void
    {
        $id = $this->postJson('/api/reminders', ['type' => 'custom', 'title' => 'Call parents', 'time' => '20:30', 'days_of_week' => [5]])->assertCreated()->json('data.id');
        $this->putJson("/api/reminders/$id", ['enabled' => false])->assertOk()->assertJsonPath('data.enabled', false);
        $this->getJson('/api/reminders')->assertOk()->assertJsonCount(8, 'data');
    }
}
