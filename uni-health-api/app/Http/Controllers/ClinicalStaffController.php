<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Models\Medication;
use App\Events\PatientWalkedIn;



class ClinicalStaffController extends Controller
{
    /**
 * Clinical staff dashboard with nursing, support overview, and student requests
 */
private const PRIORITY_LEVELS = [
        'urgent' => 3,
        'high' => 2,
        'normal' => 1
    ];

public function dashboard(Request $request): JsonResponse
{
    $user = $request->user();
    $today = now()->format('Y-m-d');

    // ADD THESE MISSING LINES:
    $weekStart = now()->startOfWeek()->format('Y-m-d');
    $monthStart = now()->startOfMonth()->format('Y-m-d');

    // Get today's appointments count by status
    $appointmentStats = Appointment::whereDate('date', $today)
        ->select('status', DB::raw('count(*) as count'))
        ->groupBy('status')
        ->pluck('count', 'status');

    // Get patient queue for today - FIX: Handle null doctors
    $patientQueue = Appointment::with(['patient', 'doctor'])
        ->whereDate('date', $today)
        ->orderBy('time')
        ->limit(10)
        ->get()
        ->map(function ($appointment) {
            return [
                'id' => $appointment->id,
                'patient_name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
                'date' => $appointment->date, // Keep as YYYY-MM-DD
                'time' => $appointment->time, // Keep as HH:mm
                'status' => $appointment->status,
                'priority' => $appointment->priority,
                'reason' => $appointment->reason,
                'assigned_doctor' => $appointment->doctor ? $appointment->doctor->name : 'Unassigned'
            ];
        });

    // Count pending + under review student requests
    $studentRequestsCount = Appointment::whereIn('status', ['pending', 'under_review'])
        ->count();

    // Get latest student requests (limit 5)
    $studentRequests = Appointment::with(['patient'])
    ->whereIn('status', ['pending', 'under_review'])
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get()
    ->map(function($appointment) {
        return [
            'id' => $appointment->id,
            'patient' => $appointment->patient ? [
                'name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
            ] : null,
            'date' => $appointment->date,
            'time' => $appointment->time,
            'created_at' => $appointment->created_at->toISOString(),
            'requested_time' => $appointment->time, // ✅ ADD THIS
            'requested_date' => $appointment->date, // ✅ ADD THIS
            'reason' => $appointment->reason,
            'specialization' => $appointment->specialization,
            'priority' => $appointment->priority ?? 'normal',
            'urgency' => $appointment->urgency ?? $appointment->priority ?? 'normal',
            'status' => $appointment->status,
        ];
    });

    // IMPROVED: Calculate urgent cases more comprehensively
    // 1. Count urgent appointments scheduled for today (active cases)
    $urgentAppointmentsToday = Appointment::whereDate('date', $today)
        ->where('priority', 'urgent')
        ->whereIn('status', ['scheduled', 'confirmed', 'in_progress', 'assigned'])
        ->count();

    // 2. Count urgent student requests that are pending/under review (regardless of date)
    $urgentStudentRequests = Appointment::whereIn('status', ['pending', 'under_review'])
        ->where('priority', 'urgent')
        ->count();

    // 3. Total urgent cases = today's urgent appointments + urgent pending requests
    $totalUrgentCases = $urgentAppointmentsToday + $urgentStudentRequests;

    // DEBUG: Add logging to troubleshoot
    \Log::info('Dashboard Urgent Cases Calculation', [
        'date' => $today,
        'urgent_appointments_today' => $urgentAppointmentsToday,
        'urgent_student_requests' => $urgentStudentRequests,
        'total_urgent_cases' => $totalUrgentCases,
        'raw_urgent_query' => Appointment::where('priority', 'urgent')
            ->whereIn('status', ['scheduled', 'confirmed', 'in_progress', 'assigned', 'pending', 'under_review'])
            ->get(['id', 'date', 'priority', 'status', 'created_at'])
            ->toArray()
    ]);

     $kpiData = $this->getKPIData($today, $weekStart, $monthStart);

    return response()->json([
        'message' => 'Welcome to Clinical Staff Dashboard',
        'staff_member' => [
            'name' => $user->name,
            'staff_no' => $user->staff_no,
            'department' => $user->department,
            'role' => 'Clinical Staff',
            'shift' => $this->getCurrentShift(),
            'phone' => $user->phone,
            'email' => $user->email
        ],
        'today_overview' => [
            'date' => $today,
            'shift' => $this->getCurrentShift(),
            'scheduled_appointments' => $appointmentStats->sum(),
            'completed_tasks' => $appointmentStats->get('completed', 0),
            'pending_tasks' => ($appointmentStats->get('pending', 0) + $appointmentStats->get('confirmed', 0)),
            'patients_seen' => $appointmentStats->get('completed', 0),
            'urgent_cases' => $totalUrgentCases,
            'pending_student_requests' => $studentRequestsCount,
        ],
        'patient_queue' => $patientQueue,
        'student_requests' => $studentRequests,
        'kpi_data' => $kpiData, // NEW: Add KPI data
    ]);
}


/**
 * Assign student request to doctor
 */
public function assignStudentRequest(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'doctor_id' => 'required|exists:users,id',
        'notes' => 'nullable|string|max:500'
    ]);

    $appointment = Appointment::findOrFail($id);
    
    // Only allow assignment for pending/under_review requests
    if (!in_array($appointment->status, ['pending', 'under_review'])) {
        return response()->json([
            'message' => 'This request cannot be assigned at this time'
        ], 400);
    }

    // ✅ ADD PRIORITY BLOCKING CHECK
    $blockingCheck = $this->hasBlockingAppointments(
        $appointment->id,
        $appointment->date,
        $appointment->time,
        $appointment->priority ?? 'normal'
    );
    
    if ($blockingCheck['has_blocking']) {
        return response()->json([
            'message' => 'Cannot assign this appointment. There are ' . $blockingCheck['count'] . ' higher priority appointments that must be processed first',
            'blocking_appointments' => $blockingCheck['blocking_appointments'],
            'can_proceed' => false
        ], 423); // 423 Locked
    }

    // Update status and assign doctor
    $appointment->status = 'assigned';
    $appointment->doctor_id = $validated['doctor_id'];
    $appointment->assigned_at = now();
    
    // Only add notes if provided and column exists
    if (!empty($validated['notes']) && Schema::hasColumn('appointments', 'notes')) {
        $appointment->notes = $validated['notes'];
    }
    
    $appointment->save();

    // Broadcast the assignment
    try {
        broadcast(new \App\Events\AppointmentStatusUpdated($appointment));
    } catch (\Exception $e) {
        \Log::warning('Failed to broadcast appointment assignment: ' . $e->getMessage());
    }

    return response()->json([
        'message' => 'Student request assigned successfully',
        'appointment' => $appointment->load(['patient', 'doctor'])
    ]);
}

/**
 * Approve student request
 */
public function approveStudentRequest(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'doctor_id' => 'required|exists:users,id',
        'notes' => 'nullable|string|max:500',
        'status' => 'nullable|string|in:waiting,scheduled'
    ]);

    $appointment = Appointment::findOrFail($id);
    
    // ✅ ADD PRIORITY BLOCKING CHECK
    $blockingCheck = $this->hasBlockingAppointments(
        $appointment->id,
        $appointment->date,
        $appointment->time,
        $appointment->priority ?? 'normal'
    );
    
    if ($blockingCheck['has_blocking']) {
        return response()->json([
            'message' => 'Cannot approve this appointment. There are ' . $blockingCheck['count'] . ' higher priority appointments that must be processed first',
            'blocking_appointments' => $blockingCheck['blocking_appointments'],
            'can_proceed' => false
        ], 423);
    }
    
    // Set to 'scheduled' - waiting for patient to walk in
    $appointment->status = 'scheduled';
    $appointment->type = 'approved_request';
    $appointment->doctor_id = $validated['doctor_id'];
    $appointment->approved_at = now();
    
    if (!empty($validated['notes']) && Schema::hasColumn('appointments', 'notes')) {
        $appointment->notes = $validated['notes'];
    }
    
    $appointment->save();
    
    \Log::info('After approval save:', [
        'id' => $appointment->id,
        'type' => $appointment->type,
        'status' => $appointment->status,
        'date' => $appointment->date
    ]);

    try {
        broadcast(new \App\Events\AppointmentStatusUpdated($appointment));
        broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
            'pending_student_requests' => Appointment::whereIn('status', ['pending', 'under_review'])->count(),
            'awaiting_walkin' => Appointment::where('status', 'scheduled')->where('type', 'approved_request')->count()
        ]));
    } catch (\Exception $e) {
        \Log::warning('Failed to broadcast: ' . $e->getMessage());
    }

    return response()->json([
        'message' => 'Student request approved and added to walk-in queue',
        'appointment' => $appointment->load(['patient', 'doctor'])
    ]);
}


/**
 * Reject student request
 */
public function rejectStudentRequest(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'rejection_reason' => 'required|string|max:500',
        'notes' => 'nullable|string|max:500'
    ]);

    $appointment = Appointment::findOrFail($id);
    
    $appointment->update([
        'status' => 'rejected', // KEEP AS REJECTED, don't change to scheduled
        'rejection_reason' => $validated['rejection_reason'],
        'rejected_at' => now(),
        'notes' => $validated['notes']
    ]);

    return response()->json([
        'message' => 'Student request rejected',
        'appointment' => $appointment->load(['patient'])
    ]);
}

/**
 * Reassign cancelled appointment to new doctor
 */
public function reassignAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'doctor_id' => 'required|exists:users,id',
        'notes' => 'nullable|string|max:500'
    ]);

    try {
        DB::beginTransaction();

        $appointment = Appointment::where('needs_reassignment', true)
            ->findOrFail($id);

        // Verify the new doctor exists and is a doctor
        $newDoctor = User::where('id', $validated['doctor_id'])
            ->where('role', 'doctor')
            ->firstOrFail();

        // Update appointment with new doctor
        $appointment->update([
            'doctor_id' => $validated['doctor_id'],
            'status' => 'scheduled', // Reset to scheduled
            'needs_reassignment' => false,
            'reassignment_notes' => $validated['notes'] ?? null,
            'reassigned_at' => now(),
            'reassigned_by' => $request->user()->id
        ]);

        // Log the reassignment
        \Log::info("Appointment {$id} reassigned to Dr. {$newDoctor->name} by clinical staff", [
            'appointment_id' => $id,
            'new_doctor_id' => $newDoctor->id,
            'clinical_staff_id' => $request->user()->id
        ]);

        // Trigger notification to new doctor
        event(new \App\Events\AppointmentReassigned($appointment, $newDoctor));

        DB::commit();

        return response()->json([
            'message' => 'Appointment reassigned successfully',
            'appointment' => $appointment->load(['patient', 'doctor'])
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Error reassigning appointment: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to reassign appointment',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Add this to your ClinicalStaffController dashboard method

private function getKPIData($today, $weekStart, $monthStart): array
{
    // Appointments trend (last 7 days)
    $appointmentsTrend = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = now()->subDays($i)->format('Y-m-d');
        $count = Appointment::whereDate('date', $date)->count();
        $appointmentsTrend[] = [
            'date' => $date,
            'count' => $count,
            'day' => now()->subDays($i)->format('D')
        ];
    }

    // Patient status distribution
    $patientStatusData = Appointment::whereDate('date', $today)
        ->select('status', DB::raw('count(*) as count'))
        ->groupBy('status')
        ->get()
        ->map(function($item) {
            return [
                'status' => ucfirst($item->status),
                'count' => $item->count
            ];
        });

    // Priority distribution
    $priorityData = Appointment::whereDate('date', $today)
        ->select('priority', DB::raw('count(*) as count'))
        ->groupBy('priority')
        ->get()
        ->map(function($item) {
            return [
                'priority' => ucfirst($item->priority ?: 'normal'),
                'count' => $item->count
            ];
        });

    // Weekly performance metrics
    $weeklyMetrics = [
        'appointments_completed' => Appointment::whereDate('date', '>=', $weekStart)
            ->where('status', 'completed')->count(),
        'medications_administered' => MedicalRecord::where('type', 'medication')
            ->whereDate('created_at', '>=', $weekStart)->count(),
        'vital_signs_recorded' => MedicalRecord::where('type', 'vital_signs')
            ->whereDate('created_at', '>=', $weekStart)->count(),
        'student_requests_processed' => Appointment::whereIn('status', ['approved', 'assigned', 'scheduled'])
            ->whereDate('updated_at', '>=', $weekStart)->count(),
    ];

    // Department workload (if multiple departments)
    $departmentWorkload = User::where('role', 'doctor')
        ->with(['appointments' => function($query) use ($today) {
            $query->whereDate('date', $today);
        }])
        ->get()
        ->groupBy('department')
        ->map(function($doctors, $department) {
            $totalAppointments = $doctors->sum(function($doctor) {
                return $doctor->appointments->count();
            });
            return [
                'department' => $department ?: 'General',
                'appointments' => $totalAppointments,
                'doctors' => $doctors->count()
            ];
        })
        ->values();

    return [
        'appointments_trend' => $appointmentsTrend,
        'patient_status_distribution' => $patientStatusData,
        'priority_distribution' => $priorityData,
        'weekly_metrics' => $weeklyMetrics,
        'department_workload' => $departmentWorkload,
        'response_times' => $this->getResponseTimeMetrics($today),
    ];
}

private function getResponseTimeMetrics($today): array
{
    // Average time from student request to assignment
    $avgResponseTime = Appointment::whereDate('created_at', $today)
        ->whereNotNull('assigned_at')
        ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, assigned_at)) as avg_minutes')
        ->first();

    return [
        'avg_response_time_minutes' => round($avgResponseTime->avg_minutes ?? 0),
        'target_response_time' => 30, // 30 minutes target
        'performance_score' => $this->calculateResponseScore($avgResponseTime->avg_minutes ?? 0)
    ];
}

