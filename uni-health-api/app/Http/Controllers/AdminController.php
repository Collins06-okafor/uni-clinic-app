<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class AdminController extends Controller
{
    /**
     * Admin dashboard with system overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Welcome to Admin Dashboard',
            'admin' => [
                'name' => $request->user()->name,
                'staff_no' => $request->user()->staff_no,
                'email' => $request->user()->email,
                'last_login' => now()->subHours(2)
            ],
            'system_overview' => [
                'total_users' => User::count(),
                'active_users' => User::where('status', 'active')->count(),
                'pending_verifications' => User::where('status', 'pending_verification')->count(),
                'inactive_users' => User::where('status', 'inactive')->count(),
                'new_registrations_today' => User::whereDate('created_at', today())->count(),
                'new_registrations_this_week' => User::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'new_registrations_this_month' => User::whereMonth('created_at', now()->month)->count()
            ],
            'user_breakdown' => [
                'students' => [
                    'total' => User::where('role', 'student')->count(),
                    'active' => User::where('role', 'student')->where('status', 'active')->count(),
                    'pending' => User::where('role', 'student')->where('status', 'pending_verification')->count(),
                    'inactive' => User::where('role', 'student')->where('status', 'inactive')->count()
                ],
                'doctors' => [
                    'total' => User::where('role', 'doctor')->count(),
                    'active' => User::where('role', 'doctor')->where('status', 'active')->count(),
                    'pending' => User::where('role', 'doctor')->where('status', 'pending_verification')->count(),
                    'inactive' => User::where('role', 'doctor')->where('status', 'inactive')->count()
                ]
            ]
        ]);
    }

    /**
     * Get all users with filtering and pagination
     */
    public function getUsers(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->role, fn($query, $role) => $query->where('role', $role))
            ->when($request->status, fn($query, $status) => $query->where('status', $status))
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage()
            ]
        ]);
    }
    /**
     * Get detailed user information
     */
    public function getUser(Request $request, $userId): JsonResponse
    {
        // In real implementation, fetch user with relationships
        $user = [
            'id' => $userId,
            'personal_info' => [
                'name' => 'John Doe',
                'email' => 'john.doe@university.edu',
                'phone' => '+1-555-0101',
                'role' => 'student',
                'status' => 'active'
            ],
            'role_specific_info' => [
                'student_id' => 'STU123456',
                'department' => 'computer engineering',
                'year' => 'Junior'
            ],
            'account_info' => [
                'email_verified_at' => '2024-01-16T10:00:00Z',
                'created_at' => '2024-01-15T10:00:00Z',
                'updated_at' => '2024-02-01T14:30:00Z',
                'last_login' => '2024-02-09T14:30:00Z',
                'login_count' => 145,
                'failed_login_attempts' => 0
            ],
            'permissions' => [
                'view_own_profile',
                'update_own_profile'
                
            ],
            'activity_log' => [
                [
                    'action' => 'Profile Updated',
                    'timestamp' => '2024-02-01T14:30:00Z',
                    'ip_address' => '192.168.1.100',
                    'user_agent' => 'Mozilla/5.0...'
                ],
                [
                    'action' => 'Login',
                    'timestamp' => '2024-02-09T14:30:00Z',
                    'ip_address' => '192.168.1.100',
                    'user_agent' => 'Mozilla/5.0...'
                ]
            ]
        ];

        return response()->json($user);
    }

    /**
     * Create a new user
     */
    public function createUser(Request $request): JsonResponse
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'password' => 'required|string|min:8|confirmed',
        'role' => 'required|in:student,doctor,clinical_staff,academic_staff,admin',
        'status' => 'sometimes|in:active,inactive,pending_verification',
        'student_id' => 'required_if:role,student|unique:users,student_id|max:20',
        'department' => 'required_if:role,student|string|max:100'
    ]);

    $userData = [
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => bcrypt($validated['password']),
        'role' => $validated['role'],
        'status' => $validated['status'] ?? 'active'
    ];

    // Add role-specific fields
    if ($validated['role'] === 'student') {
        $userData['student_id'] = $validated['student_id'];
        $userData['department'] = $validated['department'];
    }

    $user = User::create($userData);

    return response()->json([
        'message' => 'User created successfully',
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role,
        'status' => $user->status
    ], 201);
}

    /**
     * Update user status (activate, deactivate, etc.)
     */
    public function updateUserStatus(Request $request, $userId): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:active,inactive,pending_verification,suspended',
            'reason' => 'nullable|string|max:500',
            'notify_user' => 'boolean'
        ]);

        // In real implementation, update user in database
        // User::find($userId)->update(['status' => $validated['status']]);
        
        // Log the action
        $this->logAdminAction($request->user(), 'user_status_update', [
            'target_user_id' => $userId,
            'old_status' => 'active', // Get from database
            'new_status' => $validated['status'],
            'reason' => $validated['reason'] ?? null
        ]);

        return response()->json([
            'message' => 'User status updated successfully',
            'user_id' => $userId,
            'new_status' => $validated['status'],
            'updated_by' => $request->user()->name,
            'updated_at' => now(),
            'reason' => $validated['reason'] ?? null
        ]);
    }

    /**
     * Update user role
     */
    public function updateUserRole(Request $request, $userId): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:student,doctor,clinical_staff,academic_staff,admin',
            'reason' => 'required|string|max:500'
        ]);

        // In real implementation, update user role with proper validation
        
        $this->logAdminAction($request->user(), 'user_role_update', [
            'target_user_id' => $userId,
            'old_role' => 'student', // Get from database
            'new_role' => $validated['role'],
            'reason' => $validated['reason']
        ]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user_id' => $userId,
            'new_role' => $validated['role'],
            'updated_by' => $request->user()->name,
            'updated_at' => now(),
            'reason' => $validated['reason']
        ]);
    }

    /**
     * Delete user account
     */
    public function deleteUser(Request $request, $userId): JsonResponse
{
    $validated = $request->validate([
        'reason' => 'required|string|max:500',
        'confirm_deletion' => 'required|boolean|accepted'
    ]);

    try {
        // Find the user
        $user = User::findOrFail($userId);
        
        // Prevent admin from deleting themselves
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account',
                'error' => 'SELF_DELETION_NOT_ALLOWED'
            ], 403);
        }
        
        // Store user info before deletion for logging
        $userInfo = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role
        ];
        
        // Check if this is a soft delete or hard delete
        // You can implement soft delete by adding 'deleted_at' column to users table
        // and using SoftDeletes trait in User model
        
        // Option 1: Hard Delete (permanent removal)
        $user->forceDelete();
        
        // Option 2: Soft Delete (uncomment this and comment the line above)
        // $user->delete();
        
        // Log the action
        $this->logAdminAction($request->user(), 'user_deletion', [
            'target_user_id' => $userId,
            'target_user_info' => $userInfo,
            'reason' => $validated['reason'],
            'deletion_type' => 'hard_delete' // or 'soft_delete'
        ]);

        return response()->json([
            'message' => 'User account deleted successfully',
            'user_id' => $userId,
            'user_name' => $userInfo['name'],
            'user_email' => $userInfo['email'],
            'deleted_by' => $request->user()->name,
            'deleted_at' => now(),
            'reason' => $validated['reason']
        ]);
        
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        return response()->json([
            'message' => 'User not found',
            'error' => 'USER_NOT_FOUND'
        ], 404);
        
    } catch (\Exception $e) {
        // Log the error
        \Log::error('User deletion failed', [
            'user_id' => $userId,
            'admin_id' => $request->user()->id,
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'message' => 'Failed to delete user account',
            'error' => 'DELETION_FAILED'
        ], 500);
    }
}

