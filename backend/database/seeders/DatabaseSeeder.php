<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['account_uuid' => 'account-system-admin', 'name' => 'System Admin', 'email' => 'admin@example.com', 'password' => 'admin123', 'role' => 'system-admin', 'status' => 'active', 'troop_ids' => [], 'girl_ids' => []],
            ['account_uuid' => 'account-demo', 'name' => 'Troop Leader', 'email' => 'leader@example.com', 'password' => 'troop123', 'role' => 'troop-admin', 'status' => 'active', 'troop_ids' => ['troop-1001', 'troop-2045'], 'girl_ids' => []],
            ['account_uuid' => 'account-parent-alicia', 'name' => 'Alicia Johnson', 'email' => 'alicia@example.com', 'password' => 'parent123', 'role' => 'parent', 'status' => 'active', 'troop_ids' => ['troop-1001'], 'girl_ids' => ['girl-1']],
            ['account_uuid' => 'account-parent-nina', 'name' => 'Nina Patel', 'email' => 'nina@example.com', 'password' => 'parent123', 'role' => 'parent', 'status' => 'active', 'troop_ids' => ['troop-1001'], 'girl_ids' => ['girl-2']],
            ['account_uuid' => 'account-parent-elena', 'name' => 'Elena Martinez', 'email' => 'elena@example.com', 'password' => 'parent123', 'role' => 'parent', 'status' => 'active', 'troop_ids' => ['troop-1001'], 'girl_ids' => ['girl-3']],
            ['account_uuid' => 'account-parent-grace', 'name' => 'Grace Chen', 'email' => 'grace@example.com', 'password' => 'parent123', 'role' => 'parent', 'status' => 'active', 'troop_ids' => ['troop-1001'], 'girl_ids' => ['girl-4']],
            ['account_uuid' => 'account-pending-parent', 'name' => 'Pending Parent', 'email' => 'pending@example.com', 'password' => 'parent123', 'role' => 'parent', 'status' => 'pending', 'troop_ids' => ['troop-1001'], 'girl_ids' => []],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(['email' => $user['email']], $user);
        }
    }
}