private function calculateResponseScore($avgMinutes): int
{
    if ($avgMinutes <= 15) return 100;
    if ($avgMinutes <= 30) return 80;
    if ($avgMinutes <= 60) return 60;
    if ($avgMinutes <= 120) return 40;
    return 20;
}

/**
 * Assign appointment to doctor
 */
public function assignAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'doctor_id' => 'required|exists:users,id',
        'notes' => 'nullable|string|max:500'
    ]);

    $appointment = Appointment::findOrFail($id);
    
    // Check if appointment can be assigned
    if (!in_array($appointment->status, ['pending', 'under_review'])) {
        return response()->json(['message' => 'Appointment cannot be assigned'], 400);
    }

    $appointment->update([
        'status' => 'assigned',
        'doctor_id' => $validated['doctor_id'],
        'assigned_at' => now(),
        'notes' => $validated['notes']
    ]);

    // Notify doctor (implement notification system)
    $this->notifyDoctor($appointment);

    return response()->json([
        'message' => 'Appointment assigned successfully',
        'appointment' => $appointment->load(['patient', 'doctor'])
    ]);
}

/**
 * Reject appointment
 */
public function rejectAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'rejection_reason' => 'required|string|max:500',
        'notes' => 'nullable|string|max:500'
    ]);

    $appointment = Appointment::findOrFail($id);
    
    $appointment->update([
        'status' => 'rejected',
        'rejection_reason' => $validated['rejection_reason'],
        'rejected_at' => now(),
        'notes' => $validated['notes']
    ]);

    // Notify patient
    $this->notifyPatient($appointment, 'rejected');

    return response()->json([
        'message' => 'Appointment rejected successfully',
        'appointment' => $appointment->load(['patient'])
    ]);
}

/**
 * Get pending appointments for review
 */
public function getPendingAppointments(Request $request): JsonResponse
{
    $appointments = Appointment::with(['patient', 'doctor'])
        ->whereIn('status', ['pending', 'under_review'])
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'pending_appointments' => $appointments,
        'total' => $appointments->count()
    ]);
}

// Add notification helper methods
private function notifyDoctor($appointment)
{
    // Implement notification system (email/SMS)
    // For now, just log
    \Log::info("Doctor {$appointment->doctor->name} assigned to appointment {$appointment->id}");
}

private function notifyPatient($appointment, $type)
{
    // Implement notification system
    \Log::info("Patient {$appointment->patient->name} notified about appointment {$type}");
}

/**
 * Send appointment confirmation
 */
public function confirmAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'method' => 'required|in:sms,email,both',
        'custom_message' => 'nullable|string|max:500'
    ]);
    
    $appointment = Appointment::with(['patient', 'doctor'])->findOrFail($id);
    
    // ✅ ADD PRIORITY BLOCKING CHECK
    $blockingCheck = $this->hasBlockingAppointments(
        $appointment->id,
        $appointment->date,
        $appointment->time,
        $appointment->priority ?? 'normal'
    );
    
    if ($blockingCheck['has_blocking']) {
        return response()->json([
            'message' => 'Cannot confirm this appointment. There are ' . $blockingCheck['count'] . ' higher priority appointments pending',
            'blocking_appointments' => $blockingCheck['blocking_appointments'],
            'can_proceed' => false
        ], 423);
    }
    
    // Update appointment status to confirmed
    $appointment->update(['status' => 'confirmed']);
    
    // Here you would typically send SMS/Email
    // For now, we'll just return success

    // ADD BROADCASTING
    broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
        'confirmed_appointments' => Appointment::where('status', 'confirmed')->count(),
        'pending_appointments' => Appointment::where('status', 'pending')->count()
    ]));
    
    $confirmationMessage = $validated['custom_message'] ?? 
        "Your appointment on {$appointment->date} at {$appointment->time} with Dr. {$appointment->doctor->name} has been confirmed.";
    
    // Log the confirmation attempt
    \Log::info("Appointment confirmation sent", [
        'appointment_id' => $id,
        'method' => $validated['method'],
        'patient_id' => $appointment->patient_id,
        'message' => $confirmationMessage
    ]);
    
    return response()->json([
        'message' => 'Appointment confirmation sent successfully',
        'method' => $validated['method'],
        'appointment' => $appointment
    ]);
}