public function getProfile()
    {
        $user = auth()->user();
        
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
            'department' => $user->department ?? '',
            'bio' => $user->bio ?? '',
            'avatar_url' => $user->avatar_url ? url($user->avatar_url) : null,
            'last_login' => $user->last_login,
            'created_at' => $user->created_at,
        ]);
    }

    // Update current user's profile
    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:100',
            'bio' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update([
            'name' => $request->name,
            'phone' => $request->phone,
            'department' => $request->department,
            'bio' => $request->bio,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()
        ]);
    }

    // Upload avatar
    public function uploadAvatar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // 2MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid file',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->user();

        // Delete old avatar if exists
        if ($user->avatar_url) {
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            Storage::disk('public')->delete($oldPath);
        }

        // Store new avatar
        $file = $request->file('avatar');
        $filename = 'avatars/' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $user->id . '_' . time() . '.' . $file->getClientOriginalExtension(), 'public');

        $avatarUrl = url('/storage/' . $path);

        $user->update(['avatar_url' => $avatarUrl]);

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $avatarUrl
        ]);
    }

    // Remove avatar
    public function removeAvatar()
    {
        $user = auth()->user();

        if ($user->avatar_url) {
            // Delete file from storage
            $path = str_replace('/storage/', '', $user->avatar_url);
            Storage::disk('public')->delete($path);

            // Remove from database
            $user->update(['avatar_url' => null]);
        }

        return response()->json([
            'message' => 'Avatar removed successfully'
        ]);
    }

    // Your existing dashboard method - update to use profile data
    



    /**
     * Get system statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month'); // week, month, quarter, year
        
        return response()->json([
            'period' => $period,
            'generated_at' => now(),
            'user_statistics' => [
                'total_users' => 1250,
                'growth_rate' => '+12.5%',
                'new_registrations' => [
                    'this_period' => 87,
                    'previous_period' => 76,
                    'growth' => '+14.5%'
                ],
                'by_role' => [
                    'students' => ['count' => 980, 'percentage' => 78.4],
                    'doctors' => ['count' => 45, 'percentage' => 3.6],
                    'clinical_staff' => ['count' => 78, 'percentage' => 6.2],
                    'academic_staff' => ['count' => 120, 'percentage' => 9.6],
                    'admins' => ['count' => 27, 'percentage' => 2.2]
                ],
                'by_status' => [
                    'active' => ['count' => 1180, 'percentage' => 94.4],
                    'inactive' => ['count' => 55, 'percentage' => 4.4],
                    'pending_verification' => ['count' => 15, 'percentage' => 1.2]
                ],
                'by_department' => [
                    'computer engineering' => 245,
                    'Engineering' => 198,
                    'Biology' => 167,
                    'Mathematics' => 143,
                    'Physics' => 134,
                    'Others' => 363
                ]
            ],
            'system_performance' => [
                'uptime' => '99.98%',
                'average_response_time' => '125ms',
                'total_requests' => 2456789,
                'error_rate' => '0.02%',
                'peak_concurrent_users' => 450,
                'database_queries_per_second' => 125.6,
                'cache_hit_rate' => '94.2%'
            ],
            'security_metrics' => [
                'failed_login_attempts' => 234,
                'blocked_ips' => 12,
                'password_resets' => 45,
                'suspicious_activities' => 3,
                'security_incidents' => 0,
                'last_security_scan' => now()->subHours(12)->format('Y-m-d H:i:s')
            ],
            'activity_summary' => [
                'total_logins' => 15678,
                'unique_daily_users' => 890,
                'average_session_duration' => '24 minutes',
                'most_active_hours' => ['09:00-10:00', '13:00-14:00', '19:00-20:00'],
                'feature_usage' => [
                    'appointments' => 1234,
                    'course_management' => 567,
                    'medical_records' => 890,
                    'assignments' => 2345
                ]
            ]
        ]);
    }

    /**
     * Get system logs
     */
    public function getSystemLogs(Request $request): JsonResponse
    {
        $level = $request->get('level', 'all'); // all, error, warning, info, debug
        $category = $request->get('category', 'all'); // all, auth, system, security, performance
        $perPage = $request->get('per_page', 50);
        $page = $request->get('page', 1);
        
        // In real implementation, fetch from log files or database
        $logs = [
            [
                'id' => 1,
                'timestamp' => '2024-02-09T14:35:22Z',
                'level' => 'info',
                'category' => 'auth',
                'message' => 'User login successful',
                'user_id' => 123,
                'ip_address' => '192.168.1.100',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'additional_data' => [
                    'login_method' => 'email',
                    'session_id' => 'sess_abc123'
                ]
            ],
            [
                'id' => 2,
                'timestamp' => '2024-02-09T14:30:15Z',
                'level' => 'warning',
                'category' => 'security',
                'message' => 'Multiple failed login attempts detected',
                'ip_address' => '10.0.0.50',
                'additional_data' => [
                    'attempt_count' => 5,
                    'email' => 'attacker@example.com',
                    'blocked' => true
                ]
            ],
            [
                'id' => 3,
                'timestamp' => '2024-02-09T14:25:08Z',
                'level' => 'error',
                'category' => 'system',
                'message' => 'Database connection timeout',
                'additional_data' => [
                    'database' => 'main',
                    'timeout_duration' => '30s',
                    'retry_successful' => true
                ]
            ],
            [
                'id' => 4,
                'timestamp' => '2024-02-09T14:20:33Z',
                'level' => 'info',
                'category' => 'system',
                'message' => 'Scheduled backup completed successfully',
                'additional_data' => [
                    'backup_size' => '2.3GB',
                    'duration' => '15 minutes',
                    'location' => 's3://backups/2024-02-09/'
                ]
            ]
        ];

        return response()->json([
            'logs' => $logs,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => 15678,
                'last_page' => 314
            ],
            'filters' => [
                'level' => $level,
                'category' => $category
            ],
            'summary' => [
                'total_logs' => 15678,
                'by_level' => [
                    'error' => 45,
                    'warning' => 123,
                    'info' => 14890,
                    'debug' => 620
                ],
                'by_category' => [
                    'auth' => 5678,
                    'system' => 4567,
                    'security' => 234,
                    'performance' => 1234,
                    'other' => 3965
                ]
            ]
        ]);
    }

    /**
     * Get system settings
     */
    public function getSettings(Request $request): JsonResponse
    {
        try {
            $settings = SystemSetting::getInstance();
            
            return response()->json($settings->getAllSettings());
        } catch (\Exception $e) {
            \Log::error('Failed to fetch settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to load system settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update system settings
     */
   /**
 * Update system settings
 */
public function updateSettings(Request $request): JsonResponse
{
    // Log incoming request
    \Log::info('Settings update attempt', [
        'user_id' => $request->user()->id ?? 'unknown',
        'data_keys' => array_keys($request->all()),
        'data' => $request->all()
    ]);
    
    try {
        $settings = SystemSetting::getInstance();
        $requestData = $request->all();
        
        // Check if data is empty
        if (empty($requestData)) {
            \Log::warning('Empty settings data received');
            return response()->json([
                'message' => 'No settings data provided',
                'error' => 'EMPTY_DATA'
            ], 422);
        }
        
        // Get valid sections
        $allowedSections = ['general', 'authentication', 'email', 'file_uploads', 'security', 'backup'];
        $sectionsToUpdate = array_intersect_key($requestData, array_flip($allowedSections));
        
        if (empty($sectionsToUpdate)) {
            \Log::warning('No valid sections found', [
                'received_keys' => array_keys($requestData),
                'allowed_sections' => $allowedSections
            ]);
            
            return response()->json([
                'message' => 'No valid settings sections provided',
                'error' => 'INVALID_SECTIONS',
                'received_keys' => array_keys($requestData),
                'allowed_sections' => $allowedSections
            ], 422);
        }
        
        // Validate and update each section
        foreach ($sectionsToUpdate as $section => $data) {
            if (!is_array($data)) {
                \Log::error("Invalid data type for section {$section}", [
                    'type' => gettype($data),
                    'value' => $data
                ]);
                
                return response()->json([
                    'message' => "Invalid data format for section: {$section}",
                    'error' => 'INVALID_DATA_FORMAT',
                    'expected' => 'array',
                    'received' => gettype($data)
                ], 422);
            }
            
            // Validate section data
            try {
                $this->validateSection($section, $data);
            } catch (\Illuminate\Validation\ValidationException $e) {
                \Log::error("Validation failed for section: {$section}", [
                    'errors' => $e->errors(),
                    'data' => $data
                ]);
                
                return response()->json([
                    'message' => "Validation failed for section: {$section}",
                    'errors' => $e->errors(),
                    'section' => $section
                ], 422);
            }
            
            // Merge with existing settings
            $currentSection = $settings->$section ?? [];
            $updatedSection = array_merge($currentSection, $data);
            $settings->$section = $updatedSection;
        }
        
        // Save to database
        $saved = $settings->save();
        
        if (!$saved) {
            \Log::error('Failed to save settings to database');
            return response()->json([
                'message' => 'Failed to save settings',
                'error' => 'SAVE_FAILED'
            ], 500);
        }
        
        // Clear cache
        Cache::forget('system_settings');
        
        // Log success
        $this->logAdminAction($request->user(), 'settings_update', [
            'sections_updated' => array_keys($sectionsToUpdate),
            'timestamp' => now()
        ]);
        
        \Log::info('Settings updated successfully', [
            'sections' => array_keys($sectionsToUpdate),
            'user_id' => $request->user()->id
        ]);
        
        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => $settings->getAllSettings(),
            'updated_by' => $request->user()->name,
            'updated_at' => now()
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Settings update failed with exception', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'user_id' => $request->user()->id ?? null
        ]);
        
        return response()->json([
            'message' => 'Failed to update system settings',
            'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            'debug' => config('app.debug') ? [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ] : null
        ], 500);
    }
}

/**
 * Validate a specific settings section
 */
private function validateSection(string $section, array $data): void
{
    $rules = [];
    
    switch ($section) {
        case 'general':
            $rules = [
                'site_name' => 'sometimes|string|max:255',
                'site_description' => 'sometimes|string|max:1000',
                'timezone' => 'sometimes|string|max:50',
                'default_language' => 'sometimes|string|in:en,tr,de,fr,es,it,pt,ru,ar,zh,ja,ko',
                'maintenance_mode' => 'sometimes|boolean',
                'registration_enabled' => 'sometimes|boolean',
                'email_verification_required' => 'sometimes|boolean',
            ];
            break;
            
        case 'authentication':
            $rules = [
                'password_min_length' => 'sometimes|integer|min:6|max:128',
                'password_require_uppercase' => 'sometimes|boolean',
                'password_require_lowercase' => 'sometimes|boolean',
                'password_require_numbers' => 'sometimes|boolean',
                'password_require_symbols' => 'sometimes|boolean',
                'session_timeout' => 'sometimes|integer|min:1|max:43200',
                'max_login_attempts' => 'sometimes|integer|min:1|max:50',
                'lockout_duration' => 'sometimes|integer|min:1|max:1440',
                'two_factor_enabled' => 'sometimes|boolean',
            ];
            break;
            
        case 'email':
            $rules = [
                'smtp_host' => 'sometimes|string|max:255',
                'smtp_port' => 'sometimes|integer|min:1|max:65535',
                'smtp_encryption' => 'sometimes|string|in:,tls,ssl',
                'from_address' => 'sometimes|nullable|email|max:255',
                'from_name' => 'sometimes|string|max:255',
                'smtp_username' => 'sometimes|nullable|string|max:255',
                'smtp_password' => 'sometimes|nullable|string|max:255',
            ];
            break;
            
        case 'file_uploads':
            $rules = [
                'max_file_size' => 'sometimes|integer|min:1|max:102400',
                'allowed_extensions' => 'sometimes|array',
                'allowed_extensions.*' => 'string|max:10',
                'upload_path' => 'sometimes|string|max:255',
                'antivirus_enabled' => 'sometimes|boolean',
            ];
            break;
            
        case 'security':
            $rules = [
                'force_https' => 'sometimes|boolean',
                'csrf_protection' => 'sometimes|boolean',
                'rate_limiting_enabled' => 'sometimes|boolean',
                'ip_whitelist_enabled' => 'sometimes|boolean',
                'audit_logging_enabled' => 'sometimes|boolean',
                'password_history_count' => 'sometimes|integer|min:0|max:24',
            ];
            break;
            
        case 'backup':
            $rules = [
                'automatic_backups' => 'sometimes|boolean',
                'backup_frequency' => 'sometimes|string|in:hourly,daily,weekly,monthly',
                'backup_retention_days' => 'sometimes|integer|min:1|max:365',
                'backup_location' => 'sometimes|nullable|string|max:500',
                'last_backup' => 'sometimes|nullable|date',
            ];
            break;
    }
    
    if (!empty($rules)) {
        \Log::debug("Validating section: {$section}", [
            'rules' => array_keys($rules),
            'data_keys' => array_keys($data)
        ]);
        
        Validator::make($data, $rules)->validate();
    }
}

    /**
     * Reset settings to default values
     */
    public function resetSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'section' => 'required|string|in:all,general,authentication,email,file_uploads,security,backup',
            'confirm_reset' => 'required|boolean|accepted'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $settings = SystemSetting::getInstance();
            $section = $request->section;
            
            $defaults = [
                'general' => [
                    'site_name' => 'University Health System',
                    'site_description' => 'Comprehensive university Health platform',
                    'timezone' => 'UTC+3',
                    'default_language' => 'en',
                    'maintenance_mode' => false,
                    'registration_enabled' => true,
                    'email_verification_required' => true
                ],
                'authentication' => [
                    'password_min_length' => 8,
                    'password_require_uppercase' => true,
                    'password_require_lowercase' => true,
                    'password_require_numbers' => true,
                    'password_require_symbols' => false,
                    'session_timeout' => 1440,
                    'max_login_attempts' => 5,
                    'lockout_duration' => 15,
                    'two_factor_enabled' => false
                ],
                'email' => [
                    'smtp_host' => '',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                    'from_address' => '',
                    'from_name' => ''
                ],
                'file_uploads' => [
                    'max_file_size' => 10240,
                    'allowed_extensions' => ['pdf', 'doc', 'docx', 'jpg', 'png'],
                    'upload_path' => '/uploads/',
                    'antivirus_enabled' => true
                ],
                'security' => [
                    'force_https' => true,
                    'csrf_protection' => true,
                    'rate_limiting_enabled' => true,
                    'ip_whitelist_enabled' => false,
                    'audit_logging_enabled' => true,
                    'password_history_count' => 5
                ],
                'backup' => [
                    'automatic_backups' => true,
                    'backup_frequency' => 'daily',
                    'backup_retention_days' => 30,
                    'backup_location' => '',
                    'last_backup' => null
                ]
            ];
            
            if ($section === 'all') {
                foreach ($defaults as $key => $value) {
                    $settings->$key = $value;
                }
            } else {
                $settings->$section = $defaults[$section];
            }
            
            $settings->save();
            
            // Clear cache
            Cache::forget('system_settings');
            
            // Log the action
            $this->logAdminAction($request->user(), 'settings_reset', [
                'section' => $section
            ]);
            
            return response()->json([
                'message' => 'Settings reset to defaults successfully',
                'section' => $section,
                'settings' => $settings->getAllSettings()
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to reset settings', [
                'error' => $e->getMessage(),
                'section' => $request->section
            ]);
            
            return response()->json([
                'message' => 'Failed to reset settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    

    /**
     * Get available roles and their permissions
     */
    public function getRoles(Request $request): JsonResponse
    {
        return response()->json([
            'roles' => [
                'student' => [
                    'name' => 'Student',
                    'description' => 'University students',
                    'permissions' => [
                        'view_own_profile',
                        'update_own_profile',
                        'schedule_appointments',
                        'view_medical_history'
                    ],
                    'user_count' => 980
                ],
                'doctor' => [
                    'name' => 'Doctor',
                    'description' => 'Medical doctors',
                    'permissions' => [
                        'view_own_profile',
                        'update_own_profile',
                        'view_patients',
                        'manage_patients',
                        'view_medical_records',
                        'create_medical_records',
                        'prescribe_medication',
                        'manage_appointments'
                    ],
                    'user_count' => 45
                ],
                'clinical_staff' => [
                    'name' => 'Clinical Staff',
                    'description' => 'Nurses and clinical support staff',
                    'permissions' => [
                        'view_own_profile',
                        'update_own_profile',
                        'view_patients',
                        'update_patient_info',
                        'schedule_appointments',
                        'view_medical_records',
                        'assist_procedures'
                    ],
                    'user_count' => 78
                ],
                'academic_staff' => [
                    'name' => 'Academic Staff',
                    'description' => 'Professors and academic personnel',
                    'permissions' => [
                        'view_own_profile',
                        'update_own_profile',
                        'schedule_appointments',
                        'view_medical_history'
                    ],
                    'user_count' => 120
                ],
                'admin' => [
                    'name' => 'Administrator',
                    'description' => 'System administrators',
                    'permissions' => [
                        'full_access',
                        'manage_users',
                        'manage_roles',
                        'view_system_logs',
                        'manage_settings',
                        'system_maintenance'
                    ],
                    'user_count' => 27
                ]
            ]
        ]);
    }

    /**
     * Assign custom permissions to a user
     */
    public function assignPermissions(Request $request, $userId): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|max:100',
            'reason' => 'required|string|max:500'
        ]);

        // In real implementation, update user permissions in database
        
        $this->logAdminAction($request->user(), 'permissions_assigned', [
            'target_user_id' => $userId,
            'permissions' => $validated['permissions'],
            'reason' => $validated['reason']
        ]);

        return response()->json([
            'message' => 'Permissions assigned successfully',
            'user_id' => $userId,
            'permissions' => $validated['permissions'],
            'assigned_by' => $request->user()->name,
            'assigned_at' => now(),
            'reason' => $validated['reason']
        ]);
    }

    /**
     * Generate system reports
     */
    public function generateReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => 'required|in:user_activity,security_audit,system_performance,usage_statistics',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'format' => 'sometimes|in:json,csv,pdf',
            'include_details' => 'sometimes|boolean'
        ]);

        // In real implementation, generate actual reports
        $reportId = 'RPT_' . now()->format('YmdHis') . '_' . rand(1000, 9999);
        
        return response()->json([
            'message' => 'Report generation initiated',
            'report_id' => $reportId,
            'report_type' => $validated['report_type'],
            'date_range' => [
                'from' => $validated['date_from'],
                'to' => $validated['date_to']
            ],
            'format' => $validated['format'] ?? 'json',
            'status' => 'processing',
            'estimated_completion' => now()->addMinutes(5),
            'download_url' => null // Will be populated when ready
        ], 202);
    }

    /**
     * Get report status and download link
     */
    public function getReportStatus(Request $request, $reportId): JsonResponse
    {
        // In real implementation, check report generation status
        return response()->json([
            'report_id' => $reportId,
            'status' => 'completed',
            'progress' => 100,
            'generated_at' => now()->subMinutes(2),
            'file_size' => '2.5 MB',
            'download_url' => "/api/admin/reports/{$reportId}/download",
            'expires_at' => now()->addDays(7)
        ]);
    }

    /**
     * Download generated report
     */
    public function downloadReport(Request $request, $reportId): JsonResponse
    {
        // In real implementation, return file download
        return response()->json([
            'message' => 'Report download initiated',
            'report_id' => $reportId,
            'download_started' => true
        ]);
    }

    /**
     * Perform system maintenance tasks
     */
    public function performMaintenance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task' => 'required|in:clear_cache,optimize_database,cleanup_logs,backup_system,update_indexes',
            'confirm' => 'required|boolean|accepted'
        ]);

        // In real implementation, perform actual maintenance tasks
        
        $this->logAdminAction($request->user(), 'maintenance_performed', [
            'task' => $validated['task'],
            'initiated_at' => now()
        ]);

        return response()->json([
            'message' => 'Maintenance task initiated successfully',
            'task' => $validated['task'],
            'initiated_by' => $request->user()->name,
            'initiated_at' => now(),
            'estimated_duration' => $this->getEstimatedDuration($validated['task']),
            'status' => 'running'
        ]);
    }

    /**
     * Get maintenance task status
     */
    public function getMaintenanceStatus(Request $request, $taskId): JsonResponse
    {
        // In real implementation, check actual task status
        return response()->json([
            'task_id' => $taskId,
            'status' => 'completed',
            'progress' => 100,
            'started_at' => now()->subMinutes(10),
            'completed_at' => now()->subMinutes(2),
            'duration' => '8 minutes',
            'result' => 'success',
            'details' => [
                'records_processed' => 15000,
                'space_freed' => '1.2 GB',
                'errors' => 0
            ]
        ]);
    }

    /**
     * Send bulk notifications to users
     */
    /**
 * Send bulk notifications to users
 * 
 * @param Request $request
 * @return JsonResponse
 * 
 * @throws ValidationException
 */
