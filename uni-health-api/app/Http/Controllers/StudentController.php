<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\User;
use Carbon\Carbon;
use App\Rules\MinimumAge;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    /**
     * Student dashboard with comprehensive overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get student statistics from database
        $upcomingAppointments = Appointment::where('patient_id', $user->id)
                                          ->where('date', '>=', now()->toDateString())
                                          ->where('status', '!=', 'cancelled')
                                          ->count();

        // Get last medical checkup
        $lastCheckup = MedicalRecord::where('patient_id', $user->id)
                                   ->orderBy('created_at', 'desc')
                                   ->first();

        // Get next appointment
        $nextAppointment = Appointment::where('patient_id', $user->id)
                                     ->where('date', '>=', now()->toDateString())
                                     ->where('status', '!=', 'cancelled')
                                     ->orderBy('date', 'asc')
                                     ->orderBy('time', 'asc')
                                     ->with('doctor:id,name')
                                     ->first();

        return response()->json([
            'message' => 'Welcome to Student Dashboard',
            'student' => [
                'name' => $user->name,
                'student_id' => $user->student_id,
                'department' => $user->department,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
            ],
            'health_summary' => [
                'upcoming_appointments' => $upcomingAppointments,
                'last_checkup' => $lastCheckup ? $lastCheckup->created_at->format('Y-m-d') : 'No records found',
                'health_status' => 'Good',
            ],
            'quick_actions' => [
                'schedule_appointment',
                'view_medical_history',
                'update_profile',
                'view_appointments'
            ]
        ]);
    }

    /**
 * Get user profile data
 */
