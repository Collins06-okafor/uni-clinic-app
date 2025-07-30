<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Register a new user with role-specific validation
     */
    public function register(Request $request)
    {
        $role = $request->input('role', 'student');
        
        // Base validation rules
        $rules = [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'unique:users,email',
                function ($attribute, $value, $fail) use ($role) {
                    // University domain validation for students and academic staff
                    if (in_array($role, ['student', 'academic_staff'])) {
                        $allowedDomains = ['university.edu', 'uni.edu', 'student.edu']; // Configure your domains
                        $domain = substr(strrchr($value, "@"), 1);
                        if (!in_array($domain, $allowedDomains)) {
                            $fail('Email must be from university domain for ' . $role . ' role.');
                        }
                    }
                }
            ],
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:student,doctor,clinical_staff,academic_staff,admin',
            'phone' => 'nullable|string|max:20',
        ];

        // Role-specific validation rules
        switch ($role) {
            case 'student':
                $rules = array_merge($rules, [
                    'university_id' => 'required|string|unique:users,university_id|max:20',
                    'department' => 'required|string|max:100',
                ]);
                break;

            case 'doctor':
                $rules = array_merge($rules, [
                    'medical_license_number' => 'required|string|unique:users,medical_license_number|max:50',
                    'specialization' => 'required|string|max:100',
                    'employee_id' => 'nullable|string|unique:users,employee_id|max:20',
                ]);
                break;

            case 'clinical_staff':
                $rules = array_merge($rules, [
                    'employee_id' => 'required|string|unique:users,employee_id|max:20',
                    'department' => 'required|string|max:100',
                ]);
                break;

            case 'academic_staff':
                $rules = array_merge($rules, [
                    'employee_id' => 'required|string|unique:users,employee_id|max:20',
                    'faculty' => 'required|string|max:100',
                    'department' => 'nullable|string|max:100',
                ]);
                break;

            case 'admin':
                $rules = array_merge($rules, [
                    'employee_id' => 'required|string|unique:users,employee_id|max:20',
                ]);
                break;
        }

        $validated = $request->validate($rules);

        // Create user with role-specific data
        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'status' => 'pending_verification',
        ];

        // Add role-specific fields
        $roleFields = [
            'university_id', 'department', 'medical_license_number', 
            'specialization', 'employee_id', 'faculty'
        ];

        foreach ($roleFields as $field) {
            if (isset($validated[$field])) {
                $userData[$field] = $validated[$field];
            }
        }

        $user = User::create($userData);

        // Send verification email
        $this->sendVerificationEmail($user);

        return response()->json([
            'message' => 'Registration successful. Please verify your email.',
            'user' => $user->makeHidden(['password']),
        ], 201);
    }

    /**
     * Login user with multiple authentication methods
     */
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string', // Can be email, university_id, employee_id, or medical_license_number
            'password' => 'required|string',
        ]);

        $loginField = $this->getLoginField($request->login);
        $credentials = [$loginField => $request->login, 'password' => $request->password];

        // Check if user exists and is verified
        $user = User::where($loginField, $request->login)->first();
        
        if (!$user) {
            throw ValidationException::withMessages([
                'login' => ['User not found with provided credentials.'],
            ]);
        }

        {/*->status !== 'active') {
            throw ValidationException::withMessages([
                'login' => ['Account is not active. Please verify your email or contact admin.'],
            ]);
        }*/}

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Login successful
        Auth::login($user);
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user->makeHidden(['password']),
            'token' => $token,
            'permissions' => $this->getUserPermissions($user),
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful'
        ]);
    }

    /**
     * Verify email
     */
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Here you would verify the token (implement your token verification logic)
        // For now, we'll just activate the user
        $user->update([
            'email_verified_at' => now(),
            'status' => 'active',
        ]);

        return response()->json(['message' => 'Email verified successfully']);
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Password reset link sent to your email']);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => bcrypt($password)
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully']);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Get current user profile
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user->makeHidden(['password']),
            'permissions' => $this->getUserPermissions($user),
        ]);
    }

    /**
     * Determine login field based on input format
     */
    private function getLoginField($login)
    {
        if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
            return 'email';
        } elseif (preg_match('/^[A-Z0-9]{6,20}$/', $login)) {
            // University ID format (adjust regex as needed)
            return 'university_id';
        } elseif (preg_match('/^EMP[0-9]{4,10}$/', $login)) {
            // Employee ID format (adjust regex as needed)
            return 'employee_id';
        } elseif (preg_match('/^ML[0-9]{6,12}$/', $login)) {
            // Medical License format (adjust regex as needed)
            return 'medical_license_number';
        }
        
        // Default to email
        return 'email';
    }

    /**
     * Get user permissions based on role
     */
    private function getUserPermissions($user)
    {
        $permissions = [
            'student' => [
                'view_own_profile',
                'update_own_profile',
                'view_courses',
                'submit_assignments',
                'view_grades',
            ],
            'doctor' => [
                'view_own_profile',
                'update_own_profile',
                'view_patients',
                'manage_patients',
                'view_medical_records',
                'create_medical_records',
                'prescribe_medication',
            ],
            'clinical_staff' => [
                'view_own_profile',
                'update_own_profile',
                'view_patients',
                'update_patient_info',
                'schedule_appointments',
                'view_medical_records',
            ],
            'academic_staff' => [
                'view_own_profile',
                'update_own_profile',
                'manage_courses',
                'view_students',
                'grade_assignments',
                'create_announcements',
            ],
            'admin' => [
                'full_access',
                'manage_users',
                'manage_roles',
                'view_system_logs',
                'manage_settings',
            ],
        ];

        $rolePermissions = $permissions[$user->role] ?? [];
        
        // Merge with custom permissions if any
        if ($user->permissions) {
            $customPermissions = json_decode($user->permissions, true) ?? [];
            $rolePermissions = array_merge($rolePermissions, $customPermissions);
        }

        return array_unique($rolePermissions);
    }

    /**
     * Send verification email
     */
    private function sendVerificationEmail($user)
    {
        // Implement email verification logic here
        // You can use Laravel's built-in email verification or create custom logic
        
        // Example: Generate verification token and send email
        // Mail::to($user->email)->send(new VerificationEmail($user, $token));
    }
}