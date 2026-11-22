<?php

namespace Tests\Feature;

class IslamicTest extends ApiTestCase
{
    public function test_prayer_times_and_logs(): void
    {
        $this->getJson('/api/prayer-times?date=2026-11-22')->assertOk()->assertJsonPath('times.dhuhr', '11:44')->assertJsonStructure(['windows', 'tomorrow_fajr']);
        $this->getJson('/api/prayer-times/month?month=2026-11')->assertOk()->assertJsonCount(30, 'days');

        $d = $this->today();
        $this->postJson('/api/prayer-logs', ['date' => $d, 'prayer' => 'fajr', 'status' => 'on_time'])->assertOk()->assertJsonPath('data.status', 'on_time');
        $this->postJson('/api/prayer-logs', ['date' => $d, 'prayer' => 'fajr', 'status' => 'delayed'])->assertOk();
        $this->assertSame(1, $this->user->prayerLogs()->count(), 'upsert must not duplicate');
        $this->postJson('/api/prayer-logs', ['date' => $d, 'prayer' => 'witr', 'status' => 'on_time'])->assertStatus(422);

        foreach (['dhuhr', 'asr', 'maghrib', 'isha'] as $p) {
            $this->postJson('/api/prayer-logs', ['date' => $d, 'prayer' => $p, 'status' => 'on_time']);
        }
        $salah = $this->user->habits()->where('system_key', 'salah')->first();
        $this->assertTrue($salah->logs()->whereDate('date', $d)->exists(), 'auto habit synced from prayer logs');

        $this->getJson("/api/reports/salah?period=week&date=$d")->assertOk()->assertJsonPath('totals.on_time', 4)->assertJsonPath('totals.delayed', 1);
    }

    public function test_quran_adhkar_and_learning(): void
    {
        $d = $this->today();
        $id = $this->postJson('/api/quran-logs', ['date' => $d, 'pages_read' => 5, 'surah_number' => 18, 'ayah_from' => 1, 'ayah_to' => 10])->assertCreated()->json('data.id');
        $this->putJson("/api/quran-logs/$id", ['pages_read' => 6])->assertOk()->assertJsonPath('data.pages_read', 6);
        $this->postJson('/api/quran-logs', ['date' => $d, 'pages_read' => 2, 'ayah_from' => 10, 'ayah_to' => 3])->assertStatus(422);
        $this->getJson('/api/quran-logs/stats')->assertOk()->assertJsonPath('today_pages', 6)->assertJsonPath('streak', 1);
        $this->getJson('/api/quran-logs?q=nothing-matches')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/adhkar-logs', ['date' => $d, 'type' => 'morning', 'name' => 'Morning Adhkar', 'count' => 1, 'target' => 1])->assertOk()->assertJsonPath('data.completed', true);
        $this->postJson('/api/adhkar-logs', ['date' => $d, 'type' => 'custom', 'name' => 'SubhanAllah', 'count' => 10, 'target' => 33])->assertOk()->assertJsonPath('data.completed', false);
        $this->getJson("/api/adhkar-logs?date=$d")->assertOk()->assertJsonCount(2, 'data');

        $this->postJson('/api/islamic-learning', ['date' => $d, 'type' => 'lecture', 'title' => 'Tafsir', 'minutes' => 45])->assertCreated();
        $this->getJson('/api/islamic-learning/weekly')->assertOk()->assertJsonPath('minutes', 45);
        $this->getJson('/api/quran-logs/'.$id)->assertOk();
        $this->deleteJson('/api/quran-logs/'.$id)->assertOk();
    }
}