public function getProfile(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        
        // Ensure avatar_url is a full URL
        $avatarUrl = null;
        if ($user->avatar_url) {
            if (filter_var($user->avatar_url, FILTER_VALIDATE_URL)) {
                $avatarUrl = $user->avatar_url;
            } else {
                $avatarUrl = url($user->avatar_url);
            }
        }
        
        return response()->json([
            'student_id' => $user->student_id,
            'name' => $user->name,
            'email' => $user->email,
            'department' => $user->department,
            'phone_number' => $user->phone,
            'avatar_url' => $avatarUrl,
            'date_of_birth' => $user->date_of_birth,
            'emergency_contact_name' => $user->emergency_contact_name,
            'emergency_contact_phone' => $user->emergency_contact_phone,
            'emergency_contact_relationship' => $user->emergency_contact_relationship,
            'emergency_contact_email' => $user->emergency_contact_email,
            'blood_type' => $user->blood_type ?? 'Unknown',
            'gender' => $user->gender,
            'allergies' => $user->allergies,
            'has_known_allergies' => $user->has_known_allergies ?? false,
            'allergies_uncertain' => $user->allergies_uncertain ?? false,
            'addictions' => $user->addictions,
            'medical_history' => $user->medical_history,
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Profile fetch error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to fetch profile',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

// Add this method to StudentController
private function isProfileComplete($user): bool
{
    $requiredFields = [
        'name', 'email', 'department', 'phone', 
        'date_of_birth', 'emergency_contact_name', 
        'emergency_contact_phone', 'emergency_contact_relationship', // ADD
        'emergency_contact_email', 'blood_type', 'gender'           // ADD
    ];
    
    foreach ($requiredFields as $field) {
        if (empty($user->$field)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Upload profile avatar
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
            
            if (\Storage::disk('public')->exists($oldPath)) {
                \Storage::disk('public')->delete($oldPath);
            }
        }

        // Store new avatar
        $file = $request->file('avatar');
        $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $filename, 'public');
        
        // Create FULL URL for the avatar
        $avatarUrl = url('/storage/' . $path);
        
        // Update user record with FULL URL
        $user->update(['avatar_url' => $avatarUrl]);

        // Log for debugging
        \Log::info('Avatar uploaded', [
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
        \Log::error('Avatar upload error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to upload avatar',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

/**
 * Remove profile avatar - Add this new method
 */
public function removeAvatar(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        
        if ($user->avatar_url) {
            // Handle both relative and full URLs
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            $oldPath = str_replace(url('/storage/'), '', $user->avatar_url);
            
            if (\Storage::disk('public')->exists($oldPath)) {
                \Storage::disk('public')->delete($oldPath);
            }
            
            // Update user record
            $user->update(['avatar_url' => null]);
            
            \Log::info('Avatar removed', ['user_id' => $user->id]);
        }

        return response()->json([
            'message' => 'Avatar removed successfully'
        ]);

    } catch (\Exception $e) {
        \Log::error('Avatar removal error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to remove avatar',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

/**
 * Check if a date is a valid clinic day
 */
private function isClinicOpen(string $date): bool
{
    $dayOfWeek = \Carbon\Carbon::parse($date)->dayOfWeek;
    
    // Clinic is CLOSED on:
    // 0 = Sunday
    // 6 = Saturday
    // Clinic is OPEN Monday-Friday (1-5)
    
    return $dayOfWeek >= 1 && $dayOfWeek <= 5;
}

/**
 * Get the reason why clinic is closed on a specific date
 */
private function getClosureReason(string $date): string
{
    $dayOfWeek = \Carbon\Carbon::parse($date)->dayOfWeek;
    
    if ($dayOfWeek === 0) {
        return 'Clinic is closed on Sundays';
    }
    
    if ($dayOfWeek === 6) {
        return 'Clinic is closed on Saturdays';
    }
    
    return 'Clinic is not operating on this date';
}

/**
 * Update own profile - Enhanced version (without bio)
 */
public function updateProfile(Request $request): JsonResponse
{
    try {
        $minBirthDate = now()->subYears(16)->toDateString(); // Students must be 16+
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone_number' => 'sometimes|string|max:20|nullable',
            'department' => 'sometimes|string|max:255|nullable',
            'date_of_birth' => [
                'sometimes',
                'nullable',
                'date',
                'before_or_equal:' . $minBirthDate
            ],
            'emergency_contact_name' => 'sometimes|string|max:255|nullable',
            'emergency_contact_phone' => 'sometimes|string|max:20|nullable',
            'emergency_contact_relationship' => 'sometimes|string|max:100|nullable',
            'emergency_contact_email' => 'sometimes|email|max:255|nullable',
            'blood_type' => 'sometimes|nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-,Unknown',
            'gender' => 'sometimes|nullable|in:male,female,other,prefer_not_to_say',
            'allergies' => 'sometimes|string|nullable',
            'has_known_allergies' => 'sometimes|boolean',
            'allergies_uncertain' => 'sometimes|boolean',
            'addictions' => 'sometimes|string|nullable',
            'medical_history' => 'sometimes|string|max:1000|nullable',
        ], [
            'date_of_birth.before_or_equal' => 'Students must be at least 16 years old.',
        ]);

        // Age verification if date_of_birth is being updated
        if (isset($validated['date_of_birth'])) {
            $birthDate = \Carbon\Carbon::parse($validated['date_of_birth']);
            $age = $birthDate->diffInYears(now());
            
            if ($age < 16) {
                return response()->json([
                    'message' => 'Age requirement not met',
                    'errors' => [
                        'date_of_birth' => ['Students must be at least 16 years old. Current age: ' . $age . ' years.']
                    ]
                ], 422);
            }
        }

        $user = $request->user();
        
        // Map phone_number to phone field in database
        if (isset($validated['phone_number'])) {
            $validated['phone'] = $validated['phone_number'];
            unset($validated['phone_number']);
        }
        
        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'student_id' => $user->student_id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department,
                'phone_number' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'date_of_birth' => $user->date_of_birth,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'emergency_contact_relationship' => $user->emergency_contact_relationship,
                'emergency_contact_email' => $user->emergency_contact_email,
                'blood_type' => $user->blood_type,
                'gender' => $user->gender,
                'allergies' => $user->allergies,
                'has_known_allergies' => $user->has_known_allergies,
                'allergies_uncertain' => $user->allergies_uncertain,
                'addictions' => $user->addictions,
                'medical_history' => $user->medical_history,
            ]
        ]);

    } catch (\Illuminate\Validation\ValidationException $e) {
        // Log validation errors for debugging
        \Log::error('Profile update validation failed', [
            'user_id' => $request->user()->id,
            'errors' => $e->errors(),
            'input' => $request->except(['password', 'avatar'])
        ]);
        
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
     * Get student's appointments
     */
public function getAppointments(Request $request): JsonResponse
{
    $user = $request->user();
    $status = $request->get('status', 'all');

    $query = Appointment::where('patient_id', $user->id);

    // Filter by status
    switch ($status) {
        case 'upcoming':
            $query->where('date', '>=', now()->toDateString())
                  ->whereNotIn('status', ['cancelled', 'completed']);
            break;
        case 'past':
            $query->where('date', '<', now()->toDateString())
                  ->orWhere('status', 'completed');
            break;
        case 'cancelled':
            $query->where('status', 'cancelled');
            break;
    }

    $appointments = $query->with(['doctor:id,name,specialization,phone'])
                         ->orderBy('date', 'desc')
                         ->orderBy('time', 'desc')
                         ->get();

    return response()->json([
        'appointments' => $appointments->map(function ($appt) {
            return [
                'id' => $appt->id,
                'date' => $appt->date,
                'time' => $appt->time,
                'doctor' => $appt->doctor->name ?? 'To be assigned',
                // FIX: Show appointment specialization first, fallback to doctor specialization
                'specialty' => $appt->specialization ?? ($appt->doctor->specialization ?? 'General Medicine'),
                'status' => $appt->status,
                'reason' => $appt->reason,
                'notes' => $appt->notes,
                // FIX: Show correct urgency/priority (check both fields)
                'urgency' => $appt->urgency ?? $appt->priority ?? 'normal'
            ];
        }),
        'summary' => [
            'total' => $appointments->count(),
            'upcoming' => $appointments->where('date', '>=', now()->toDateString())->where('status', '!=', 'cancelled')->count(),
            'completed' => $appointments->where('status', 'completed')->count(),
            'cancelled' => $appointments->where('status', 'cancelled')->count()
        ]
    ]);
}

/**
 * Schedule a new appointment with clinic hours validation
 */
public function scheduleAppointment(Request $request): JsonResponse
{
    try {
        \Log::info('=== APPOINTMENT REQUEST START ===');
        \Log::info('Request data:', $request->all());

        $validated = $request->validate([
            'doctor_id' => 'nullable|exists:users,id',
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
            'urgency' => 'sometimes|in:normal,high,urgent'
        ]);

        \Log::info('Validation passed:', $validated);

        $validated['urgency'] = $validated['urgency'] ?? 'normal';

        // ✅ NEW: Check if clinic is open on selected date
        if (!$this->isClinicOpen($validated['date'])) {
            return response()->json([
                'message' => $this->getClosureReason($validated['date']),
                'errors' => [
                    'date' => [$this->getClosureReason($validated['date']) . '. Please select a weekday (Monday-Friday).']
                ]
            ], 422);
        }

        // ✅ NEW: Validate time is within clinic hours (9:00 AM - 5:00 PM)
        $selectedTime = \Carbon\Carbon::parse($validated['time']);
        $clinicOpen = \Carbon\Carbon::parse('09:00');
        $clinicClose = \Carbon\Carbon::parse('17:00');
        
        if ($selectedTime->lt($clinicOpen) || $selectedTime->gte($clinicClose)) {
            return response()->json([
                'message' => 'Selected time is outside clinic hours',
                'errors' => [
                    'time' => ['Clinic hours are 9:00 AM - 5:00 PM. Please select a time within operating hours.']
                ]
            ], 422);
        }

        // If doctor_id provided, verify the doctor exists
        if (!empty($validated['doctor_id'])) {
            $doctor = User::where('id', $validated['doctor_id'])
                ->where('role', 'doctor')
                ->first();

            if (!$doctor) {
                return response()->json([
                    'message' => 'Selected doctor not found or invalid',
                    'errors' => ['doctor_id' => ['Selected doctor is invalid']]
                ], 422);
            }
        }

        // Check if user already has an appointment that day
        $existingUserAppointment = Appointment::where('patient_id', $request->user()->id)
            ->where('date', $validated['date'])
            ->whereIn('status', ['scheduled', 'confirmed', 'pending'])
            ->first();

        if ($existingUserAppointment) {
            return response()->json([
                'message' => 'You already have an appointment scheduled for this date',
                'errors' => ['date' => ['Only one appointment per day is allowed']]
            ], 422);
        }

        // If doctor_id provided, check for time slot availability
        if (!empty($validated['doctor_id'])) {
            $existingDoctorAppointment = Appointment::where('doctor_id', $validated['doctor_id'])
                ->where('date', $validated['date'])
                ->where('time', $validated['time'])
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->first();

            if ($existingDoctorAppointment) {
                return response()->json([
                    'message' => 'Doctor is not available at this time',
                    'errors' => ['time' => ['This time slot is already booked']]
                ], 422);
            }
        }

        // Create appointment
        $appointment = Appointment::create([
            'patient_id' => $request->user()->id,
            'doctor_id' => $validated['doctor_id'] ?? null,
            'date' => $validated['date'],
            'time' => $validated['time'],
            'reason' => $validated['reason'],
            'urgency' => $validated['urgency'],
            'priority' => $validated['urgency'],
            'status' => 'pending',
            'type' => 'student_request'
        ]);

        \Log::info('Appointment created:', $appointment->toArray());

        // Try to broadcast
        try {
            broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
                'pending_student_requests' => Appointment::whereIn('status', ['pending', 'under_review'])->count()
            ]));
        } catch (\Exception $e) {
            \Log::warning('Failed to broadcast appointment creation: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Appointment request submitted successfully. Awaiting clinical staff approval.',
            'appointment' => $appointment
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        \Log::error('Validation error:', $e->errors());
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        \Log::error('Appointment creation error:', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        
        return response()->json([
            'message' => 'Failed to create appointment request',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Cancel an existing appointment
 */
public function cancelAppointment(Request $request, Appointment $appointment): JsonResponse
{
    try {
        // Check if user owns this appointment
        if ($appointment->patient_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized to modify this appointment'
            ], 403);
        }

        // Check if appointment can be cancelled
        if (!in_array($appointment->status, ['pending', 'scheduled', 'assigned'])) {
            return response()->json([
                'message' => 'This appointment cannot be cancelled',
                'errors' => ['status' => ['Appointment status does not allow cancellation']]
            ], 422);
        }

        // Update only the status field (remove fields that might not exist)
        $appointment->update([
            'status' => 'cancelled'
        ]);

        // Try to load doctor relationship safely
        try {
            $appointment->load('doctor');
        } catch (\Exception $e) {
            \Log::warning('Could not load doctor relationship: ' . $e->getMessage());
        }

        // Try to broadcast the cancellation (don't fail if broadcasting fails)
        try {
            broadcast(new \App\Events\AppointmentStatusUpdated($appointment));
        } catch (\Exception $e) {
            \Log::warning('Failed to broadcast appointment cancellation: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Appointment cancelled successfully',
            'appointment' => [
                'id' => $appointment->id,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'doctor' => $appointment->doctor->name ?? 'N/A',
                'status' => $appointment->status
            ]
        ]);

    } catch (\Exception $e) {
        \Log::error('Appointment cancellation error: ' . $e->getMessage());
        \Log::error('Error details: ', [
            'appointment_id' => $appointment->id ?? 'unknown',
            'user_id' => $request->user()->id ?? 'unknown',
            'stack_trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'message' => 'Failed to cancel appointment',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}


    /**
     * Get available doctors and their time slots (simplified like AcademicStaffController)
     */
public function getDoctorAvailability(Request $request): JsonResponse
{
    try {
        $doctorId = $request->get('doctor_id');
        
        // FIX: Use string instead of constant
        $query = User::where('role', 'doctor') // Use string instead of User::ROLE_DOCTOR
            ->where('status', 'active');
            
        if ($doctorId) {
            $query->where('id', $doctorId);
        }
        
        $doctors = $query->select('id', 'name', 'specialization', 'phone')
            ->get();

        return response()->json([
            'doctors' => $doctors,
            'availability' => [
                'standard_hours' => 'Mon-Fri 9:00 AM - 5:00 PM',
                'emergency_hours' => '24/7 on-call service',
                'time_slots' => [
                    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
                ]
            ]
        ]);

    } catch (\Exception $e) {
        \Log::error('Doctor availability error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to fetch doctor availability',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

    /**
     * Reschedule an existing appointment
     */
    public function rescheduleAppointment(Request $request, Appointment $appointment): JsonResponse
    {
        // Check if user owns this appointment
        if ($appointment->patient_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized to modify this appointment'
            ], 403);
        }

        try {
            $validated = $request->validate([
                'date' => 'required|date|after_or_equal:today',
                'time' => 'required|date_format:H:i',
            ]);

            // Check for conflicts with the new time
            $existingAppointment = Appointment::where('doctor_id', $appointment->doctor_id)
                ->where('date', $validated['date'])
                ->where('time', $validated['time'])
                ->where('id', '!=', $appointment->id)
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->first();

            if ($existingAppointment) {
                return response()->json([
                    'message' => 'Doctor is not available at this time',
                    'errors' => ['time' => ['This time slot is already booked']]
                ], 422);
            }

            $appointment->update([
                'date' => $validated['date'],
                'time' => $validated['time'],
                'status' => 'scheduled'
            ]);

            $appointment->load('doctor');

            return response()->json([
                'message' => 'Appointment rescheduled successfully',
                'appointment' => [
                    'id' => $appointment->id,
                    'date' => $appointment->date,
                    'time' => $appointment->time,
                    'doctor' => $appointment->doctor->name,
                    'status' => $appointment->status
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Appointment rescheduling error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to reschedule appointment',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Get student's medical history and health records
     */
    public function getMedicalHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $records = $user->medicalRecords()
            ->with('doctor')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->created_at->format('Y-m-d'),
                    'doctor' => $record->doctor->name ?? 'N/A',
                    'diagnosis' => $record->diagnosis,
                    'treatment' => $record->treatment,
                    'notes' => $record->notes
                ];
            });

        return response()->json([
            'medical_history' => $records
        ]);
    }

    /**
     * Helper method to check vaccination status
     */
    private function checkVaccinationStatus($studentId): bool
    {
        $lastVaccination = MedicalRecord::where('patient_id', $studentId)
                                       ->where('type', 'Vaccination')
                                       ->orderBy('created_at', 'desc')
                                       ->first();
        
        if (!$lastVaccination) {
            return false;
        }

        // Check if vaccination is within the last year
        return $lastVaccination->created_at->isAfter(now()->subYear());
    }

    /**
     * Helper method to determine health status based on recent records
     */
    private function determineHealthStatus($studentId): string
    {
        $recentRecord = MedicalRecord::where('patient_id', $studentId)
                                    ->orderBy('created_at', 'desc')
                                    ->first();
        
        if (!$recentRecord) {
            return 'Unknown';
        }

        // Simple logic - in real app, this would be more sophisticated
        if (stripos($recentRecord->notes, 'healthy') !== false || 
            stripos($recentRecord->notes, 'normal') !== false) {
            return 'Good';
        } elseif (stripos($recentRecord->notes, 'concern') !== false) {
            return 'Needs Attention';
        }

        return 'Good'; // Default status
    }
}