/**
     * Get clinical staff profile
     */
    public function getProfile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'message' => 'User not found'
                ], 404);
            }
            
            // Ensure avatar_url is a full URL
            $avatarUrl = null;
            if ($user->avatar_url) {
                if (filter_var($user->avatar_url, FILTER_VALIDATE_URL)) {
                    $avatarUrl = $user->avatar_url;
                } else {
                    $avatarUrl = url($user->avatar_url);
                }
            }
            
            // FIX: Handle date_of_birth properly - it might be a string or Carbon object
            $dateOfBirth = null;
            if ($user->date_of_birth) {
                if ($user->date_of_birth instanceof \Carbon\Carbon) {
                    $dateOfBirth = $user->date_of_birth->format('Y-m-d');
                } else {
                    $dateOfBirth = $user->date_of_birth;
                }
            }
            
            return response()->json([
                'staff_no' => $user->staff_no,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'date_of_birth' => $dateOfBirth,
                'gender' => $user->gender,
                'avatar_url' => $avatarUrl,
                'department' => $user->department,
                'role' => $user->role,
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Clinical staff profile fetch error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to fetch profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update clinical staff profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'message' => 'User not found'
                ], 404);
            }
            
            $minBirthDate = now()->subYears(21)->toDateString();
            
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|string|max:20',
                'date_of_birth' => [
                    'sometimes',
                    'date',
                    'before_or_equal:' . $minBirthDate
                ],
                'gender' => 'sometimes|in:male,female,other,prefer_not_to_say',
            ], [
                'date_of_birth.before_or_equal' => 'Clinical staff must be at least 21 years old.',
            ]);

            // Age verification if date_of_birth is being updated
            if (isset($validated['date_of_birth'])) {
                $birthDate = Carbon::parse($validated['date_of_birth']);
                $age = $birthDate->diffInYears(now());
                
                if ($age < 21) {
                    return response()->json([
                        'message' => 'Age requirement not met',
                        'errors' => [
                            'date_of_birth' => ['Clinical staff must be at least 21 years old. Current age: ' . $age . ' years.']
                        ]
                    ], 422);
                }
                
                // Ensure date_of_birth is properly cast to Carbon
                $validated['date_of_birth'] = $birthDate;
            }

            $user->update($validated);

            // Refresh the user to get updated data
            $user->refresh();

            // Ensure avatar_url is a full URL in response
            $avatarUrl = null;
            if ($user->avatar_url) {
                if (filter_var($user->avatar_url, FILTER_VALIDATE_URL)) {
                    $avatarUrl = $user->avatar_url;
                } else {
                    $avatarUrl = url($user->avatar_url);
                }
            }

            // FIX: Handle date_of_birth properly in response
            $dateOfBirth = null;
            if ($user->date_of_birth) {
                if ($user->date_of_birth instanceof \Carbon\Carbon) {
                    $dateOfBirth = $user->date_of_birth->format('Y-m-d');
                } else {
                    $dateOfBirth = $user->date_of_birth;
                }
            }

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => [
                    'staff_no' => $user->staff_no,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'date_of_birth' => $dateOfBirth,
                    'gender' => $user->gender,
                    'avatar_url' => $avatarUrl,
                    'department' => $user->department,
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Clinical staff profile update error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload clinical staff avatar
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            ]);

            $user = $request->user();
            
            // Delete old avatar if exists
            if ($user->avatar_url) {
                $oldPath = str_replace('/storage/', '', $user->avatar_url);
                $oldPath = str_replace(url('/storage/'), '', $user->avatar_url);
                
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Store new avatar
            $file = $request->file('avatar');
            $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('avatars', $filename, 'public');
            
            // Create FULL URL
            $avatarUrl = url('/storage/' . $path);
            
            // Update user record
            $user->update(['avatar_url' => $avatarUrl]);

            \Log::info('Clinical staff avatar uploaded', [
                'user_id' => $user->id,
                'path' => $path,
                'full_url' => $avatarUrl
            ]);

            return response()->json([
                'message' => 'Avatar uploaded successfully',
                'avatar_url' => $avatarUrl
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Clinical staff avatar upload error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to upload avatar',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Remove clinical staff avatar
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if ($user->avatar_url) {
                $oldPath = str_replace('/storage/', '', $user->avatar_url);
                $oldPath = str_replace(url('/storage/'), '', $user->avatar_url);
                
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
                
                $user->update(['avatar_url' => null]);
                
                \Log::info('Clinical staff avatar removed', ['user_id' => $user->id]);
            }

            return response()->json([
                'message' => 'Avatar removed successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Clinical staff avatar removal error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to remove avatar',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

// Add to ClinicalStaffController
public function registerWalkInPatient(Request $request): JsonResponse
{
    $validated = $request->validate([
        'student_id' => 'required|string',
        'complaints' => 'required|string',
        'urgency' => 'required|in:normal,urgent,emergency',
        'walk_in_time' => 'required|date',
    ]);

    // Create immediate appointment or queue entry
    $appointment = Appointment::create([
        'patient_id' => $this->findOrCreatePatient($validated['student_id']),
        'type' => 'walk_in',
        'status' => 'waiting',
        'priority' => $validated['urgency'],
        'date' => now()->format('Y-m-d'),
        'time' => now()->format('H:i'),
        'reason' => $validated['complaints']
    ]);

    return response()->json([
        'message' => 'Walk-in patient registered successfully',
        'queue_number' => $this->generateQueueNumber(),
        'estimated_wait_time' => $this->calculateWaitTime(),
        'appointment' => $appointment
    ]);
}

// Add to ClinicalStaffController
public function getPatientQueue(Request $request): JsonResponse
{
    $date = $request->get('date', now()->format('Y-m-d'));
    
    $queue = Appointment::whereDate('date', $date)
        ->whereIn('status', ['waiting', 'confirmed', 'in_progress'])
        ->orderBy('priority', 'desc') // Emergency first
        ->orderBy('created_at', 'asc') // Then FIFO
        ->with(['patient', 'doctor'])
        ->get()
        ->map(function($appointment, $index) {
            return [
                'queue_position' => $index + 1,
                'patient_name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
                'type' => $appointment->type, // 'scheduled' or 'walk_in'
                'priority' => $appointment->priority,
                'estimated_wait_time' => $this->calculateWaitTime($index),
                'status' => $appointment->status
            ];
        });

    return response()->json([
        'queue' => $queue,
        'total_waiting' => $queue->count(),
        'estimated_total_wait' => $queue->sum('estimated_wait_time')
    ]);
}

    /**
     * Get all doctors (for the doctors tab)
     */
    public function getAllDoctors(Request $request): JsonResponse
    {
        $doctors = User::where('role', 'doctor')
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'phone', 'staff_no', 'department', 'specialization', 'status')
            ->get()
            ->map(function($doctor) {
                // Get unique patient count (all time)
                $totalPatients = Appointment::where('doctor_id', $doctor->id)
                    ->distinct('patient_id')
                    ->count('patient_id');
                
                // Get unique patient count for today
                $patientsToday = Appointment::where('doctor_id', $doctor->id)
                    ->whereDate('date', now()->format('Y-m-d'))
                    ->distinct('patient_id')
                    ->count('patient_id');
                
                return [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'full_name' => $doctor->name,
                    'email' => $doctor->email,
                    'phone' => $doctor->phone ?? 'N/A',
                    'staff_no' => $doctor->staff_no,
                    'department' => $doctor->department ?? 'N/A',
                    'specialty' => $doctor->specialization,
                    'status' => $doctor->status,
                    'total_patients' => $totalPatients,
                    'patients_today' => $patientsToday
                ];
            });
        
        return response()->json([
            'data' => $doctors,
            'total' => $doctors->count()
        ]);
    }
    /**
     * Get available doctors for appointment scheduling
     */
    public function getAvailableDoctors(Request $request): JsonResponse
{
    $validated = $request->validate([
        'date' => 'required|date|after_or_equal:today',
        'time' => 'required|date_format:H:i',
        'duration' => 'sometimes|integer|min:15|max:180',
        'specialization' => 'sometimes|string|max:100'
    ]);

    $date = $validated['date'];
    $time = $validated['time'];
    $duration = $validated['duration'] ?? 30;
    $specialization = $validated['specialization'] ?? null;

    // FIX: Parse date and time separately, then combine them properly
    try {
        $requestedStartTime = Carbon::createFromFormat('Y-m-d H:i', "$date $time");
        $requestedEndTime = $requestedStartTime->copy()->addMinutes($duration);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Invalid date or time format',
            'error' => $e->getMessage()
        ], 400);
    }

    // Get all doctors
    $doctorsQuery = User::where('role', 'doctor')
        ->where('status', 'active');

    // Filter by specialization if provided
    if ($specialization) {
        $doctorsQuery->where('specialization', $specialization);
    }

    $doctors = $doctorsQuery->get();
    $availableDoctors = [];

    foreach ($doctors as $doctor) {
        // Get doctor's appointments for the requested date
        $existingAppointments = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('date', $date)
            ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
            ->get();

        $isAvailable = true;

        // Check for conflicts with existing appointments
        foreach ($existingAppointments as $appointment) {
            try {
                // FIX: Create Carbon instances more safely
                $existingStart = Carbon::createFromFormat('Y-m-d H:i', $appointment->date . ' ' . $appointment->time);
                $existingEnd = $existingStart->copy()->addMinutes($appointment->duration ?? 30);

                // Check if there's an overlap
                if ($requestedStartTime->lt($existingEnd) && $requestedEndTime->gt($existingStart)) {
                    $isAvailable = false;
                    break;
                }
            } catch (\Exception $e) {
                // If there's an error parsing appointment time, skip this appointment check
                \Log::warning("Error parsing appointment time for appointment {$appointment->id}: " . $e->getMessage());
                continue;
            }
        }

        // FIX: Check doctor's working hours more safely
        try {
            $workingHoursStart = Carbon::createFromFormat('Y-m-d H:i', "$date 08:00");
            $workingHoursEnd = Carbon::createFromFormat('Y-m-d H:i', "$date 17:00");
            
            if ($requestedStartTime->lt($workingHoursStart) || $requestedEndTime->gt($workingHoursEnd)) {
                $isAvailable = false;
            }
        } catch (\Exception $e) {
            // If error with working hours, assume doctor is available during normal hours
            \Log::warning("Error checking working hours for doctor {$doctor->id}: " . $e->getMessage());
        }

        if ($isAvailable) {
            $availableDoctors[] = [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'specialization' => $doctor->specialization,
                'department' => $doctor->department,
                'email' => $doctor->email,
                'phone' => $doctor->phone,
                'staff_no' => $doctor->staff_no,
                'experience_years' => $doctor->experience_years ?? null,
                'qualifications' => $doctor->qualifications ?? null,
                'current_appointments_count' => $existingAppointments->count(),
                'next_available_slot' => $this->getNextAvailableSlot($doctor->id, $date, $time),
                'availability_status' => 'available'
            ];
        } else {
            // If not available at requested time, still include with next available slot
            $nextSlot = $this->getNextAvailableSlot($doctor->id, $date, $time);
            if ($nextSlot) {
                $availableDoctors[] = [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'specialization' => $doctor->specialization,
                    'department' => $doctor->department,
                    'email' => $doctor->email,
                    'phone' => $doctor->phone,
                    'staff_no' => $doctor->staff_no,
                    'experience_years' => $doctor->experience_years ?? null,
                    'qualifications' => $doctor->qualifications ?? null,
                    'available_at_requested_time' => false,
                    'current_appointments_count' => $existingAppointments->count(),
                    'next_available_slot' => $nextSlot,
                    'availability_status' => 'busy'
                ];
            }
        }
    }

    // Sort by availability at requested time first, then by appointment count
    usort($availableDoctors, function($a, $b) {
        $aAvailable = $a['available_at_requested_time'] ?? true;
        $bAvailable = $b['available_at_requested_time'] ?? true;
        
        if ($aAvailable !== $bAvailable) {
            return $bAvailable <=> $aAvailable; // Available first
        }
        
        return $a['current_appointments_count'] <=> $b['current_appointments_count']; // Less busy first
    });

    return response()->json([
        'requested_slot' => [
            'date' => $date,
            'time' => $time,
            'duration' => $duration,
            'specialization' => $specialization
        ],
        'available_doctors' => $availableDoctors,
        'summary' => [
            'total_doctors' => count($availableDoctors),
            'available_at_requested_time' => count(array_filter($availableDoctors, function($doc) {
                return $doc['available_at_requested_time'] ?? true;
            })),
            'specializations_available' => array_unique(array_column($availableDoctors, 'specialization'))
        ]
    ]);
}

    /**
     * Get next available slot for a doctor
     */
    private function getNextAvailableSlot($doctorId, $date, $requestedTime): ?array
{
    try {
        $startTime = Carbon::createFromFormat('Y-m-d H:i', "$date $requestedTime");
        $workingHoursEnd = Carbon::createFromFormat('Y-m-d H:i', "$date 17:00");
    } catch (\Exception $e) {
        \Log::warning("Error parsing time in getNextAvailableSlot: " . $e->getMessage());
        return null;
    }
    
    // Get all appointments for the doctor on this date
    $appointments = Appointment::where('doctor_id', $doctorId)
        ->whereDate('date', $date)
        ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
        ->orderBy('time')
        ->get();

    $currentTime = $startTime->copy();
    
    while ($currentTime->addMinutes(30)->lte($workingHoursEnd)) {
        $slotEnd = $currentTime->copy()->addMinutes(30);
        $isSlotFree = true;
        
        foreach ($appointments as $appointment) {
            try {
                $appointmentStart = Carbon::createFromFormat('Y-m-d H:i', $appointment->date . ' ' . $appointment->time);
                $appointmentEnd = $appointmentStart->copy()->addMinutes($appointment->duration ?? 30);
                
                if ($currentTime->lt($appointmentEnd) && $slotEnd->gt($appointmentStart)) {
                    $isSlotFree = false;
                    $currentTime = $appointmentEnd->copy()->subMinutes(30);
                    break;
                }
            } catch (\Exception $e) {
                // Skip problematic appointments
                \Log::warning("Error parsing appointment time in getNextAvailableSlot: " . $e->getMessage());
                continue;
            }
        }
        
        if ($isSlotFree) {
            return [
                'date' => $date,
                'time' => $currentTime->format('H:i'),
                'available_duration' => 30
            ];
        }
    }
    
    return null; // No available slots found for today
}


public function getWalkInPatients(Request $request): JsonResponse
{
    $date = $request->get('date', now()->format('Y-m-d'));
    
    \Log::info('Getting walk-in patients', [
        'requested_date' => $date,
        'today' => now()->format('Y-m-d')
    ]);
    
    $patients = Appointment::where(function($query) use ($date) {
            // Include appointments for the requested date
            $query->whereDate('date', $date)
                ->where(function($q) {
                    $q->where('type', 'walk_in')
                      ->whereIn('status', ['waiting', 'confirmed', 'in_progress']);
                });
        })
        ->orWhere(function($query) use ($date) {
            // IMPORTANT: Include approved requests that are scheduled (awaiting walk-in)
            // regardless of their scheduled date, as long as they're in scheduled status
            $query->where('type', 'approved_request')
                  ->where('status', 'scheduled')
                  ->whereDate('date', '>=', $date); // Include future dates
        })
        ->orWhere(function($query) use ($date) {
            // Include approved requests that have walked in today
            $query->where('type', 'approved_request')
                  ->whereDate('date', $date)
                  ->whereIn('status', ['confirmed', 'in_progress']);
        })
        ->with(['patient', 'doctor'])
        ->orderByRaw("FIELD(type, 'approved_request', 'walk_in')")
        ->orderByRaw("FIELD(status, 'scheduled', 'waiting', 'confirmed', 'in_progress')")
        ->orderBy('date', 'asc')
        ->orderBy('time', 'asc')
        ->get()
        ->map(function($appointment, $index) {
            \Log::info('Mapping appointment', [
                'id' => $appointment->id,
                'type' => $appointment->type,
                'status' => $appointment->status,
                'date' => $appointment->date,
                'patient' => $appointment->patient->name
            ]);
            
            return [
                'id' => $appointment->id,
                'patient_name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
                'complaints' => $appointment->reason,
                'urgency' => $appointment->priority,
                'walk_in_time' => $appointment->approved_at ?? $appointment->created_at->toISOString(),
                'scheduled_time' => $appointment->time,
                'scheduled_date' => $appointment->date,
                'type' => $appointment->type ?? 'walk_in',
                'queue_number' => $index + 1,
                'estimated_wait_time' => ($index * 15),
                'status' => $appointment->status,
                'doctor_name' => $appointment->doctor ? $appointment->doctor->name : 'Unassigned',
                'doctor_id' => $appointment->doctor_id,
                'has_walked_in' => in_array($appointment->status, ['confirmed', 'in_progress']),
                'appointment_id' => $appointment->id
            ];
        });

    \Log::info('Walk-in patients result', [
        'total_found' => $patients->count(),
        'details' => $patients->map(fn($p) => [
            'id' => $p['id'],
            'type' => $p['type'],
            'status' => $p['status'],
            'date' => $p['scheduled_date']
        ])
    ]);

    return response()->json([
        'patients' => $patients->values(),
        'next_queue_number' => $patients->count() + 1,
        'summary' => [
            'total' => $patients->count(),
            'walk_ins' => $patients->where('type', 'walk_in')->count(),
            'approved_requests' => $patients->where('type', 'approved_request')->count(),
            'waiting' => $patients->where('status', 'waiting')->count(),
            'scheduled_awaiting_arrival' => $patients->where('status', 'scheduled')->count()
        ]
    ]);
}

public function createWalkInPatient(Request $request): JsonResponse
{
    $validated = $request->validate([
        'student_id' => 'required|string',
        'patient_name' => 'sometimes|string',
        'complaints' => 'required|string',
        'urgency' => 'required|in:normal,urgent,emergency',
        'notes' => 'sometimes|string'
    ]);

    // Find or create patient
    $patient = User::where('student_id', $validated['student_id'])->first();
    if (!$patient) {
        $patient = User::create([
            'student_id' => $validated['student_id'],
            'name' => $validated['patient_name'] ?? 'Walk-in Patient ' . $validated['student_id'],
            'role' => 'student',
            'email' => $validated['student_id'] . '@walkin.placeholder.edu',
            'password' => bcrypt('temporary123'),
            'email_verified_at' => now(),
        ]);
    }

    // Create walk-in appointment
    $appointment = Appointment::create([
        'patient_id' => $patient->id,
        'doctor_id' => null,  // Explicitly set to null for walk-ins
        'type' => 'walk_in',
        'status' => 'waiting',
        'priority' => $validated['urgency'],
        'date' => now()->format('Y-m-d'),
        'time' => now()->format('H:i'),
        'reason' => $validated['complaints']
    ]);

    return response()->json([
        'message' => 'Walk-in patient registered successfully',
        'patient' => [
            'id' => $appointment->id,
            'patient_name' => $patient->name,
            'student_id' => $patient->student_id,
            'complaints' => $appointment->reason,
            'urgency' => $appointment->priority,
            'walk_in_time' => $appointment->created_at->toISOString(),
            'queue_number' => Appointment::where('type', 'walk_in')->whereDate('date', now())->count(),
            'estimated_wait_time' => 15,
            'status' => $appointment->status
        ]
    ]);
}

// Add this method to get urgent requests
public function getUrgentQueue(Request $request): JsonResponse
{
    \Log::info('🔥 Getting urgent queue...');
    
    // Get urgent appointments for today
    $urgentAppointmentsToday = Appointment::with(['patient', 'doctor'])
        ->where('priority', 'urgent')
        ->whereDate('date', now()->format('Y-m-d'))
        ->whereIn('status', ['scheduled', 'confirmed', 'in_progress', 'assigned'])
        ->get();
    
    // Get urgent pending/under review requests (regardless of date)
    $urgentPendingRequests = Appointment::with(['patient', 'doctor'])
        ->where('priority', 'urgent')
        ->whereIn('status', ['pending', 'under_review'])
        ->get();
    
    // Combine both collections
    $allUrgentRequests = $urgentAppointmentsToday->merge($urgentPendingRequests);
    
    // Sort by created_at ascending (oldest first - most critical)
    $allUrgentRequests = $allUrgentRequests->sortBy('created_at')->values();
    
    \Log::info('🔥 Urgent queue result', [
        'today_appointments' => $urgentAppointmentsToday->count(),
        'pending_requests' => $urgentPendingRequests->count(),
        'total_urgent' => $allUrgentRequests->count(),
        'details' => $allUrgentRequests->map(fn($apt) => [
            'id' => $apt->id,
            'patient' => $apt->patient->name ?? 'Unknown',
            'status' => $apt->status,
            'date' => $apt->date,
            'created_at' => $apt->created_at
        ])
    ]);

    return response()->json([
        'urgent_requests' => $allUrgentRequests,
        'total_urgent' => $allUrgentRequests->count(),
        'breakdown' => [
            'appointments_today' => $urgentAppointmentsToday->count(),
            'pending_requests' => $urgentPendingRequests->count()
        ]
    ]);
}

/**
 * Update walk-in patient status
 */
public function updateWalkInPatientStatus(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'status' => 'required|in:waiting,called,in_progress,completed,confirmed'
    ]);

    $appointment = Appointment::with(['patient', 'doctor'])->findOrFail($id);
    $oldStatus = $appointment->status;
    $appointment->update(['status' => $validated['status']]);

    // NEW: Broadcast to doctor when patient walks in (status changes to confirmed)
    if ($validated['status'] === 'confirmed' && $oldStatus === 'scheduled' && $appointment->doctor_id) {
        try {
            broadcast(new PatientWalkedIn($appointment))->toOthers();
            \Log::info("Broadcasting walk-in alert to doctor {$appointment->doctor_id} for patient {$appointment->patient->name}");
        } catch (\Exception $e) {
            \Log::warning("Failed to broadcast walk-in alert: " . $e->getMessage());
        }
    }

    return response()->json([
        'message' => 'Patient status updated successfully',
        'appointment' => $appointment,
        'alert_sent' => ($validated['status'] === 'confirmed' && $appointment->doctor_id)
    ]);
}

    /**
     * Get patients assigned to clinical staff
     */
    public function getPatients(Request $request): JsonResponse
    {
        $status = $request->get('status', 'all'); // all, active, waiting, completed
        $priority = $request->get('priority'); // normal, high, urgent
        
        $query = User::whereIn('role', ['student', 'academic_staff'])
            ->with(['appointments' => function($q) {
                $q->whereDate('date', now()->format('Y-m-d'));
            }]);
            
        if ($status !== 'all') {
            $query->whereHas('appointments', function($q) use ($status) {
                $q->where('status', $status);
            });
        }
        
        if ($priority) {
            $query->whereHas('appointments', function($q) use ($priority) {
                $q->where('priority', $priority);
            });
        }
        
        $patients = $query->get()->map(function($patient) {
            $latestAppointment = $patient->appointments->sortByDesc('created_at')->first();
            
            return [
                'id' => $patient->id,
                'name' => $patient->name,
                'student_id' => $patient->student_id,
                'staff_no' => $patient->staff_no,  // ADD THIS LINE
                'age' => Carbon::parse($patient->date_of_birth)->age,
                'gender' => $patient->gender,
                'department' => $patient->department,
                'status' => $latestAppointment ? $latestAppointment->status : 'inactive',
                'priority' => $latestAppointment ? $latestAppointment->priority : 'normal',
                'last_visit' => $latestAppointment ? $latestAppointment->created_at : null
            ];
        });
        
        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => $patients->count(),
                'active' => $patients->where('status', 'active')->count(),
                'waiting' => $patients->where('status', 'waiting')->count(),
                'completed' => $patients->where('status', 'completed')->count(),
            ]
        ]);
    }

    /**
     * Update patient information
     */
    public function updatePatient(Request $request, $patientId): JsonResponse
    {
        $validated = $request->validate([
            'vital_signs' => 'sometimes|array',
            'vital_signs.blood_pressure' => 'sometimes|string|max:20',
            'vital_signs.heart_rate' => 'sometimes|string|max:20',
            'vital_signs.temperature' => 'sometimes|string|max:20',
            'vital_signs.respiratory_rate' => 'sometimes|string|max:20',
            'vital_signs.oxygen_saturation' => 'sometimes|string|max:20',
            'vital_signs.weight' => 'sometimes|string|max:20',
            'vital_signs.height' => 'sometimes|string|max:20',
            'status' => 'sometimes|in:waiting,active,completed,discharged',
            'room_number' => 'sometimes|string|max:20',
            'notes' => 'sometimes|string|max:1000',
            'pain_level' => 'sometimes|integer|min:0|max:10',
            'mobility' => 'sometimes|in:full,assisted,bedrest,wheelchair'
        ]);

        $patient = User::findOrFail($patientId);
        $patient->update($validated);
        
        return response()->json([
            'message' => 'Patient information updated successfully',
            'patient_id' => $patientId,
            'updated_fields' => array_keys($validated),
            'updated_by' => $request->user()->name,
            'updated_at' => now(),
        ]);
    }

    /**
     * Get appointments for clinical staff
     */
    public function getAppointments(Request $request): JsonResponse
{
    $date = $request->get('date', now()->format('Y-m-d'));
    $status = $request->get('status', 'all');
    
    $query = Appointment::with(['patient', 'doctor'])
        ->whereDate('date', $date);
        
    if ($status !== 'all') {
        $query->where('status', $status);
    }
    
    $appointments = $query
    ->orderBy('created_at', 'desc')  // Newest first
    ->orderBy('date', 'desc')        // Then by date
    ->orderBy('time', 'desc')        // Then by time
    ->get()
    ->map(function($appointment) {
        // Determine the request type based on patient role
        $requestType = 'Student Request'; // Default
        
        if ($appointment->patient) {
            // Check if patient has staff_no (academic staff)
            if (!empty($appointment->patient->staff_no)) {
                $requestType = 'Academic Staff Request';
            }
            // Alternative: Check by role if you have a role field
            // if ($appointment->patient->role === 'academic_staff') {
            //     $requestType = 'Academic Staff Request';
            // }
        }
        
        return [
            'id' => $appointment->id,
            'date' => $appointment->date,
            'time' => $appointment->time,
            'duration' => $appointment->duration,
            'patient' => [
                'name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
                'staff_no' => $appointment->patient->staff_no ?? null, // Include staff_no
                'department' => $appointment->patient->department,
                'role' => $appointment->patient->role ?? null // Include role if available
            ],
            'type' => $appointment->type,
            'request_type' => $requestType, // NEW: Add request type
            'doctor' => $appointment->doctor ? $appointment->doctor->name : 'Unassigned',
            'status' => $appointment->status,
            'room' => $appointment->room,
            'notes' => $appointment->notes
        ];
    });
        
    return response()->json([
        'appointments' => $appointments,
        'schedule_summary' => [
            'date' => $date,
            'total_appointments' => $appointments->count(),
            'completed' => $appointments->where('status', 'completed')->count(),
            'in_progress' => $appointments->where('status', 'in_progress')->count(),
            'scheduled' => $appointments->where('status', 'scheduled')->count(),
        ]
    ]);
}

