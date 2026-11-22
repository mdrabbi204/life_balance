<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DefaultDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        app(DefaultDataService::class)->seedFor($this->user);
        $this->actingAs($this->user, 'sanctum');
    }

    protected function today(): string
    {
        return now('Asia/Dhaka')->toDateString();
    }
}
