<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppState;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', Str::lower($credentials['email']))->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Email or password did not match.'], 422);
        }
        if ($user->status !== 'active') {
            $message = $user->status === 'pending'
                ? 'Your account is pending troop leader approval.'
                : 'This account is disabled. Contact a troop leader for access.';

            return response()->json(['message' => $message], 403);
        }

        $plainToken = Str::random(80);
        $user->update(['api_token' => hash('sha256', $plainToken)]);
        $state = AppState::where('key', 'main')->first();

        return response()->json([
            'token' => $plainToken,
            'accountId' => $user->account_uuid,
            'state' => $state?->payload,
            'revision' => $state?->revision ?? 0,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'troopId' => ['required', 'string', 'max:100'],
        ]);
        $accountId = (string) Str::uuid();
        $email = Str::lower($data['email']);

        User::create([
            'account_uuid' => $accountId,
            'name' => trim($data['name']),
            'email' => $email,
            'password' => $data['password'],
            'role' => 'parent',
            'status' => 'pending',
            'troop_ids' => [$data['troopId']],
            'girl_ids' => [],
        ]);

        $state = AppState::where('key', 'main')->first();
        if ($state) {
            $payload = $state->payload;
            $payload['accounts'][] = [
                'id' => $accountId, 'name' => trim($data['name']), 'email' => $email,
                'passwordHash' => '', 'role' => 'parent', 'status' => 'pending',
                'troopIds' => [$data['troopId']], 'girlIds' => [],
            ];
            $state->update(['payload' => $payload, 'revision' => $state->revision + 1]);
        }

        return response()->json(['message' => 'Account requested. A troop leader must approve it before sign in.'], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->update(['api_token' => null]);

        return response()->json(['message' => 'Signed out.']);
    }
}
