<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle Google OAuth callback
     */
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
            
            // Check if user exists
            $user = User::where('email', $googleUser->getEmail())->first();
            
            if ($user) {
                // Update Google ID if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                    ]);
                }
            } else {
                // Create new user - determine role from email domain
                $role = $this->determineRoleFromEmail($googleUser->getEmail());
                
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'password' => Hash::make(Str::random(32)), // Random password
                    'role' => $role,
                    'email_verified_at' => now(),
                    'status' => 'active',
                    'avatar_url' => $googleUser->getAvatar(),
                ]);
            }
            
            // Log the user in
            Auth::login($user);
            $token = $user->createToken('google-auth-token')->plainTextToken;
            
            // Redirect to frontend with token
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            return redirect()->away("{$frontendUrl}/auth/google/callback?token={$token}");
            
        } catch (\Exception $e) {
            \Log::error('Google OAuth Error: ' . $e->getMessage());
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            return redirect()->away("{$frontendUrl}/?error=google_auth_failed");
        }
    }

    /**
     * Handle Google OAuth token from frontend (for popup flow)
     * This method verifies the token directly with Google's API without requiring google/apiclient
     */
    public function handleGoogleToken(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required|string',
            ]);

            // Verify token with Google's API directly (no library needed)
            $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $request->token
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Invalid Google token'
                ], 401);
            }

            $payload = $response->json();

            // Verify the token is for our app
            if (!isset($payload['sub']) || $payload['aud'] !== config('services.google.client_id')) {
                return response()->json([
                    'message' => 'Token is not for this application'
                ], 401);
            }

            // Get user information from payload
            $googleId = $payload['sub'];
            $email = $payload['email'];
            $name = $payload['name'] ?? $email;
            $emailVerified = $payload['email_verified'] ?? false;
            $picture = $payload['picture'] ?? null;

            // Check if user exists by Google ID
            $user = User::where('google_id', $googleId)->first();
            
            if (!$user) {
                // Check if user exists by email
                $user = User::where('email', $email)->first();
                
                if ($user) {
                    // Link Google account to existing user
                    $user->update([
                        'google_id' => $googleId,
                        'avatar_url' => $picture,
                    ]);
                } else {
                    // Create new user
                    $role = $this->determineRoleFromEmail($email);
                    
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'google_id' => $googleId,
                        'password' => Hash::make(Str::random(32)),
                        'role' => $role,
                        'email_verified_at' => $emailVerified ? now() : null,
                        'status' => 'active',
                        'avatar_url' => $picture,
                    ]);
                }
            }

            // Generate token
            Auth::login($user);
            $token = $user->createToken('google-auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'user' => $user->getFormattedUserData(),
                'role' => $user->role,
                'token' => $token,
                'permissions' => $this->getUserPermissions($user),
            ]);

        } catch (\Exception $e) {
            \Log::error('Google Token Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Google authentication failed',
                'error' => config('app.debug') ? $e->getMessage() : 'Authentication error'
            ], 500);
        }
    }

    /**
     * Determine user role from email domain
     */
    private function determineRoleFromEmail(string $email): string
    {
        $domain = substr(strrchr($email, "@"), 1);
        $allowedDomains = ['university.edu', 'uni.edu', 'final.edu.tr', 'student.edu'];
        
        // Default to student if university email, otherwise require manual verification
        if (in_array($domain, $allowedDomains)) {
            return 'student';
        }
        
        return 'student'; // Default role
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
        ];

        return $permissions[$user->role] ?? [];
    }
}