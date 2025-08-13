<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        //
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Define gates for role-based access
        Gate::define('access-student-dashboard', function ($user) {
            \Log::info('Checking student access', ['user_role' => $user->role]);
            return $user->role === 'student';
        });

        Gate::define('access-doctor-dashboard', function ($user) {
            \Log::info('Checking doctor access', ['user_role' => $user->role, 'required' => 'doctor']);
            return $user->role === 'doctor';
        });

        Gate::define('access-academic-dashboard', function ($user) {
            \Log::info('Checking academic access', ['user_role' => $user->role]);
            return $user->role === 'academic_staff';
        });

        Gate::define('access-clinical-dashboard', function ($user) {
            \Log::info('Checking clinical access', ['user_role' => $user->role]);
            return $user->role === 'clinical_staff';
        });

        // Optional: Add admin gate that can access everything
        Gate::define('access-admin-dashboard', function ($user) {
            return $user->role === 'admin';
        });

        // Optional: Create a general gate for any dashboard access
        Gate::define('access-any-dashboard', function ($user) {
            return in_array($user->role, ['student', 'doctor', 'academic_staff', 'clinical_staff', 'admin']);
        });
    }
}