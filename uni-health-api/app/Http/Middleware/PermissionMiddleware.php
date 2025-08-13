<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $permissions): Response
    {
        Log::info('PermissionMiddleware executed', [
            'required_permissions' => $permissions,
            'url' => $request->url()
        ]);

        // Check if user is authenticated
        if (!Auth::check()) {
            return response()->json([
                'message' => 'Unauthenticated. Please log in.',
                'error_code' => 'AUTH_REQUIRED'
            ], 401);
        }

        $user = Auth::user();

        // Check if user account is active
        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Account is not active.',
                'error_code' => 'ACCOUNT_INACTIVE'
            ], 403);
        }

        // Parse required permissions
        $requiredPermissions = array_map('trim', explode(',', $permissions));

        // Check if user has all required permissions
        foreach ($requiredPermissions as $permission) {
            if (!$user->hasPermission($permission)) {
                Log::warning('Permission denied', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'required_permission' => $permission,
                    'user_permissions' => $user->getAllPermissions()
                ]);

                return response()->json([
                    'message' => 'Access denied. Missing required permission.',
                    'error_code' => 'MISSING_PERMISSION',
                    'required_permission' => $permission,
                    'user_permissions' => $user->getAllPermissions()
                ], 403);
            }
        }

        Log::info('Permission granted', [
            'user_id' => $user->id,
            'permissions_checked' => $requiredPermissions
        ]);

        return $next($request);
    }
}

/*
Register this middleware in app/Http/Kernel.php:

protected $middlewareAliases = [
    // ... other middleware
    'role' => \App\Http\Middleware\RoleMiddleware::class,
    'permission' => \App\Http\Middleware\PermissionMiddleware::class,
];

Usage examples:

// Check for specific permission
Route::get('/sensitive-data', function () {
    return response()->json(['data' => 'sensitive']);
})->middleware('permission:view_sensitive_data');

// Check for multiple permissions (user must have ALL)
Route::post('/prescribe', function () {
    return response()->json(['message' => 'Prescription created']);
})->middleware('permission:prescribe_medication,view_medical_records');

// Combine with role middleware
Route::get('/doctor-only-with-permission', function () {
    return response()->json(['message' => 'Success']);
})->middleware(['role:doctor', 'permission:prescribe_medication']);
*/