/**
 * Check if there are higher priority pending appointments
 */
private function hasHigherPriorityPending($currentAppointmentId, $currentDate, $currentTime, $currentPriority): array
{
    $priorityOrder = [
        'urgent' => 3,
        'high' => 2,
        'normal' => 1
    ];
    
    $currentPriorityLevel = $priorityOrder[$currentPriority] ?? 1;
    
    // Get all pending/waiting appointments before this one
    $blockingAppointments = Appointment::with(['patient'])
        ->where('id', '!=', $currentAppointmentId)
        ->whereIn('status', ['pending', 'waiting', 'scheduled', 'confirmed'])
        ->where(function($query) use ($currentDate, $currentTime) {
            $query->where('date', '<', $currentDate)
                  ->orWhere(function($q) use ($currentDate, $currentTime) {
                      $q->where('date', '=', $currentDate)
                        ->where('time', '<', $currentTime);
                  });
        })
        ->get()
        ->filter(function($apt) use ($priorityOrder, $currentPriorityLevel) {
            $aptPriority = $priorityOrder[$apt->priority ?? 'normal'] ?? 1;
            return $aptPriority >= $currentPriorityLevel;
        });
    
    return [
        'has_blocking' => $blockingAppointments->count() > 0,
        'count' => $blockingAppointments->count(),
        'blocking_appointments' => $blockingAppointments->map(function($apt) {
            return [
                'id' => $apt->id,
                'patient_name' => $apt->patient->name,
                'date' => $apt->date,
                'time' => $apt->time,
                'priority' => $apt->priority,
                'status' => $apt->status
            ];
        })->values()
    ];
}

/**
 * Check if appointment can be treated
 */
