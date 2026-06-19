<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppState;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StateController extends Controller
{
    public function show(): JsonResponse
    {
        $state = AppState::where('key', 'main')->first();

        return response()->json(['state' => $state?->payload, 'revision' => $state?->revision ?? 0]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate(['state' => ['required', 'array'], 'revision' => ['required', 'integer', 'min:0']]);

        return DB::transaction(function () use ($request, $data) {
            $state = AppState::where('key', 'main')->lockForUpdate()->first();
            $currentRevision = $state?->revision ?? 0;
            if ($currentRevision !== $data['revision']) {
                return response()->json([
                    'message' => 'The data changed on another device. Reload before saving again.',
                    'state' => $state?->payload,
                    'revision' => $currentRevision,
                ], 409);
            }

            $nextState = $state
                ? $this->mergeAuthorizedState($state->payload, $data['state'], $request->user())
                : $data['state'];
            $nextRevision = $currentRevision + 1;
            foreach ($nextState['accounts'] ?? [] as &$account) {
                $account['passwordHash'] = '';
            }
            unset($account);
            $state = AppState::updateOrCreate(
                ['key' => 'main'],
                ['payload' => $nextState, 'revision' => $nextRevision, 'updated_by' => $request->user()->id]
            );

            foreach ($nextState['accounts'] ?? [] as $account) {
                if (empty($account['id']) || empty($account['email'])) {
                    continue;
                }
                $user = User::where('account_uuid', $account['id'])->first();
                $attributes = [
                    'name' => $account['name'] ?? $account['email'],
                    'email' => strtolower($account['email']),
                    'role' => $account['role'] ?? 'parent',
                    'status' => $account['status'] ?? 'pending',
                    'troop_ids' => $account['troopIds'] ?? [],
                    'girl_ids' => $account['girlIds'] ?? [],
                ];
                if ($user) {
                    $user->update($attributes);
                } else {
                    User::create($attributes + ['account_uuid' => $account['id'], 'password' => 'parent123']);
                }
            }

            return response()->json(['state' => $state->payload, 'revision' => $nextRevision]);
        });
    }

    private function mergeAuthorizedState(array $current, array $incoming, User $user): array
    {
        if ($user->role === 'system-admin') {
            return $incoming;
        }

        $troopIds = $user->troop_ids ?? [];
        if ($user->role === 'troop-admin') {
            $current['troops'] = $this->mergeById(
                $current['troops'] ?? [],
                array_values(array_filter($incoming['troops'] ?? [], fn ($troop) => in_array($troop['id'] ?? null, $troopIds, true)))
            );
            $allowedAccounts = array_values(array_filter(
                $incoming['accounts'] ?? [],
                fn ($account) => ! empty(array_intersect($account['troopIds'] ?? [], $troopIds))
            ));
            $current['accounts'] = $this->mergeById($current['accounts'] ?? [], $allowedAccounts);
            $current['emailReminderDrafts'] = array_values(array_filter(
                array_merge(
                    array_filter($current['emailReminderDrafts'] ?? [], fn ($draft) => ! in_array($draft['troopId'] ?? null, $troopIds, true)),
                    array_filter($incoming['emailReminderDrafts'] ?? [], fn ($draft) => in_array($draft['troopId'] ?? null, $troopIds, true))
                )
            ));

            return $current;
        }

        $girlIds = $user->girl_ids ?? [];
        foreach ($current['troops'] ?? [] as &$troop) {
            if (! in_array($troop['id'] ?? null, $troopIds, true)) {
                continue;
            }
            $incomingTroop = collect($incoming['troops'] ?? [])->firstWhere('id', $troop['id']);
            if (! $incomingTroop) {
                continue;
            }

            foreach ($troop['data']['girls'] ?? [] as &$girl) {
                if (! in_array($girl['id'] ?? null, $girlIds, true)) {
                    continue;
                }
                $incomingGirl = collect($incomingTroop['data']['girls'] ?? [])->firstWhere('id', $girl['id']);
                if (! $incomingGirl) {
                    continue;
                }
                foreach (['firstName', 'lastName', 'schoolGrade', 'goalsForYear', 'notes', 'authorizedPickupNames'] as $field) {
                    if (array_key_exists($field, $incomingGirl)) {
                        $girl[$field] = $incomingGirl[$field];
                    }
                }
            }
            unset($girl);

            foreach ($troop['data']['events'] ?? [] as &$event) {
                $incomingEvent = collect($incomingTroop['data']['events'] ?? [])->firstWhere('id', $event['id']);
                if (! $incomingEvent) {
                    continue;
                }
                foreach ($girlIds as $girlId) {
                    if (isset($incomingEvent['rsvps'][$girlId])) {
                        $event['rsvps'][$girlId] = $incomingEvent['rsvps'][$girlId];
                    }
                }
            }
            unset($event);
        }
        unset($troop);

        return $current;
    }

    private function mergeById(array $current, array $updates): array
    {
        $updatesById = collect($updates)->keyBy('id');
        $merged = array_map(fn ($item) => $updatesById->get($item['id'], $item), $current);
        $knownIds = array_column($current, 'id');

        return array_values(array_merge($merged, array_filter($updates, fn ($item) => ! in_array($item['id'], $knownIds, true))));
    }
}
