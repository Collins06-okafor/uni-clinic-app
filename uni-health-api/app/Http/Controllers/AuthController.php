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
                    'student_id' => 'required|string|unique:users,student_id|max:20',
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
            'password' => ['Incorrect password.'],
        ]);
    }

    Auth::login($user);
    $token = $user->createToken('api-token')->plainTextToken;

    return response()->json([
        'message' => 'Login successful',
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
 * Update user profile
 */
public function updateProfile(Request $request)
{
    try {
        $user = $request->user();
        
        $userRules = [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ];
        
        $profileRules = [
            'phone_number' => 'sometimes|nullable|string|max:20',
            'date_of_birth' => 'sometimes|nullable|date|before:today',
            'emergency_contact_name' => 'sometimes|nullable|string|max:255',
            'emergency_contact_phone' => 'sometimes|nullable|string|max:20',
            'allergies' => 'sometimes|nullable|string',
            'has_known_allergies' => 'sometimes|boolean',
            'allergies_uncertain' => 'sometimes|boolean',
            'addictions' => 'sometimes|nullable|string',
            'medical_history' => 'sometimes|nullable|string',
            'profile_image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // ✅ Changed to handle file uploads
        ];
        
        // Add role-specific rules
        switch ($user->role) {
            case 'student':
                $userRules['department'] = 'sometimes|string|max:100';
                break;
            case 'doctor':
                $userRules['specialization'] = 'sometimes|string|max:100';
                break;
            case 'clinical_staff':
            case 'academic_staff':
                $userRules['department'] = 'sometimes|string|max:100';
                break;
        }
        
        // Validate user data
        $userValidated = $request->validate($userRules);
        
        // Validate profile data
        $profileValidated = $request->validate($profileRules);
        
        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $image = $request->file('profile_image');
            $imageName = time() . '_' . $user->id . '.' . $image->getClientOriginalExtension();
            
            // Store in public/storage/profile_images directory
            $imagePath = $image->storeAs('profile_images', $imageName, 'public');
            
            // Delete old image if exists
            if ($user->profile && $user->profile->profile_image) {
                \Storage::disk('public')->delete($user->profile->profile_image);
            }
            
            $profileValidated['profile_image'] = $imagePath;
        }
        
        // Update user
        $user->update($userValidated);
        
        // Update or create profile
        if ($user->profile) {
            $user->profile->update($profileValidated);
        } else {
            $user->profile()->create($profileValidated);
        }
        
        // Load fresh data with profile
        $user->load('profile');
        
        // Add full image URL for frontend
        if ($user->profile && $user->profile->profile_image) {
            $user->profile->profile_image_url = asset('storage/' . $user->profile->profile_image);
        }
        
        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->makeHidden(['password']),
            'profile' => $user->profile
        ]);
        
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $e->errors()
        ], 422);
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