public function checkAppointmentTreatability(Request $request, $appointmentId): JsonResponse
{
    try {
        $appointment = Appointment::with(['patient'])->findOrFail($appointmentId);
        
        // Only check for appointments that are about to be treated
        if (!in_array($appointment->status, ['scheduled', 'confirmed', 'waiting'])) {
            return response()->json([
                'can_treat' => true,
                'message' => 'Appointment already in progress or completed'
            ]);
        }
        
        $blockingCheck = $this->hasHigherPriorityPending(
            $appointment->id,
            $appointment->date,
            $appointment->time,
            $appointment->priority ?? 'normal'
        );
        
        if ($blockingCheck['has_blocking']) {
            return response()->json([
                'can_treat' => false,
                'message' => 'There are ' . $blockingCheck['count'] . ' higher priority pending appointments that must be treated first',
                'blocking_appointments' => $blockingCheck['blocking_appointments']
            ], 423); // 423 Locked
        }
        
        return response()->json([
            'can_treat' => true,
            'message' => 'Appointment can be treated'
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error checking appointment treatability: ' . $e->getMessage());
        return response()->json([
            'can_treat' => false,
            'message' => 'Failed to check appointment status',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
 * Get student appointment requests for clinical staff to review
 */
public function getStudentRequests(Request $request): JsonResponse
{
    try {
        $status = $request->get('status', 'all');
        
        $query = Appointment::with(['patient', 'doctor'])
            ->whereIn('status', ['pending', 'under_review', 'approved', 'assigned', 'scheduled']);
            
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        
        $requests = $query->orderBy('created_at', 'desc')->get()->map(function($appointment) {
            // Determine the request type based on patient role
            $requestType = 'Student Request'; // Default
            
            if ($appointment->patient) {
                // Check if patient has staff_no (academic staff)
                if (!empty($appointment->patient->staff_no)) {
                    $requestType = 'Academic Staff Request';
                }
            }
            
            return [
                'id' => $appointment->id,
                'patient' => $appointment->patient ? [
                    'name' => $appointment->patient->name,
                    'student_id' => $appointment->patient->student_id,
                    'staff_no' => $appointment->patient->staff_no ?? null, // Include staff_no
                    'department' => $appointment->patient->department,
                    'role' => $appointment->patient->role ?? null // Include role if available
                ] : null,
                'doctor' => $appointment->doctor ? [
                    'name' => $appointment->doctor->name,
                    'specialization' => $appointment->doctor->specialization
                ] : null,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'reason' => $appointment->reason,
                'specialization' => $appointment->specialization,
                'appointment_type' => $appointment->type,
                'request_type' => $requestType, // NEW: Add request type
                'priority' => $appointment->priority ?? $appointment->urgency ?? 'normal',
                'urgency' => $appointment->urgency ?? $appointment->priority ?? 'normal',
                'status' => $appointment->status,
                'requested_date' => $appointment->date,
                'requested_time' => $appointment->time,
                'message' => $appointment->reason,
                'created_at' => $appointment->created_at->format('Y-m-d'),
                'updated_at' => $appointment->updated_at->format('Y-m-d')
            ];
        });
        
        return response()->json([
            'student_requests' => $requests,
            'summary' => [
                'total' => $requests->count(),
                'pending' => $requests->where('status', 'pending')->count(),
                'under_review' => $requests->where('status', 'under_review')->count(),
                'approved' => $requests->where('status', 'approved')->count(),
                'assigned' => $requests->where('status', 'assigned')->count(),
            ]
        ]);
    } catch (\Exception $e) {
        \Log::error('Error loading student requests: ' . $e->getMessage());
        return response()->json(['message' => 'Failed to load student requests'], 500);
    }
}

    /**
     * Schedule a new appointment
     */
    public function createAppointment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'doctor_id' => 'required|exists:users,id',
            'date' => 'required|date|after:today',
            'time' => 'required|date_format:H:i',
            'type' => 'required|in:consultation,follow_up,vaccination,blood_test,physical_therapy,emergency',
            'duration' => 'required|integer|min:15|max:180',
            'room' => 'sometimes|string|max:50',
            'reason' => 'required|string|max:500',
            'priority' => 'required|in:normal,high,urgent',
            'special_instructions' => 'nullable|string|max:1000'
        ]);

        $appointment = Appointment::create($validated);
        
        return response()->json([
            'message' => 'Appointment scheduled successfully',
            'appointment' => $appointment,
            'scheduled_by' => $request->user()->name,
        ], 201);
    }

    /**
 * Update an existing appointment (for clinical staff)
 */
// Add this to ClinicalStaffController.php
public function updateAppointment(Request $request, $id): JsonResponse
{
    $appointment = Appointment::findOrFail($id);
    
    $validated = $request->validate([
        'date' => 'sometimes|date',
        'time' => 'sometimes|date_format:H:i',
        'reason' => 'sometimes|string|max:500',
        'status' => 'sometimes|in:scheduled,confirmed,in_progress,completed,cancelled',
        'priority' => 'sometimes|in:normal,high,urgent',
        'room' => 'sometimes|string|max:50',
    ]);

    // Clinical staff can't change doctor or patient assignments
    if ($request->has('doctor_id') || $request->has('patient_id')) {
        return response()->json([
            'message' => 'Clinical staff cannot reassign doctors or patients',
            'error_code' => 'INVALID_UPDATE'
        ], 403);
    }

    $appointment->update($validated);
    
    return response()->json([
        'message' => 'Appointment updated successfully',
        'appointment' => $appointment->load(['patient', 'doctor'])
    ]);
}

/**
 * Delete an appointment
 */
public function deleteAppointment($id): JsonResponse
{
    $appointment = Appointment::findOrFail($id);
    
    // Only allow deletion of future appointments or those not in progress
    if ($appointment->status === 'in_progress') {
        return response()->json([
            'message' => 'Cannot delete appointment in progress'
        ], 400);
    }
    
    $appointment->delete();
    
    return response()->json([
        'message' => 'Appointment deleted successfully'
    ]);
}

    /**
     * Get medical record for viewing
     */
    public function getMedicalRecord(Request $request, $recordId): JsonResponse
    {
        $record = MedicalRecord::with(['patient', 'doctor', 'creator'])
            ->findOrFail($recordId);
            
        return response()->json($record);
    }

    /**
 * Get all medications (not just schedule)
 */
public function getMedications(Request $request): JsonResponse
{
    $query = MedicalRecord::where('type', 'medication')
        ->with(['patient', 'doctor']);
        
    if ($request->has('patient_id')) {
        $query->where('patient_id', $request->patient_id);
    }
    
    $medications = $query->get()->map(function($record) {
        return [
            'id' => $record->id,
            'patient' => [
                'id' => $record->patient->id,
                'name' => $record->patient->name,
                'student_id' => $record->patient->student_id
            ],
            'medication' => $record->content['medication_name'],
            'dosage' => $record->content['dosage'],
            'route' => $record->content['route'],
            'status' => $record->content['status'] ?? 'pending',
            'prescribing_doctor' => $record->doctor->name,
            'administered_by' => $record->creator->name,
            'administered_at' => $record->created_at
        ];
    });
    
    return response()->json([
        'medications' => $medications
    ]);
}

    /**
     * Record medication administration
     */
    /**
 * Record medication administration
 */
public function recordMedication(Request $request, $patientId): JsonResponse
{
    $validated = $request->validate([
        'medication_name' => 'required|string|max:255',
        'dosage' => 'required|string|max:100',
        'route' => 'required|in:oral,injection,topical,inhalation,iv,im,sc',
        'administration_time' => 'required|date',
        'prescribing_doctor' => 'required|string|max:255',
        'notes' => 'nullable|string|max:1000',
        'doctor_id' => 'sometimes|exists:users,id'
    ]);

    // Get doctor ID - either from request or find from today's appointment
    $doctorId = $validated['doctor_id'] ?? null;
    
    if (!$doctorId) {
        $todayAppointment = Appointment::where('patient_id', $patientId)
            ->whereDate('date', now()->format('Y-m-d'))
            ->whereIn('status', ['confirmed', 'in_progress', 'scheduled'])
            ->first();
            
        $doctorId = $todayAppointment ? $todayAppointment->doctor_id : $request->user()->id;
    }

    // Remove doctor_id from content as it's stored separately
    $content = $validated;
    unset($content['doctor_id']);
    
    // Add status and administration info to content
    $content['status'] = 'administered';
    $content['administered_by'] = $request->user()->name;
    $content['administered_at'] = now();

    $record = MedicalRecord::create([
        'patient_id' => $patientId,
        'doctor_id' => $doctorId,
        'type' => 'medication',
        'content' => $content,
        'diagnosis' => 'Medication Administration',
        'treatment' => $validated['medication_name'] . ' - ' . $validated['dosage'],
        'notes' => $validated['notes'],
        'visit_date' => now()->format('Y-m-d'),
        'created_by' => $request->user()->id
    ]);
    

    // ✅ ADD BROADCASTING
    broadcast(new \App\Events\DashboardStatsUpdated('medical-staff', [
        'medications_administered_today' => MedicalRecord::where('type', 'medication')
            ->whereDate('created_at', now())->count(),
        'total_medical_records' => MedicalRecord::count()
    ]));


    return response()->json([
        'message' => __('messages.medication_recorded'), // ✅ Localized
        'record' => $record->load(['patient', 'doctor', 'creator']),
    ], 201);
}

    /**
 * Add medication to the system
 */
public function addMedication(Request $request): JsonResponse
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'generic_name' => 'nullable|string|max:255',
        'dosage' => 'required|string|max:100',
        'frequency' => 'required|in:daily,twice_daily,weekly,as_needed',
        'start_date' => 'required|date',
        'end_date' => 'nullable|date|after:start_date',
        'instructions' => 'nullable|string|max:1000',
        'status' => 'required|in:active,discontinued,completed',
        'patient_id' => 'nullable|exists:users,id'
    ]);

    // If no specific patient, create as a general medication template
    $medication = Medication::create([
        'name' => $validated['name'],
        'generic_name' => $validated['generic_name'],
        'dosage' => $validated['dosage'],
        'frequency' => $validated['frequency'],
        'start_date' => $validated['start_date'],
        'end_date' => $validated['end_date'],
        'instructions' => $validated['instructions'],
        'status' => $validated['status'],
        'patient_id' => $validated['patient_id'] ?? null,
        'created_by' => $request->user()->id
    ]);
    
    return response()->json([
        'message' => 'Medication added successfully',
        'medication' => $medication
    ], 201);
}

/**
 * Update medication
 */
public function updateMedication(Request $request, $id): JsonResponse
{
    $medication = Medication::findOrFail($id);
    
    $validated = $request->validate([
        'name' => 'sometimes|string|max:255',
        'generic_name' => 'sometimes|string|max:255',
        'dosage' => 'sometimes|string|max:100',
        'frequency' => 'sometimes|in:daily,twice_daily,weekly,as_needed',
        'start_date' => 'sometimes|date',
        'end_date' => 'sometimes|date|after:start_date',
        'instructions' => 'sometimes|string|max:1000',
        'status' => 'sometimes|in:active,discontinued,completed'
    ]);
    
    $medication->update($validated);
    
    return response()->json([
        'message' => 'Medication updated successfully',
        'medication' => $medication
    ]);
}

/**
 * Delete medication
 */
public function deleteMedication($id): JsonResponse
{
    $medication = Medication::findOrFail($id);
    
    // Check if medication is currently being administered
    if ($medication->status === 'active') {
        // Soft delete by changing status instead of actual deletion
        $medication->update(['status' => 'discontinued']);
        $message = 'Medication discontinued successfully';
    } else {
        $medication->delete();
        $message = 'Medication deleted successfully';
    }
    
    return response()->json([
        'message' => $message
    ]);
}

/**
 * Get medication schedule with better structure
 */
public function getMedicationSchedule(Request $request): JsonResponse
{
    $date = $request->get('date', now()->format('Y-m-d'));
    
    // Get medications for the specified date
    $medications = Medication::with(['patient', 'creator'])
        ->where('status', 'active')
        ->whereDate('start_date', '<=', $date)
        ->where(function($query) use ($date) {
            $query->whereNull('end_date')
                  ->orWhereDate('end_date', '>=', $date);
        })
        ->get()
        ->map(function($medication) {
            return [
                'id' => $medication->id,
                'medication_name' => $medication->name, // Match frontend expectation
                'generic' => $medication->generic_name,  // Match frontend expectation
                'dosage' => $medication->dosage,
                'frequency' => $medication->frequency,
                'start_date' => $medication->start_date,
                'end_date' => $medication->end_date,
                'instructions' => $medication->instructions,
                'status' => $medication->status,
                'patient' => $medication->patient ? [
                    'id' => $medication->patient->id,
                    'name' => $medication->patient->name,
                    'student_id' => $medication->patient->student_id
                ] : null,
                'created_by' => $medication->creator ? $medication->creator->name : null
            ];
        });
    
    return response()->json([
        'medications' => $medications,
        'date' => $date,
        'summary' => [
            'total' => $medications->count(),
            'active' => $medications->where('status', 'active')->count()
        ]
    ]);
}

/**
 * Check vital signs for alerts
 */
private function checkVitalSignsAlerts(array $vitals): array
{
    $alerts = [];
    
    // Blood pressure alerts
    if (isset($vitals['blood_pressure_systolic']) && isset($vitals['blood_pressure_diastolic'])) {
        $systolic = $vitals['blood_pressure_systolic'];
        $diastolic = $vitals['blood_pressure_diastolic'];
        
        if ($systolic >= 140 || $diastolic >= 90) {
            $alerts[] = [
                'type' => 'HIGH_BLOOD_PRESSURE',
                'message' => 'Blood pressure is elevated',
                'severity' => 'warning'
            ];
        } elseif ($systolic < 90 || $diastolic < 60) {
            $alerts[] = [
                'type' => 'LOW_BLOOD_PRESSURE',
                'message' => 'Blood pressure is low',
                'severity' => 'warning'
            ];
        }
    }
    
    // Heart rate alerts
    if (isset($vitals['heart_rate'])) {
        $heartRate = $vitals['heart_rate'];
        
        if ($heartRate > 100) {
            $alerts[] = [
                'type' => 'HIGH_HEART_RATE',
                'message' => 'Heart rate is elevated (tachycardia)',
                'severity' => 'warning'
            ];
        } elseif ($heartRate < 60) {
            $alerts[] = [
                'type' => 'LOW_HEART_RATE',
                'message' => 'Heart rate is low (bradycardia)',
                'severity' => 'warning'
            ];
        }
    }
    
    // Temperature alerts (assuming Celsius)
    if (isset($vitals['temperature'])) {
        $temp = $vitals['temperature'];
        $unit = $vitals['temperature_unit'] ?? 'C';
        
        if ($unit === 'C') {
            if ($temp >= 38.0) {
                $alerts[] = [
                    'type' => 'FEVER',
                    'message' => 'Patient has fever',
                    'severity' => 'warning'
                ];
            } elseif ($temp <= 35.0) {
                $alerts[] = [
                    'type' => 'HYPOTHERMIA',
                    'message' => 'Patient has low body temperature',
                    'severity' => 'critical'
                ];
            }
        }
    }
    
    // Oxygen saturation alerts
    if (isset($vitals['oxygen_saturation'])) {
        $o2sat = $vitals['oxygen_saturation'];
        
        if ($o2sat < 95) {
            $alerts[] = [
                'type' => 'LOW_OXYGEN',
                'message' => 'Oxygen saturation is low',
                'severity' => $o2sat < 90 ? 'critical' : 'warning'
            ];
        }
    }
    
    return $alerts;
}


   // KEEP THIS VERSION (the one at the end of the file):
