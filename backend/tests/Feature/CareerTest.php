<?php

namespace Tests\Feature;

use App\Models\User;

class CareerTest extends ApiTestCase
{
    public function test_topics_sessions_and_stats(): void
    {
        $topic = $this->user->learningTopics()->first();
        $this->putJson("/api/learning-topics/{$topic->id}", ['progress' => 40])->assertOk()->assertJsonPath('data.status', 'learning');
        $this->putJson("/api/learning-topics/{$topic->id}", ['status' => 'completed'])->assertOk()->assertJsonPath('data.progress', 100);
        $this->postJson('/api/learning-topics', ['name' => 'Kubernetes'])->assertCreated()->assertJsonPath('data.category', 'General');

        $this->postJson('/api/learning-sessions', ['date' => $this->today(), 'minutes' => 75, 'learning_topic_id' => $topic->id, 'challenges_solved' => 2])->assertCreated();
        $this->getJson('/api/learning-sessions/stats')->assertOk()->assertJsonPath('today_minutes', 75)->assertJsonPath('challenges_month', 2);

        $other = User::factory()->create();
        $foreign = $other->learningTopics()->create(['name' => 'Secret']);
        $this->postJson('/api/learning-sessions', ['date' => $this->today(), 'minutes' => 10, 'learning_topic_id' => $foreign->id])->assertStatus(422);
        $this->getJson("/api/learning-topics/{$foreign->id}")->assertNotFound();
    }

    public function test_projects_tasks_and_kanban_move(): void
    {
        $pid = $this->postJson('/api/projects', ['name' => 'API', 'technologies' => ['Laravel'], 'priority' => 'high'])->assertCreated()->json('data.id');
        $t1 = $this->postJson('/api/project-tasks', ['project_id' => $pid, 'title' => 'A'])->assertCreated()->json('data.id');
        $t2 = $this->postJson('/api/project-tasks', ['project_id' => $pid, 'title' => 'B'])->assertCreated()->json('data.id');
        $this->patchJson("/api/project-tasks/$t1/move", ['status' => 'done', 'position' => 0])->assertOk()->assertJsonPath('project.progress', 50);
        $this->patchJson("/api/project-tasks/$t2/move", ['status' => 'done', 'position' => 0])->assertOk()->assertJsonPath('project.status', 'completed');
        $this->getJson("/api/projects/$pid")->assertOk()->assertJsonCount(2, 'data.tasks');
        $this->getJson('/api/projects?status=completed')->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/project-tasks/$t2")->assertOk();
        $this->deleteJson("/api/projects/$pid")->assertOk();
    }
}
