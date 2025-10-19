<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use App\Mail\PatientRegistrationConfirmation;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Validator; 

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
        'password' => [
            'required',
            'string',
            'min:8',
            'confirmed',
            'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/' // At least one lowercase, uppercase, and number
        ],
        'role' => 'required|in:student,academic_staff',
        'phone_number' => [
            'nullable',
            'string',
            'max:15',
            'regex:/^\+[1-9]\d{1,14}$/', // E.164 format validation
        ],
    ];

    // Role-specific validation rules
    switch ($role) {
        case 'student':
            $rules = array_merge($rules, [
                'student_id' => [
                    'required',
                    'string',
                    'unique:users,student_id',
                    'max:20',
                    'regex:/^\d+$/' // Only numbers allowed
                ],
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
            
        // Remove doctor, clinical_staff, and admin cases completely
        default:
            // Reject any other roles
            throw ValidationException::withMessages([
                'role' => ['Selected role is not allowed for registration.'],
            ]);
    }

    // Validate the request with the complete rules
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
        'phone_number' => $validated['phone_number'] ?? null,
        'preferred_language' => $request->header('X-Locale', 'en'),
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

    // Add these lines to auto-login after registration
    Auth::login($user);
    $token = $user->createToken('api-token')->plainTextToken;

    try {
            $locale = $request->header('X-Locale', 'en');
            $notificationService = new NotificationService();
            
            // Send registration confirmation
            $notificationService->sendRegistrationConfirmation($user, $locale);
            
            // Notify clinical staff
            $notificationService->notifyClinicalStaffNewPatient($user, $locale);
            
        } catch (\Exception $e) {
            \Log::error('Registration notifications failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
        }

    return response()->json([
        'message' => __('messages.registration_successful'), // ✅ Localized
        'user' => $user->getFormattedUserData(),
        'token' => $token, // Add this line
        'role' => $user->role, // Add this line
        'permissions' => $this->getUserPermissions($user), // Add this line
    ], 201);
}

 /**
     * ✅ ADD THIS HELPER METHOD
     * Notify clinical staff of new patient registration
     */
    private function notifyClinicalStaff($newPatient, $locale)
    {
        $clinicalStaff = User::where('role', 'clinical_staff')
            ->where('status', 'active')
            ->get();

        foreach ($clinicalStaff as $staff) {
            try {
                // You can create ClinicalStaffNewPatientNotification later
                // Mail::to($staff->email)->send(new ClinicalStaffNewPatientNotification($newPatient, $locale));
            } catch (\Exception $e) {
                \Log::error('Clinical staff notification failed: ' . $e->getMessage());
            }
        }
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
            'email' => [__('messages.user_not_found')], // ✅ Localized
        ]);
    }

    if ($user->status !== 'active') {
        throw ValidationException::withMessages([
            'email' => [__('auth.account_not_active')], // ✅ Localized
        ]);
    }

    if (!Hash::check($request->password, $user->password)) {
        throw ValidationException::withMessages([
            'password' => ['Incorrect password.'],
        ]);
    }

    Auth::login($user);
    $token = $user->createToken('api-token')->plainTextToken;

    return response()->json([
        'message' => __('messages.login_successful'), // ✅ Localized
        'user' => $user->getFormattedUserData(),
        'role' => $user->role, // ✅ This works without Spatie
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
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|exists:users,email'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 400);
            }

            $status = Password::sendResetLink(
                $request->only('email')
            );

            if ($status === Password::RESET_LINK_SENT) {
                return response()->json([
                    'message' => 'Password reset link sent to your email'
                ], 200);
            }

            return response()->json([
                'message' => 'Unable to send reset link. Please try again.'
            ], 400);
        }
    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password reset successfully'
            ], 200);
        }

        return response()->json([
            'message' => 'Failed to reset password. The token may be invalid or expired.',
            'status' => $status
        ], 400);
    }

/**
 * Get current user profile
 */
public function profile(Request $request)
{
    $user = $request->user();
    
    return response()->json([
        'student_id' => $user->student_id,
        'name' => $user->name,
        'email' => $user->email,
        'department' => $user->department,
        'avatar_url' => $user->avatar_url,
        'allergies' => $user->allergies ?? '',
        'has_known_allergies' => $user->has_known_allergies ?? false,
        'allergies_uncertain' => $user->allergies_uncertain ?? false,
        'addictions' => $user->addictions ?? '',
        'phone_number' => $user->phone,
        'date_of_birth' => $user->date_of_birth,
        'emergency_contact_name' => $user->emergency_contact_name,
        'emergency_contact_phone' => $user->emergency_contact_phone,
        'medical_history' => $user->medical_history ?? ''
    ]);
}

/**
 * Update user profile
 */
public function updateProfile(Request $request)
{
    try {
        $user = $request->user();
        
        $validated = $request->validate([
            'student_id' => 'sometimes|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'department' => 'required|string|max:255',
            'avatar_url' => 'nullable|string',
            'allergies' => 'nullable|string',
            'has_known_allergies' => 'boolean',
            'allergies_uncertain' => 'boolean',
            'addictions' => 'nullable|string',
            'phone_number' => 'required|string|max:255',
            'date_of_birth' => 'required|date|before:today',
            'emergency_contact_name' => 'required|string|max:255',
            'emergency_contact_phone' => 'required|string|max:255',
            'medical_history' => 'nullable|string'
        ]);

        // Update all fields in the users table
        $userFields = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'department' => $validated['department'],
            'avatar_url' => $validated['avatar_url'] ?? $user->avatar_url,
            'allergies' => $validated['allergies'] ?? '',
            'has_known_allergies' => $validated['has_known_allergies'] ?? false,
            'allergies_uncertain' => $validated['allergies_uncertain'] ?? false,
            'addictions' => $validated['addictions'] ?? '',
            'phone' => $validated['phone_number'], // Map to 'phone' column
            'date_of_birth' => $validated['date_of_birth'],
            'emergency_contact_name' => $validated['emergency_contact_name'],
            'emergency_contact_phone' => $validated['emergency_contact_phone'],
            'medical_history' => $validated['medical_history'] ?? ''
        ];

        if (isset($validated['student_id'])) {
            $userFields['student_id'] = $validated['student_id'];
        }

        $user->update($userFields);
        $user->refresh();
        
        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->makeHidden(['password'])
        ]);

    } catch (\Exception $e) {
        \Log::error('Profile update error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to update profile',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
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
            'academic_staff' => [
                'view_own_profile', 
                'update_own_profile', 
                'request_appointments', 
                'view_appointment_history', 
                'reschedule_appointments',
                'view_doctor_availability', 
                'view_medical_history', 
                'cancel_appointments'
            ],
            // Remove doctor, clinical_staff, and admin permissions
        ];

        return $permissions[$user->role] ?? [];
    }
}