public function updateVitalSigns(Request $request, $patientId): JsonResponse
{
    \Log::info('=== VITAL SIGNS REQUEST RECEIVED ===', [
        'patient_id' => $patientId,
        'request_data' => $request->all(),
        'full_url' => $request->fullUrl(),
        'method' => $request->method()
    ]);

    // Add debugging to see which controller method is being called
    \Log::debug('Controller method called: ' . __METHOD__);
    \Log::debug('Controller file: ' . __FILE__);
    
    $validated = $request->validate([
        'blood_pressure' => 'sometimes|string|max:20',
        'blood_pressure_systolic' => 'required|integer|min:60|max:250',
        'blood_pressure_diastolic' => 'required|integer|min:40|max:150',
        'heart_rate' => 'required|integer|min:30|max:200',
        'temperature' => 'required|numeric|min:30|max:45',
        'temperature_unit' => 'required|in:F,C',
        'respiratory_rate' => 'nullable|integer|min:8|max:40',
        'oxygen_saturation' => 'nullable|integer|min:70|max:100',
        'weight' => 'nullable|numeric|min:10|max:300',
        'height' => 'nullable|numeric|min:50|max:250',
        'notes' => 'nullable|string|max:500',
        'doctor_id' => 'sometimes|exists:users,id'
    ]);

    \Log::info('Validation passed', ['validated' => $validated]);

    $doctorId = $validated['doctor_id'] ?? null;
    
    if (!$doctorId) {
        $todayAppointment = Appointment::where('patient_id', $patientId)
            ->whereDate('date', now()->format('Y-m-d'))
            ->whereIn('status', ['confirmed', 'in_progress', 'scheduled'])
            ->first();
            
        $doctorId = $todayAppointment ? $todayAppointment->doctor_id : null;
        \Log::info('Doctor ID resolved', ['doctor_id' => $doctorId]);
    }

    // Calculate BMI if weight and height are provided
    $bmi = null;
    if (isset($validated['weight']) && isset($validated['height']) && $validated['height'] > 0) {
        $heightInMeters = $validated['height'] / 100; // Convert cm to meters
        $bmi = $validated['weight'] / ($heightInMeters * $heightInMeters);
        \Log::info('BMI calculated', ['weight' => $validated['weight'], 'height' => $validated['height'], 'bmi' => $bmi]);
    }

    // Handle blood_pressure string format
    if (isset($validated['blood_pressure']) && !isset($validated['blood_pressure_systolic'])) {
        $bp = explode('/', $validated['blood_pressure']);
        if (count($bp) === 2) {
            $validated['blood_pressure_systolic'] = (int)$bp[0];
            $validated['blood_pressure_diastolic'] = (int)$bp[1];
        }
    }

    // Prepare content - remove fields that should NOT be in content
    $contentData = $validated;
    unset($contentData['doctor_id']);
    $notes = $contentData['notes'] ?? null;
    unset($contentData['notes']);

    \Log::info('Prepared data for saving', [
        'patient_id' => $patientId,
        'doctor_id' => $doctorId,
        'content_data' => $contentData,
        'notes' => $notes,
        'created_by' => $request->user()->id
    ]);

    try {
        // Log the data that will be saved
        \Log::info('Attempting to create MedicalRecord with:', [
            'blood_pressure' => isset($validated['blood_pressure_systolic'], $validated['blood_pressure_diastolic']) 
                ? $validated['blood_pressure_systolic'] . '/' . $validated['blood_pressure_diastolic']
                : null,
            'heart_rate' => isset($validated['heart_rate']) ? (int)$validated['heart_rate'] : null,
            'temperature' => $validated['temperature'] ?? null,
            'respiratory_rate' => isset($validated['respiratory_rate']) ? (int)$validated['respiratory_rate'] : null,
            'oxygen_saturation' => isset($validated['oxygen_saturation']) ? (int)$validated['oxygen_saturation'] : null,
            'weight' => $validated['weight'] ?? null,
            'height' => $validated['height'] ?? null,
            'bmi' => $bmi,
        ]);

        // Create the record
        $record = MedicalRecord::create([
            'patient_id' => $patientId,
            'doctor_id' => $doctorId,
            'type' => 'vital_signs',
            'content' => $contentData,
            'diagnosis' => 'Vital signs recording',
            'treatment' => 'N/A',
            'notes' => $notes,
            'visit_date' => now()->format('Y-m-d'),
            'created_by' => $request->user()->id,
            
            // ✅ FIXED DATABASE COLUMN ASSIGNMENTS WITH PROPER TYPECASTING
            'blood_pressure' => isset($validated['blood_pressure_systolic'], $validated['blood_pressure_diastolic']) 
                ? $validated['blood_pressure_systolic'] . '/' . $validated['blood_pressure_diastolic']
                : null,
            'heart_rate' => isset($validated['heart_rate']) ? (int)$validated['heart_rate'] : null,
            'temperature' => $validated['temperature'] ?? null,
            'respiratory_rate' => isset($validated['respiratory_rate']) ? (int)$validated['respiratory_rate'] : null,
            'oxygen_saturation' => isset($validated['oxygen_saturation']) ? (int)$validated['oxygen_saturation'] : null,
            'weight' => $validated['weight'] ?? null,
            'height' => $validated['height'] ?? null,
            'bmi' => $bmi,
        ]);

        \Log::info('Record created with ID: ' . $record->id);

        // Immediately fetch it back to verify
        $verifyRecord = MedicalRecord::find($record->id);
        
        \Log::info('=== VERIFICATION CHECK ===', [
            'record_id' => $verifyRecord->id,
            'blood_pressure' => $verifyRecord->blood_pressure,
            'heart_rate' => $verifyRecord->heart_rate,
            'temperature' => $verifyRecord->temperature,
            'respiratory_rate' => $verifyRecord->respiratory_rate,
            'oxygen_saturation' => $verifyRecord->oxygen_saturation,
            'weight' => $verifyRecord->weight,
            'height' => $verifyRecord->height,
            'bmi' => $verifyRecord->bmi,
            'content_is_null' => is_null($verifyRecord->content),
            'content_is_array' => is_array($verifyRecord->content),
        ]);

        // Also check the raw database values
        $rawRecord = DB::table('medical_records')->where('id', $record->id)->first();
        \Log::info('=== RAW DATABASE VALUES ===', [
            'blood_pressure' => $rawRecord->blood_pressure ?? 'NULL',
            'heart_rate' => $rawRecord->heart_rate ?? 'NULL',
            'temperature' => $rawRecord->temperature ?? 'NULL',
            'respiratory_rate' => $rawRecord->respiratory_rate ?? 'NULL',
            'oxygen_saturation' => $rawRecord->oxygen_saturation ?? 'NULL',
            'weight' => $rawRecord->weight ?? 'NULL',
            'height' => $rawRecord->height ?? 'NULL',
            'bmi' => $rawRecord->bmi ?? 'NULL',
        ]);

        if (is_null($verifyRecord->content)) {
            \Log::error('CRITICAL: Content saved as NULL!');
        }

        return response()->json([
            'message' => 'Vital signs recorded successfully',
            'record' => $record->load(['patient', 'doctor']),
            'debug_info' => [
                'db_id' => $record->id,
                'blood_pressure_saved' => !is_null($verifyRecord->blood_pressure),
                'heart_rate_saved' => !is_null($verifyRecord->heart_rate),
                'temperature_saved' => !is_null($verifyRecord->temperature),
                'all_fields' => [
                    'blood_pressure' => $verifyRecord->blood_pressure,
                    'heart_rate' => $verifyRecord->heart_rate,
                    'temperature' => $verifyRecord->temperature,
                    'respiratory_rate' => $verifyRecord->respiratory_rate,
                    'oxygen_saturation' => $verifyRecord->oxygen_saturation,
                    'weight' => $verifyRecord->weight,
                    'height' => $verifyRecord->height,
                    'bmi' => $verifyRecord->bmi,
                ]
            ],
            'alerts' => $this->checkVitalSignsAlerts($contentData)
        ], 201);

    } catch (\Exception $e) {
        \Log::error('Error creating vital signs record', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'request_data' => $request->all(),
            'patient_id' => $patientId
        ]);
        
        return response()->json([
            'message' => 'Failed to record vital signs',
            'error' => $e->getMessage(),
            'request_data' => $request->all()
        ], 500);
    }
}


/**
 * Create or update a student medical card
 */
public function updateMedicalCard(Request $request, $studentId): JsonResponse
{
    $validated = $request->validate([
        'emergency_contact' => 'required|array',
        'emergency_contact.name' => 'required|string|max:255',
        'emergency_contact.relationship' => 'required|string|max:255',
        'emergency_contact.phone' => 'required|string|max:20',
        'emergency_contact.email' => 'nullable|email|max:255',
        'medical_history' => 'nullable|array',
        'current_medications' => 'nullable|array',
        'allergies' => 'nullable|array',
        'previous_conditions' => 'nullable|array',
        'family_history' => 'nullable|array',
        'insurance_info' => 'nullable|array',
        'insurance_info.provider' => 'nullable|string|max:255',
        'insurance_info.policy_number' => 'nullable|string|max:255',
        'insurance_info.expiry' => 'nullable|date',
    ]);

    $student = User::findOrFail($studentId);
    
    // Create or update medical card
    $medicalCard = $student->medicalCard()->updateOrCreate(
        ['user_id' => $studentId],
        $validated
    );
    
    return response()->json([
        'message' => 'Medical card updated successfully',
        'medical_card' => $medicalCard,
        'updated_by' => $request->user()->name,
    ]);
}

/**
 * Upload medical documents
 */
// In MedicalDocumentController.php
public function uploadMedicalDocument(Request $request, $patientId)
{
    $validated = $request->validate([
        'document_type' => 'required|in:vaccination,lab_result,prescription,imaging,report',
        'file' => 'required|file|mimes:pdf,jpg,png,doc,docx|max:10240',
        'date' => 'required|date',
        'description' => 'nullable|string|max:500'
    ]);

    $filePath = $request->file('file')->store('medical_documents');

    $document = MedicalDocument::create([
        'patient_id' => $patientId,
        'type' => $validated['document_type'],
        'file_path' => $filePath,
        'document_date' => $validated['date'],
        'description' => $validated['description'] ?? null,
        'uploaded_by' => auth()->id()
    ]);

    return response()->json([
        'message' => 'Document uploaded successfully',
        'document' => $document
    ], 201);
}

/**
 * Get medical card information
 */
/**
 * Get medical card information - FIXED VERSION
 */