public function sendBulkNotification(Request $request): JsonResponse
{
    // Validate incoming request
    $validated = $request->validate([
        'recipient_type' => 'required|in:all,role,department,status',
        'recipient_filter' => 'required_unless:recipient_type,all|string',
        'notification_type' => 'required|in:email,sms,in_app,all',
        'subject' => 'required|string|max:255',
        'message' => 'required|string|max:2000',
        'priority' => 'required|in:low,normal,high,urgent',
        'schedule_for' => 'nullable|date|after_or_equal:now',
        'include_attachments' => 'sometimes|boolean'
    ]);

    try {
        // Generate unique notification ID
        $notificationId = 'NOTIF_' . now()->format('YmdHis') . '_' . rand(1000, 9999);
        
        // Log admin action
        $this->logAdminAction(
            $request->user(),
            'bulk_notification_sent',
            [
                'notification_id' => $notificationId,
                'recipient_type' => $validated['recipient_type'],
                'recipient_count' => $this->getEstimatedRecipients($validated)
            ]
        );

        // Prepare response
        $response = [
            'message' => 'Bulk notification queued successfully',
            'notification_id' => $notificationId,
            'metadata' => [
                'recipient_type' => $validated['recipient_type'],
                'notification_type' => $validated['notification_type'],
                'priority' => $validated['priority'],
                'estimated_recipients' => $this->getEstimatedRecipients($validated),
                'schedule_status' => isset($validated['schedule_for']) ? 'scheduled' : 'immediate',
                'scheduled_time' => $validated['schedule_for'] ?? null
            ],
            'system' => [
                'created_by' => $request->user()->name,
                'created_at' => now()->toISOString(),
                'status' => 'queued'
            ]
        ];

        return response()->json($response, 201);

    } catch (\Exception $e) {
        // Log detailed error
        \Log::error('Notification failed: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Notification processing failed',
            'details' => config('app.debug') ? $e->getMessage() : null
        ], 500);
    }
}

    /**
     * Get notification status
     */
    public function getNotificationStatus(Request $request, $notificationId): JsonResponse
    {
        // In real implementation, check notification delivery status
        return response()->json([
            'notification_id' => $notificationId,
            'status' => 'completed',
            'total_recipients' => 850,
            'delivered' => 847,
            'failed' => 3,
            'pending' => 0,
            'delivery_rate' => 99.6,
            'started_at' => now()->subMinutes(15),
            'completed_at' => now()->subMinutes(5),
            'failed_recipients' => [
                'user1@example.com - Invalid email address',
                'user2@example.com - Mailbox full',
                'user3@example.com - Delivery timeout'
            ]
        ]);
    }

    /**
     * Backup system data
     */
    public function createBackup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'backup_type' => 'required|in:full,incremental,database_only,files_only',
            'include_logs' => 'boolean',
            'include_uploads' => 'boolean',
            'compression' => 'required|in:none,gzip,zip',
            'encrypt' => 'boolean'
        ]);

        // In real implementation, initiate backup process
        $backupId = 'BACKUP_' . now()->format('YmdHis') . '_' . rand(1000, 9999);
        
        $this->logAdminAction($request->user(), 'backup_initiated', [
            'backup_id' => $backupId,
            'backup_type' => $validated['backup_type'],
            'compression' => $validated['compression'],
            'encrypted' => $validated['encrypt'] ?? false
        ]);

        return response()->json([
            'message' => 'Backup initiated successfully',
            'backup_id' => $backupId,
            'backup_type' => $validated['backup_type'],
            'compression' => $validated['compression'],
            'encrypted' => $validated['encrypt'] ?? false,
            'estimated_size' => $this->getEstimatedBackupSize($validated['backup_type']),
            'estimated_duration' => $this->getEstimatedBackupDuration($validated['backup_type']),
            'initiated_by' => $request->user()->name,
            'initiated_at' => now(),
            'status' => 'in_progress'
        ], 202);
    }

    /**
     * Get backup status
     */
    public function getBackupStatus(Request $request, $backupId): JsonResponse
    {
        // In real implementation, check actual backup status
        return response()->json([
            'backup_id' => $backupId,
            'status' => 'completed',
            'progress' => 100,
            'started_at' => now()->subMinutes(25),
            'completed_at' => now()->subMinutes(2),
            'duration' => '23 minutes',
            'file_size' => '2.8 GB',
            'compressed_size' => '1.1 GB',
            'compression_ratio' => '60.7%',
            'location' => 's3://university-backups/2024/02/BACKUP_20240210145823_7891.gz',
            'checksum' => 'sha256:a1b2c3d4e5f6...',
            'encrypted' => true
        ]);
    }

    /**
     * Get list of available backups
     */
    public function getBackups(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 20);
        
        // In real implementation, fetch from backup storage
        $backups = [
            [
                'id' => 'BACKUP_20240210145823_7891',
                'type' => 'full',
                'created_at' => '2024-02-10T14:58:23Z',
                'file_size' => '2.8 GB',
                'compressed_size' => '1.1 GB',
                'status' => 'completed',
                'encrypted' => true,
                'location' => 's3://university-backups/2024/02/',
                'retention_until' => '2024-03-12T14:58:23Z'
            ],
            [
                'id' => 'BACKUP_20240209145823_7890',
                'type' => 'incremental',
                'created_at' => '2024-02-09T14:58:23Z',
                'file_size' => '450 MB',
                'compressed_size' => '180 MB',
                'status' => 'completed',
                'encrypted' => true,
                'location' => 's3://university-backups/2024/02/',
                'retention_until' => '2024-03-11T14:58:23Z'
            ]
        ];

        return response()->json([
            'backups' => $backups,
            'summary' => [
                'total_backups' => count($backups),
                'total_size' => '3.25 GB',
                'compressed_size' => '1.28 GB',
                'oldest_backup' => '2024-01-15T10:00:00Z',
                'newest_backup' => '2024-02-10T14:58:23Z'
            ]
        ]);
    }

    /**
     * Restore from backup
     */
    public function restoreBackup(Request $request, $backupId): JsonResponse
    {
        $validated = $request->validate([
            'restore_type' => 'required|in:full,database_only,files_only,selective',
            'target_location' => 'sometimes|string',
            'overwrite_existing' => 'boolean',
            'confirm_restore' => 'required|boolean|accepted'
        ]);

        // In real implementation, initiate restore process
        $restoreId = 'RESTORE_' . now()->format('YmdHis') . '_' . rand(1000, 9999);
        
        $this->logAdminAction($request->user(), 'backup_restore_initiated', [
            'restore_id' => $restoreId,
            'backup_id' => $backupId,
            'restore_type' => $validated['restore_type'],
            'overwrite_existing' => $validated['overwrite_existing'] ?? false
        ]);

        return response()->json([
            'message' => 'Backup restore initiated successfully',
            'restore_id' => $restoreId,
            'backup_id' => $backupId,
            'restore_type' => $validated['restore_type'],
            'estimated_duration' => '45 minutes',
            'initiated_by' => $request->user()->name,
            'initiated_at' => now(),
            'status' => 'in_progress',
            'warning' => 'System may be temporarily unavailable during restore'
        ], 202);
    }

    /**
     * Get system activity dashboard
     */
    public function getActivityDashboard(Request $request): JsonResponse
    {
        $timeframe = $request->get('timeframe', '24h'); // 1h, 24h, 7d, 30d
        
        return response()->json([
            'timeframe' => $timeframe,
            'generated_at' => now(),
            'real_time_metrics' => [
                'active_users' => 234,
                'current_sessions' => 567,
                'requests_per_minute' => 1250,
                'response_time_avg' => '145ms',
                'error_rate' => '0.02%',
                'system_load' => '23%'
            ],
            'user_activity' => [
                'total_logins' => 3456,
                'unique_users' => 890,
                'new_registrations' => 45,
                'password_resets' => 23,
                'failed_logins' => 67,
                'account_lockouts' => 3
            ],
            'system_events' => [
                'total_events' => 15678,
                'by_category' => [
                    'authentication' => 8901,
                    'user_management' => 2345,
                    'system_maintenance' => 123,
                    'security' => 456,
                    'errors' => 89
                ]
            ],
            'performance_metrics' => [
                'average_response_time' => '142ms',
                'peak_response_time' => '2.3s',
                'database_queries' => 45678,
                'cache_hit_rate' => '94.2%',
                'memory_usage' => '68%',
                'cpu_usage' => '23%',
                'disk_usage' => '67%'
            ],
            'alerts' => [
                [
                    'type' => 'warning',
                    'message' => 'Database response time increased by 15%',
                    'timestamp' => now()->subMinutes(30),
                    'resolved' => false
                ],
                [
                    'type' => 'info',
                    'message' => 'Scheduled backup completed successfully',
                    'timestamp' => now()->subHours(2),
                    'resolved' => true
                ]
            ]
        ]);
    }

    /**
     * Log admin actions for audit trail
     */
    private function logAdminAction($admin, $action, $details = []): void
    {
        // In real implementation, log to database or file
        \Log::info('Admin Action', [
            'admin_id' => $admin->id,
            'admin_name' => $admin->name,
            'action' => $action,
            'details' => $details,
            'timestamp' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }

    /**
     * Get estimated duration for maintenance tasks
     */
    private function getEstimatedDuration($task): string
    {
        $durations = [
            'clear_cache' => '2 minutes',
            'optimize_database' => '15 minutes',
            'cleanup_logs' => '5 minutes',
            'backup_system' => '30 minutes',
            'update_indexes' => '10 minutes'
        ];

        return $durations[$task] ?? '5 minutes';
    }

    /**
     * Get estimated number of notification recipients
     */
    private function getEstimatedRecipients($validated): int
    {
        // In real implementation, count actual users based on filters
        $estimates = [
            'all' => 1250,
            'role' => 150,
            'department' => 80,
            'status' => 200
        ];

        return $estimates[$validated['recipient_type']] ?? 100;
    }

    /**
     * Get estimated backup size
     */
    private function getEstimatedBackupSize($backupType): string
    {
        $sizes = [
            'full' => '2.8 GB',
            'incremental' => '450 MB',
            'database_only' => '1.2 GB',
            'files_only' => '1.6 GB'
        ];

        return $sizes[$backupType] ?? '1 GB';
    }

    /**
     * Get estimated backup duration
     */
    private function getEstimatedBackupDuration($backupType): string
    {
        $durations = [
            'full' => '25 minutes',
            'incremental' => '8 minutes',
            'database_only' => '15 minutes',
            'files_only' => '18 minutes'
        ];

        return $durations[$backupType] ?? '15 minutes';
    }
}