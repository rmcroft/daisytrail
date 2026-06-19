<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharedStateApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_share_state_and_stale_writes_are_rejected(): void
    {
        $this->seed(DatabaseSeeder::class);

        $admin = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'admin123',
        ])->assertOk()->json();

        $leader = $this->postJson('/api/auth/login', [
            'email' => 'leader@example.com',
            'password' => 'troop123',
        ])->assertOk()->json();

        $state = [
            'accounts' => [], 'troops' => [], 'emailReminderDrafts' => [],
            'currentAccountId' => null, 'currentTroopId' => null,
        ];

        $this->withToken($admin['token'])->putJson('/api/state', [
            'state' => $state,
            'revision' => 0,
        ])->assertOk()->assertJsonPath('revision', 1);

        $this->withToken($leader['token'])->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('revision', 1)
            ->assertJsonPath('state.troops', []);

        $this->withToken($leader['token'])->putJson('/api/state', [
            'state' => $state,
            'revision' => 0,
        ])->assertStatus(409)->assertJsonPath('revision', 1);
    }

    public function test_pending_users_cannot_sign_in(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->postJson('/api/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'parent123',
        ])->assertForbidden();
    }
}
