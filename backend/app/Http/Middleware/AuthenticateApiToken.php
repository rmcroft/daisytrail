<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();
        $user = $plainToken ? User::where('api_token', hash('sha256', $plainToken))->first() : null;

        if (! $user || $user->status !== 'active') {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        auth()->setUser($user);

        return $next($request);
    }
}
