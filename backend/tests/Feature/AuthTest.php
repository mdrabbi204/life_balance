<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_defaults_and_returns_token(): void
    {
        $res = $this->postJson('/api/auth/register', ['name' => 'Test', 'email' => 'T@Example.com', 'password' => 'secret123', 'password_confirmation' => 'secret123', 'timezone' => 'Asia/Dhaka'])
            ->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'profile']]);
        $user = User::where('email', 't@example.com')->firstOrFail();
        $this->assertSame(10, $user->habits()->count());
        $this->assertSame(17, $user->learningTopics()->count());
        $this->assertSame(9, $user->schedules()->count());
        $this->assertSame(4, $user->workouts()->where('is_template', true)->count());

        $this->withToken($res->json('token'))->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 't@example.com');
    }

    public function test_login_validation_and_failure(): void
    {
        $this->postJson('/api/auth/login', [])->assertStatus(422)->assertJsonValidationErrors(['email', 'password']);
        User::factory()->create(['email' => 'a@b.com', 'password' => 'right-password']);
        $this->postJson('/api/auth/login', ['email' => 'a@b.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/auth/login', ['email' => 'a@b.com', 'password' => 'right-password'])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_protected_routes_require_token(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }
}
