<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $roles): Response
    {
        Log::info('RoleMiddleware executed', [
            'required_roles' => $roles,
            'url' => $request->url(),
            'method' => $request->method()
        ]);

        // Check if user is authenticated
        if (!Auth::check()) {
            Log::warning('Unauthenticated access attempt', [
                'url' => $request->url(),
                'ip' => $request->ip()
            ]);
            
            return response()->json([
                'message' => 'Unauthenticated. Please log in.',
                'error_code' => 'AUTH_REQUIRED'
            ], 401);
        }

        $user = Auth::user();
        
        Log::info('User role check', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_status' => $user->status,
            'required_roles' => $roles
        ]);

        // Check if user account is active
        if (!$user->isActive()) {
            Log::warning('Inactive user access attempt', [
                'user_id' => $user->id,
                'user_status' => $user->status
            ]);
            
            return response()->json([
                'message' => 'Account is not active. Please contact administrator.',
                'error_code' => 'ACCOUNT_INACTIVE',
                'status' => $user->status
            ], 403);
        }

        // Check if user email is verified
        if (!$user->isVerified()) {
            Log::warning('Unverified user access attempt', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
            
            return response()->json([
                'message' => 'Email verification required. Please verify your email.',
                'error_code' => 'EMAIL_VERIFICATION_REQUIRED'
            ], 403);
        }

        // Parse allowed roles
        $allowedRoles = array_map('trim', explode(',', $roles));

        // Check if user has required role
        if (!$user->hasAnyRole($allowedRoles)) {
            Log::warning('Insufficient permissions', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'required_roles' => $allowedRoles,
                'url' => $request->url()
            ]);
            
            return response()->json([
                'message' => 'Access denied. Insufficient permissions.',
                'error_code' => 'INSUFFICIENT_PERMISSIONS',
                'user_role' => $user->role,
                'required_roles' => $allowedRoles
            ], 403);
        }

        Log::info('Access granted', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'url' => $request->url()
        ]);

        return $next($request);
    }
}