public function getMedicalCard($studentId): JsonResponse
{
    try {
        // Load patient with all relationships
        $patient = User::with(['medicalCard', 'medicalDocuments'])->findOrFail($studentId);
        
        \Log::info('Loading medical card for patient', [
            'patient_id' => $studentId,
            'has_medical_card' => !is_null($patient->medicalCard),
        ]);
        
        // Format date of birth properly
        $dateOfBirth = null;
        if ($patient->date_of_birth) {
            try {
                $dateOfBirth = \Carbon\Carbon::parse($patient->date_of_birth)->format('Y-m-d');
            } catch (\Exception $e) {
                \Log::warning("Could not parse date of birth for patient {$studentId}");
                $dateOfBirth = $patient->date_of_irth; // Keep original if parsing fails
            }
        }
        
        // Calculate age
        $age = null;
        if ($patient->date_of_birth) {
            try {
                $age = \Carbon\Carbon::parse($patient->date_of_birth)->age;
            } catch (\Exception $e) {
                \Log::warning("Could not calculate age for patient {$studentId}");
            }
        }
        
        // Build emergency contact from user fields
        $emergencyContact = [
            'name' => $patient->emergency_contact_name ?? 'Not recorded',
            'phone' => $patient->emergency_contact_phone ?? 'Not recorded',
            'relationship' => $patient->emergency_contact_relationship ?? 'Not specified',
            'email' => $patient->emergency_contact_email ?? 'Not recorded'
        ];
        
        // Override with medical card if it has data
        if ($patient->medicalCard && !empty($patient->medicalCard->emergency_contact)) {
            $cardEmergencyContact = is_array($patient->medicalCard->emergency_contact) 
                ? $patient->medicalCard->emergency_contact 
                : json_decode($patient->medicalCard->emergency_contact, true);
            
            if (is_array($cardEmergencyContact)) {
                $emergencyContact = array_merge($emergencyContact, array_filter($cardEmergencyContact));
            }
        }
        
        // Parse allergies
        $allergiesList = [];
        $hasKnownAllergies = (bool)($patient->has_known_allergies ?? false);
        $allergiesUncertain = (bool)($patient->allergies_uncertain ?? false);
        
        if ($hasKnownAllergies && !empty($patient->allergies)) {
            $allergiesList = $this->parseArrayField($patient->allergies);
        } elseif ($patient->medicalCard && !empty($patient->medicalCard->allergies)) {
            $allergiesList = $this->parseArrayField($patient->medicalCard->allergies);
        }
        
        // Parse medical history
        $medicalHistoryList = [];
        if (!empty($patient->medical_history)) {
            $medicalHistoryList = $this->parseArrayField($patient->medical_history);
        } elseif ($patient->medicalCard && !empty($patient->medicalCard->previous_conditions)) {
            $medicalHistoryList = $this->parseArrayField($patient->medicalCard->previous_conditions);
        }
        
        // Get blood type
        $bloodType = $patient->blood_type ?? 
                     ($patient->medicalCard->blood_type ?? 'Unknown');
        
        // Build comprehensive medical card data
        $medicalCardData = [
            'blood_type' => $bloodType,
            'emergency_contact' => $emergencyContact,
            'allergies' => $allergiesList,
            'has_known_allergies' => $hasKnownAllergies,
            'allergies_uncertain' => $allergiesUncertain,
            'current_medications' => $patient->medicalCard 
                ? $this->parseArrayField($patient->medicalCard->current_medications) 
                : [],
            'previous_conditions' => $medicalHistoryList,
            'family_history' => $patient->medicalCard 
                ? $this->parseArrayField($patient->medicalCard->family_history) 
                : [],
            'insurance_info' => $patient->medicalCard && !empty($patient->medicalCard->insurance_info)
                ? (is_array($patient->medicalCard->insurance_info) 
                    ? $patient->medicalCard->insurance_info 
                    : json_decode($patient->medicalCard->insurance_info, true))
                : null,
            'addictions' => $patient->addictions ?? 'None recorded',
        ];
        
        // Determine if patient is staff or student
        $isStaff = $patient->role === 'academic_staff';
        
        return response()->json([
            'student' => [
                'id' => $patient->id,
                'name' => $patient->name ?? 'Not recorded',
                'role' => $patient->role ?? 'student',
                'student_id' => $patient->student_id ?? null,
                'staff_no' => $patient->staff_no ?? null,
                'email' => $patient->email ?? 'Not recorded',
                'phone' => $patient->phone ?? 'Not recorded',
                'date_of_birth' => $dateOfBirth,
                'age' => $age,
                'gender' => $patient->gender ?? 'Not specified',
                'department' => $patient->department ?? 'Not recorded',
                'bio' => $patient->bio ?? null,
                
                // Include all medical fields directly
                'blood_type' => $bloodType,
                'allergies' => $patient->allergies,
                'has_known_allergies' => $hasKnownAllergies,
                'allergies_uncertain' => $allergiesUncertain,
                'addictions' => $patient->addictions,
                'medical_history' => $patient->medical_history,
                'emergency_contact_name' => $patient->emergency_contact_name,
                'emergency_contact_phone' => $patient->emergency_contact_phone,
                'emergency_contact_relationship' => $patient->emergency_contact_relationship,
                'emergency_contact_email' => $patient->emergency_contact_email,
            ],
            'medical_card' => $medicalCardData,
            'documents' => $patient->medicalDocuments->map(function($doc) {
                return [
                    'id' => $doc->id,
                    'type' => $doc->type,
                    'description' => $doc->description,
                    'date' => $doc->document_date,
                    'uploaded_at' => $doc->created_at,
                    'uploaded_by' => $doc->uploader->name ?? 'Unknown',
                ];
            }),
        ]);
    } catch (\Exception $e) {
        \Log::error('Error loading medical card: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'message' => 'Failed to load medical card',
            'error' => $e->getMessage()
        ], 500);
    }
}


/**
 * Get current shift information
 */
private function getCurrentShift(): string
{
    $hour = now()->hour;
    
    if ($hour >= 6 && $hour < 14) {
        return 'Morning Shift (6 AM - 2 PM)';
    } elseif ($hour >= 14 && $hour < 22) {
        return 'Afternoon Shift (2 PM - 10 PM)';
    } else {
        return 'Night Shift (10 PM - 6 AM)';
    }
}

