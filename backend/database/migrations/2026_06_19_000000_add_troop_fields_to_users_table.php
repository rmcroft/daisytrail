<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_uuid')->unique()->after('id');
            $table->string('role')->default('parent');
            $table->string('status')->default('pending');
            $table->json('troop_ids')->nullable();
            $table->json('girl_ids')->nullable();
            $table->string('api_token', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['account_uuid', 'role', 'status', 'troop_ids', 'girl_ids', 'api_token']);
        });
    }
};
