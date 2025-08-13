<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

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
                    // Only allow university domains for students & academic staff
                    if (in_array($role, ['student', 'academic_staff'])) {
                        $allowedDomains = ['university.edu', 'uni.edu', 'final.edu.tr', 'student.edu'];
                        $domain = substr(strrchr($value, "@"), 1);
                        if (!in_array($domain, $allowedDomains)) {
                            $fail("Email must be from a university domain for {$role} role.");
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
                    'student_id' => 'required|string|unique:users,student_id|max:20',
                    'department' => 'required|string|max:100',
                ]);
                break;

            case 'doctor':
                $rules = array_merge($rules, [
                    'medical_license_number' => 'required|string|unique:users,medical_license_number|max:50',
                    'specialization' => 'required|string|max:100',
                    'staff_no' => 'nullable|string|unique:users,staff_no|max:20',
                ]);
                break;

            case 'clinical_staff':
                $rules = array_merge($rules, [
                    'staff_no' => 'required|string|unique:users,staff_no|max:20',
                    'department' => 'required|string|max:100',
                ]);
                break;

            case 'academic_staff':
                $rules = array_merge($rules, [
                    'staff_no' => 'required|string|unique:users,staff_no|max:20',
                    'faculty' => 'required|string|max:100',
                    'department' => 'nullable|string|max:100',
                ]);
                break;

            case 'admin':
                $rules = array_merge($rules, [
                    'staff_no' => 'required|string|unique:users,staff_no|max:20',
                ]);
                break;
        }

        $validated = $request->validate($rules);

        // Example: Department remapping
        if (isset($validated['department']) && strtolower($validated['department']) === 'computer engineering') {
            $validated['department'] = 'Computer Engineering';
        }

        // Create user
        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
            'email_verified_at' => now(),
        ];

        // Add role-specific fields
        $roleFields = [
            'student_id', 'department', 'medical_license_number',
            'specialization', 'staff_no', 'faculty'
        ];

        foreach ($roleFields as $field) {
            if (isset($validated[$field])) {
                $userData[$field] = $validated[$field];
            }
        }

        $user = User::create($userData);

        return response()->json([
            'message' => 'Registration successful. Account is now active.',
            'user' => $user->getFormattedUserData(),
        ], 201);
    }

    /**
     * Login (Email-only version)
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['No account found for this email.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Account is not active. Please verify your email or contact admin.'],
            ]);
        }

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password is incorrect.'],
            ]);
        }

        Auth::login($user);
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user->getFormattedUserData(),
            'token' => $token,
            'permissions' => $this->getUserPermissions($user),
        ]);
    }

    /**
     * Logout
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

        $status = Password::sendResetLink($request->only('email'));

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
            'user' => $user->getFormattedUserData(),
            'permissions' => $this->getUserPermissions($user),
        ]);
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
                'request_appointments',
                'view_appointment_history',
                'reschedule_appointments',
                'view_doctor_availability',
                'view_medical_history',
                'cancel_appointments',
                'update_emergency_contact'
            ],

            'doctor' => [
                'view_own_profile', 'update_own_profile', 'view_patients',
                'manage_patients', 'view_medical_records', 'create_medical_records', 'prescribe_medication'
            ],
            'clinical_staff' => [
                'view_own_profile', 'update_own_profile', 'view_patients',
                'update_patient_info', 'schedule_appointments', 'view_medical_records'
            ],
            'academic_staff' => [
                'view_own_profile', 'update_own_profile', 'manage_courses',
                'view_students', 'grade_assignments', 'create_announcements'
            ],
            'admin' => [
                'full_access', 'manage_users', 'manage_roles',
                'view_system_logs', 'manage_settings'
            ],
        ];

        return $permissions[$user->role] ?? [];
    }
}