public function storeMedicalCard(Request $request, $userId)
{
    $validated = $request->validate([
        'emergency_contact' => 'required|array',
        'medical_history' => 'nullable|array',
        'current_medications' => 'nullable|array',
        'allergies' => 'nullable|array',
        'previous_conditions' => 'nullable|array',
        'family_history' => 'nullable|array',
        'insurance_info' => 'nullable|array',
    ]);

    // Add user_id to the validated data
    $validated['user_id'] = $userId;

    $medicalCard = MedicalCard::create($validated);

    return response()->json([
        'message' => 'Medical card created successfully',
        'data' => $medicalCard
    ], 201);
}
    /**
     * Get patient care tasks
     */
    public function getCareTasks(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all');
        
        $query = MedicalRecord::where('type', 'task')
            ->whereDate('created_at', $date)
            ->with(['patient', 'creator']);
            
        if ($status !== 'all') {
            $query->where('content->status', $status);
        }
        
        $tasks = $query->get()->map(function($record) {
            return [
                'id' => $record->id,
                'patient' => [                'id' => $record->patient->id,
                'name' => $record->patient->name,
                'student_id' => $record->patient->student_id
            ],
            'task' => $record->content['task'],
            'priority' => $record->content['priority'] ?? 'medium',
            'status' => $record->content['status'] ?? 'pending',
            'due_time' => $record->content['due_time'] ?? null,
            'assigned_by' => $record->creator->name,
            'created_at' => $record->created_at
        ];
    });
    
    return response()->json([
        'tasks' => $tasks,
        'summary' => [
            'date' => $date,
            'total_tasks' => $tasks->count(),
            'pending' => $tasks->where('status', 'pending')->count(),
            'completed' => $tasks->where('status', 'completed')->count(),
            'overdue' => $tasks->where('status', 'pending')
                            ->filter(function($task) {
                                return $task['due_time'] && now()->gt($task['due_time']);
                            })->count()
        ]
    ]);
}

    /**
     * Create a new care task
     */
    public function createCareTask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'task' => 'required|string|max:500',
            'priority' => 'required|in:low,medium,high',
            'due_time' => 'required|date_format:Y-m-d H:i',
            'instructions' => 'nullable|string|max:1000'
        ]);

        $record = MedicalRecord::create([
            'patient_id' => $validated['patient_id'],
            'type' => 'task',
            'content' => [
                'task' => $validated['task'],
                'priority' => $validated['priority'],
                'status' => 'pending',
                'due_time' => $validated['due_time'],
                'instructions' => $validated['instructions'] ?? null
            ],
            'diagnosis' => 'Care Task',
            'treatment' => $validated['task'],
            'visit_date' => now()->format('Y-m-d'),
            'created_by' => $request->user()->id
        ]);
        
        return response()->json([
            'message' => 'Care task created successfully',
            'task' => $record->load(['patient', 'creator'])
        ], 201);
    }

    /**
     * Get patient vital signs history
     */
    public function getVitalSignsHistory(Request $request, $patientId): JsonResponse
    {
        $days = $request->get('days', 7);
        
        try {
            // First check if patient exists
            $patient = User::find($patientId);
            if (!$patient) {
                return response()->json([
                    'message' => 'Patient not found',
                    'vital_signs_history' => []
                ], 404);
            }

            \Log::info("Fetching vitals for patient {$patientId}, last {$days} days");
            
            $records = MedicalRecord::where('patient_id', $patientId)
                ->where('type', 'vital_signs')
                ->whereDate('created_at', '>=', now()->subDays($days))
                ->orderBy('created_at', 'desc')
                ->with(['creator'])
                ->get();
                
            \Log::info("Found {$records->count()} vital sign records");
            
            $mappedRecords = $records->map(function($record) {
                try {
                    // FIX: Properly handle JSON content - check if it's already an array
                    if (is_array($record->content)) {
                        $content = $record->content;
                    } elseif (is_string($record->content)) {
                        $content = json_decode($record->content, true);
                        if (json_last_error() !== JSON_ERROR_NONE) {
                            \Log::warning("JSON decode error for record {$record->id}: " . json_last_error_msg());
                            return null;
                        }
                    } else {
                        \Log::warning("Unexpected content type for record {$record->id}");
                        return null;
                    }
                    
                    // Handle missing data gracefully
                    $systolic = $content['blood_pressure_systolic'] ?? 0;
                    $diastolic = $content['blood_pressure_diastolic'] ?? 0;
                    $heartRate = $content['heart_rate'] ?? 0;
                    $temp = $content['temperature'] ?? 0;
                    $tempUnit = $content['temperature_unit'] ?? 'C';
                    
                    return [
                        'id' => $record->id,
                        'date' => $record->created_at->toISOString(),
                        'blood_pressure' => "{$systolic}/{$diastolic}",
                        'heart_rate' => $heartRate,
                        'temperature' => "{$temp}°{$tempUnit}",
                        'respiratory_rate' => $content['respiratory_rate'] ?? null,
                        'oxygen_saturation' => $content['oxygen_saturation'] ?? null,
                        'recorded_by' => $record->creator->name ?? 'Unknown',
                        'alerts' => $this->checkVitalSignsAlerts($content)
                    ];
                } catch (\Exception $e) {
                    \Log::error("Error processing record {$record->id}: " . $e->getMessage());
                    return null;
                }
            })->filter(); // Remove null entries
                
            return response()->json([
                'patient_id' => $patientId,
                'vital_signs_history' => $mappedRecords->values(), // Reset array keys
                'time_period' => "$days days",
                'summary' => [
                    'total_readings' => $mappedRecords->count(),
                    'abnormal_readings' => $mappedRecords->filter(fn($r) => !empty($r['alerts']))->count()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching vitals history: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to fetch vitals history',
                'error' => $e->getMessage(),
                'vital_signs_history' => []
            ], 500);
        }
    }

    
    /**
 * Get patient's medical card with complete user data
 * FIXED: Now properly retrieves all patient information for both students and academic staff
 */
public function getPatientMedicalCard(Request $request, $patientId): JsonResponse
{
    try {
        // Load patient with all relationships
        $patient = User::with(['medicalCard'])->findOrFail($patientId);
        
        \Log::info('Loading medical card for patient', [
            'patient_id' => $patientId,
            'role' => $patient->role,
            'has_medical_card' => !is_null($patient->medicalCard),
        ]);
        
        // Get latest vitals
        $latestVitals = MedicalRecord::where('patient_id', $patientId)
            ->where('type', 'vital_signs')
            ->orderBy('created_at', 'desc')
            ->with(['creator'])
            ->first();
        
        // Prepare vitals data if exists
        $vitalsData = null;
        if ($latestVitals) {
            $content = is_array($latestVitals->content) 
                ? $latestVitals->content 
                : (is_string($latestVitals->content) 
                    ? json_decode($latestVitals->content, true) 
                    : []);
            
            $systolic = $content['blood_pressure_systolic'] ?? 0;
            $diastolic = $content['blood_pressure_diastolic'] ?? 0;
            
            $vitalsData = [
                'date' => $latestVitals->created_at,
                'blood_pressure' => "{$systolic}/{$diastolic}",
                'heart_rate' => $content['heart_rate'] ?? null,
                'temperature' => ($content['temperature'] ?? '') . '°' . 
                                ($content['temperature_unit'] ?? 'C'),
                'respiratory_rate' => $content['respiratory_rate'] ?? null,
                'oxygen_saturation' => $content['oxygen_saturation'] ?? null,
                'recorded_by' => $latestVitals->creator->name ?? 'Unknown',
                'alerts' => $this->checkVitalSignsAlerts($content)
            ];
        }
        
        // ✅ FIX: Build emergency contact from ALL available user fields
        $emergencyContact = [
            'name' => $patient->emergency_contact_name ?? 'Not recorded',
            'phone' => $patient->emergency_contact_phone ?? 'Not recorded',
            'relationship' => $patient->emergency_contact_relationship ?? 'Not specified',
            'email' => $patient->emergency_contact_email ?? 'Not recorded'
        ];
        
        // Override with medical card if it has data
        if ($patient->medicalCard && !empty($patient->medicalCard->emergency_contact)) {
            $cardEmergencyContact = is_array($patient->medicalCard->emergency_contact) 
                ? $patient->medicalCard->emergency_contact 
                : json_decode($patient->medicalCard->emergency_contact, true);
            
            if (is_array($cardEmergencyContact)) {
                $emergencyContact = array_merge($emergencyContact, array_filter($cardEmergencyContact));
            }
        }
        
        // ✅ FIX: Build allergies list
        $allergiesList = [];
        $hasKnownAllergies = (bool)($patient->has_known_allergies ?? false);
        $allergiesUncertain = (bool)($patient->allergies_uncertain ?? false);
        
        if ($hasKnownAllergies && !empty($patient->allergies)) {
            $allergiesList = $this->parseArrayField($patient->allergies);
        } elseif ($patient->medicalCard && !empty($patient->medicalCard->allergies)) {
            $allergiesList = $this->parseArrayField($patient->medicalCard->allergies);
        }
        
        // ✅ FIX: Build medical history
        $medicalHistoryList = [];
        if (!empty($patient->medical_history)) {
            $medicalHistoryList = $this->parseArrayField($patient->medical_history);
        } elseif ($patient->medicalCard && !empty($patient->medicalCard->previous_conditions)) {
            $medicalHistoryList = $this->parseArrayField($patient->medicalCard->previous_conditions);
        }
        
        // ✅ FIX: Get blood type
        $bloodType = $patient->blood_type ?? 
                     ($patient->medicalCard->blood_type ?? 'Unknown');
        
        // Build comprehensive medical card data
        $medicalCardData = [
            'blood_type' => $bloodType,
            'emergency_contact' => $emergencyContact,
            'allergies' => $allergiesList,
            'has_known_allergies' => $hasKnownAllergies,
            'allergies_uncertain' => $allergiesUncertain,
            'current_medications' => $patient->medicalCard 
                ? $this->parseArrayField($patient->medicalCard->current_medications) 
                : [],
            'previous_conditions' => $medicalHistoryList,
            'family_history' => $patient->medicalCard 
                ? $this->parseArrayField($patient->medicalCard->family_history) 
                : [],
            'insurance_info' => $patient->medicalCard && !empty($patient->medicalCard->insurance_info)
                ? (is_array($patient->medicalCard->insurance_info) 
                    ? $patient->medicalCard->insurance_info 
                    : json_decode($patient->medicalCard->insurance_info, true))
                : null,
            'addictions' => $patient->addictions ?? 'None recorded',
            'chronic_conditions' => $patient->chronic_conditions ?? 'None recorded'
        ];
        
        // ✅ FIX: Calculate age properly
        $age = null;
        $dateOfBirth = $patient->date_of_birth ?? 'Not recorded';
        
        if ($patient->date_of_birth) {
            try {
                $age = \Carbon\Carbon::parse($patient->date_of_birth)->age;
            } catch (\Exception $e) {
                \Log::warning("Could not parse date of birth for patient {$patientId}");
            }
        }
        
        // ✅ FIX: Handle student_id vs staff_no based on role
        $identificationNumber = null;
        $identificationType = null;
        
        if ($patient->role === 'academic_staff') {
            $identificationNumber = $patient->staff_no ?? 'Not recorded';
            $identificationType = 'Staff Number';
        } else {
            $identificationNumber = $patient->student_id ?? 'Not recorded';
            $identificationType = 'Student ID';
        }
        
        return response()->json([
            'student' => [
                'id' => $patient->id,
                'name' => $patient->name ?? 'Not recorded',
                'role' => $patient->role ?? 'student',
                'identification_type' => $identificationType,
                'identification_number' => $identificationNumber,
                'student_id' => $patient->student_id ?? null,
                'staff_no' => $patient->staff_no ?? null,
                'email' => $patient->email ?? 'Not recorded',
                'phone' => $patient->phone ?? 'Not recorded',
                'date_of_birth' => $dateOfBirth,
                'age' => $age,
                'gender' => $patient->gender ?? 'Not specified',
                'department' => $patient->department ?? 'Not recorded',
                'bio' => $patient->bio ?? null,
            ],
            'medical_card' => $medicalCardData,
            'latest_vitals' => $vitalsData,
        ]);
    } catch (\Exception $e) {
        \Log::error('Error loading medical card: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'message' => 'Failed to load medical card',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Helper method to parse array fields
 */
private function parseArrayField($field): array
{
    if (empty($field)) {
        return [];
    }
    
    if (is_array($field)) {
        return array_filter($field);
    }
    
    if (is_string($field)) {
        $decoded = json_decode($field, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_filter($decoded);
        }
        
        $items = preg_split('/[,\n\r]+/', $field);
        return array_filter(array_map('trim', $items));
    }
    
    return [];
}

    /**
     * Get prescribed medications (from doctors) that need administration
     */
public function getPrescribedMedications(Request $request): JsonResponse
{
    try {
        // Get medications that need to be administered
        $medications = Medication::with(['patient', 'creator'])
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($medication) {
                return [
                    'id' => $medication->id,
                    'patient_id' => $medication->patient_id,
                    'patient_name' => $medication->patient ? $medication->patient->name : 'Unknown',
                    'medication_name' => $medication->name,
                    'generic_name' => $medication->generic_name,
                    'dosage' => $medication->dosage,
                    'route' => 'oral', // You may need to add this field to your medications table
                    'frequency' => $medication->frequency,
                    'prescribing_doctor' => $medication->creator ? $medication->creator->name : 'Unknown',
                    'prescribed_date' => $medication->created_at,
                    'start_date' => $medication->start_date,
                    'end_date' => $medication->end_date,
                    'status' => $medication->status,
                    'instructions' => $medication->instructions,
                    'notes' => $medication->instructions,
                ];
            });
        
        return response()->json([
            'medications' => $medications,
            'total' => $medications->count(),
            'pending' => $medications->where('status', 'active')->count(),
        ]);
    } catch (\Exception $e) {
        \Log::error('Error loading prescribed medications: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'message' => 'Failed to load medications',
            'error' => $e->getMessage(),
            'medications' => []
        ], 500);
    }
}

    /**
     * Administer a prescribed medication
     */
    public function administerPrescribedMedication(Request $request, $medicationId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'administered_by' => 'required|string',
                'administered_at' => 'required|date',
                'notes' => 'nullable|string|max:500'
            ]);
            
            $medication = MedicalRecord::findOrFail($medicationId);
            
            // Update medication status to administered
            $content = $medication->content;
            $content['status'] = 'administered';
            $content['administered_by'] = $validated['administered_by'];
            $content['administered_at'] = $validated['administered_at'];
            if (!empty($validated['notes'])) {
                $content['administration_notes'] = $validated['notes'];
            }
            
            $medication->content = $content;
            $medication->save();
            
            // Broadcast update
            try {
                broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
                    'medications_administered_today' => MedicalRecord::where('type', 'medication')
                        ->whereJsonContains('content->status', 'administered')
                        ->whereDate('updated_at', now())->count(),
                ]));
            } catch (\Exception $e) {
                \Log::warning('Failed to broadcast: ' . $e->getMessage());
            }
            
            return response()->json([
                'message' => 'Medication administered successfully',
                'medication' => $medication->load(['patient', 'doctor', 'creator'])
            ]);
        } catch (\Exception $e) {
            \Log::error('Error administering medication: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to administer medication',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    

    /**
     * Record minor treatment (for headaches, minor injuries, etc.)
     */
    public function recordMinorTreatment(Request $request, $patientId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'medication_name' => 'required|string|max:255',
                'dosage' => 'required|string|max:100',
                'route' => 'required|in:oral,topical,injection,inhalation,other',
                'reason' => 'required|string|max:500',
                'notes' => 'nullable|string|max:1000',
            ]);

            $patient = User::findOrFail($patientId);
            
            // Create medical record for minor treatment
            $content = [
                'medication_name' => $validated['medication_name'],
                'dosage' => $validated['dosage'],
                'route' => $validated['route'],
                'reason' => $validated['reason'],
                'treatment_type' => 'minor_treatment',
                'status' => 'administered',
                'administered_by' => $request->user()->name,
                'administered_at' => now(),
            ];
            
            if (!empty($validated['notes'])) {
                $content['notes'] = $validated['notes'];
            }
            
            $record = MedicalRecord::create([
                'patient_id' => $patientId,
                'doctor_id' => null, // Minor treatments don't require doctor
                'type' => 'medication',
                'content' => $content,
                'diagnosis' => 'Minor Treatment: ' . $validated['reason'],
                'treatment' => $validated['medication_name'] . ' - ' . $validated['dosage'],
                'notes' => $validated['notes'] ?? null,
                'visit_date' => now()->format('Y-m-d'),
                'created_by' => $request->user()->id
            ]);
            
            // Broadcast update
            try {
                broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
                    'minor_treatments_today' => MedicalRecord::where('type', 'medication')
                        ->whereJsonContains('content->treatment_type', 'minor_treatment')
                        ->whereDate('created_at', now())->count(),
                ]));
            } catch (\Exception $e) {
                \Log::warning('Failed to broadcast: ' . $e->getMessage());
            }
            
            return response()->json([
                'message' => 'Minor treatment recorded successfully',
                'record' => $record->load(['patient', 'creator']),
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error recording minor treatment: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to record treatment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all medications (prescribed + administered minor treatments)
     */
    public function getAllMedications(Request $request): JsonResponse
    {
        try {
            $query = MedicalRecord::where('type', 'medication')
                ->with(['patient', 'doctor', 'creator']);
            
            // Filter by status if provided
            if ($request->has('status')) {
                $query->whereJsonContains('content->status', $request->status);
            }
            
            // Filter by date range
            if ($request->has('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            
            if ($request->has('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }
            
            $medications = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function($record) {
                    return [
                        'id' => $record->id,
                        'patient_id' => $record->patient_id,
                        'patient_name' => $record->patient->name,
                        'medication_name' => $record->content['medication_name'],
                        'dosage' => $record->content['dosage'],
                        'route' => $record->content['route'],
                        'treatment_type' => $record->content['treatment_type'] ?? 'prescribed',
                        'status' => $record->content['status'] ?? 'unknown',
                        'prescribing_doctor' => $record->doctor ? $record->doctor->name : 'Clinical Staff',
                        'administered_by' => $record->content['administered_by'] ?? null,
                        'administered_at' => $record->content['administered_at'] ?? null,
                        'date' => $record->created_at,
                        'notes' => $record->notes,
                    ];
                });
            
            return response()->json([
                'medications' => $medications,
                'summary' => [
                    'total' => $medications->count(),
                    'pending' => $medications->where('status', 'pending')->count(),
                    'administered' => $medications->where('status', 'administered')->count(),
                    'minor_treatments' => $medications->where('treatment_type', 'minor_treatment')->count(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error loading all medications: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load medications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
 * Check if there are higher priority appointments blocking this one
 */
private function hasBlockingAppointments($appointmentId, $appointmentDate, $appointmentTime, $appointmentPriority): array
{
    $currentPriorityLevel = self::PRIORITY_LEVELS[$appointmentPriority] ?? self::PRIORITY_LEVELS['normal'];
    
    // ✅ FIX: Only check appointments with HIGHER priority (not equal)
    $blockingAppointments = Appointment::with(['patient'])
        ->where('id', '!=', $appointmentId)
        ->whereIn('status', ['pending', 'under_review', 'waiting'])
        ->where(function($query) use ($currentPriorityLevel) {
            // ✅ CRITICAL FIX: Only block if priority is STRICTLY HIGHER
            if ($currentPriorityLevel == self::PRIORITY_LEVELS['normal']) {
                // Normal: blocked by urgent OR high
                $query->whereIn('priority', ['urgent', 'high']);
            } elseif ($currentPriorityLevel == self::PRIORITY_LEVELS['high']) {
                // High: blocked by urgent ONLY
                $query->where('priority', 'urgent');
            } elseif ($currentPriorityLevel == self::PRIORITY_LEVELS['urgent']) {
                // Urgent: NEVER blocked by anything
                $query->whereRaw('1 = 0'); // Always returns empty
            }
        })
        ->get();

    return [
        'has_blocking' => $blockingAppointments->count() > 0,
        'count' => $blockingAppointments->count(),
        'blocking_appointments' => $blockingAppointments->map(function($apt) {
            return [
                'id' => $apt->id,
                'patient_name' => $apt->patient ? $apt->patient->name : 'Unknown Patient',
                'date' => $apt->date,
                'time' => $apt->time,
                'priority' => $apt->priority ?? 'normal',
                'status' => $apt->status
            ];
        })->values()
    ];
}
}