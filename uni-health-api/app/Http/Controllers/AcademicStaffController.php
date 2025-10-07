<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\Appointment;
use App\Models\MedicalRecord;

class AcademicStaffController extends Controller
{
    /**
     * Academic staff clinic dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'message' => 'Welcome to Clinic Dashboard',
            'user' => [
                'name' => $user->name,
                'staff_no' => $user->staff_no,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => 'Academic Staff'
            ],
            'clinic_overview' => [
                'upcoming_appointments' => $user->appointments()->where('status', 'scheduled')->count(),
                'completed_appointments' => $user->appointments()->where('status', 'completed')->count(),
                'medical_history_entries' => $user->medicalRecords()->count(),
            ]
        ]);
    }

    /**
     * View own medical history
     */
    public function getMedicalHistory(Request $request): JsonResponse
    {
        $records = $request->user()->medicalRecords()
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
     * View own appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $appointments = $request->user()->appointments()
            ->with('doctor') // Make sure doctor relationship is loaded
            ->orderBy('date', 'desc')
            ->orderBy('time', 'desc')
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'date' => $appointment->date,
                    'time' => $appointment->time,
                    'doctor' => $appointment->doctor->name ?? 'N/A',
                    'specialization' => $appointment->doctor->specialization ?? 'General Practice', // Add this line
                    'status' => $appointment->status,
                    'reason' => $appointment->reason
                ];
            });

        return response()->json([
            'appointments' => $appointments
        ]);
    }

   /**
 * Schedule a new appointment (supports specialization or doctor_id)
 */
public function scheduleAppointment(Request $request): JsonResponse
{
    try {
        // Validate inputs
        $validated = $request->validate([
            'specialization' => 'nullable|string|exists:users,specialization', // optional, but must exist in DB if sent
            'doctor_id' => 'nullable|exists:users,id',
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500'
        ]);

        // Ensure at least one is provided
        if (empty($validated['doctor_id']) && empty($validated['specialization'])) {
            return response()->json([
                'message' => 'Either doctor_id or specialization must be provided',
                'errors' => [
                    'doctor_id' => ['Either doctor_id or specialization is required'],
                    'specialization' => ['Either doctor_id or specialization is required']
                ]
            ], 422);
        }

        // If specialization provided, pick a doctor
        if (!empty($validated['specialization']) && empty($validated['doctor_id'])) {
            $doctor = User::where('specialization', $validated['specialization'])
                ->where('role', User::ROLE_DOCTOR)
                ->first();

            if (!$doctor) {
                return response()->json([
                    'message' => 'No doctor found with the given specialization',
                    'errors' => ['specialization' => ['No available doctor matches this specialization']]
                ], 422);
            }

            $validated['doctor_id'] = $doctor->id;
        }

        // Check if user already has an appointment that day
        $existingUserAppointment = Appointment::where('patient_id', $request->user()->id)
            ->where('date', $validated['date'])
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->first();

        if ($existingUserAppointment) {
            return response()->json([
                'message' => 'You already have an appointment scheduled for this date',
                'errors' => ['date' => ['Only one appointment per day is allowed']]
            ], 422);
        }

        // Verify doctor exists and has doctor role
        $doctor = User::where('id', $validated['doctor_id'])
            ->where('role', User::ROLE_DOCTOR)
            ->first();

        if (!$doctor) {
            return response()->json([
                'message' => 'Selected doctor not found or invalid',
                'errors' => ['doctor_id' => ['Selected doctor is invalid']]
            ], 422);
        }

        // Check for time slot availability
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

        // Create appointment
        $appointment = Appointment::create([
            'patient_id' => $request->user()->id,
            'doctor_id' => $validated['doctor_id'],
            'date' => $validated['date'],
            'time' => $validated['time'],
            'reason' => $validated['reason'],
            'status' => 'pending', // ✅ Changed from 'scheduled' to 'pending'
            'priority' => $validated['priority'] ?? 'normal', // Add priority
            'type' => $validated['appointment_type'] ?? 'consultation' // Add type
        ]);

        $appointment->load('doctor');

         try {
            broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
                'pending_student_requests' => Appointment::whereIn('status', ['pending', 'under_review'])->count()
            ]));
        } catch (\Exception $e) {
            \Log::warning('Failed to broadcast appointment creation: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Appointment request submitted successfully. Awaiting clinical staff approval.',
            'appointment' => [
                'id' => $appointment->id,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'doctor' => $appointment->doctor->name,
                'reason' => $appointment->reason,
                'status' => $appointment->status
            ]
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        \Log::error('Appointment scheduling error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to schedule appointment',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

    /**
     * Reschedule an appointment
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
     * Cancel an appointment
     */
    public function cancelAppointment(Request $request, Appointment $appointment): JsonResponse
    {
        // Check if user owns this appointment
        if ($appointment->patient_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized to modify this appointment'
            ], 403);
        }

        try {
            $appointment->update(['status' => 'cancelled']);

            return response()->json([
                'message' => 'Appointment cancelled successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Appointment cancellation error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to cancel appointment',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Get doctor availability - Fixed to use User model instead of Doctor model
     */
    public function getDoctorAvailability(Request $request): JsonResponse
    {
        try {
            $doctorId = $request->get('doctor_id');
            
            // Query doctors using User model with doctor role
            $query = User::where('role', User::ROLE_DOCTOR)
                         ->where('status', User::STATUS_ACTIVE ?? 'active');
                
            if ($doctorId) {
                $query->where('id', $doctorId);
            }
            
            $doctors = $query->get();

            $doctorsWithAvailability = $doctors->map(function ($doctor) {
                // Default available days if not set
                $availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                
                // Default working hours
                $workingHoursStart = '09:00';
                $workingHoursEnd = '17:00';
                
                // Generate time slots
                $timeSlots = [];
                try {
                    $start = \Carbon\Carbon::parse($workingHoursStart);
                    $end = \Carbon\Carbon::parse($workingHoursEnd);
                    
                    $current = $start->copy();
                    while ($current->lt($end)) {
                        $timeSlots[] = $current->format('H:i');
                        $current->addMinutes(30);
                    }
                } catch (\Exception $e) {
                    \Log::error("Error processing working hours for doctor {$doctor->id}: " . $e->getMessage());
                    // Default time slots if error occurs
                    $timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
                }
                
                return [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'specialization' => $doctor->specialization ?? 'General Practice',
                    'phone' => $doctor->phone,
                    'availability' => [
                        'available_days' => $availableDays,
                        'working_hours' => [
                            'start' => $workingHoursStart,
                            'end' => $workingHoursEnd
                        ],
                        'time_slots' => $timeSlots,
                        'standard_hours' => $this->formatWorkingHours(
                            $workingHoursStart,
                            $workingHoursEnd,
                            $availableDays
                        ),
                        'emergency_hours' => '24/7 on-call service'
                    ]
                ];
            });

            if ($doctorId && $doctorsWithAvailability->count() === 1) {
                return response()->json($doctorsWithAvailability->first());
            }

            return response()->json(['doctors' => $doctorsWithAvailability]);
            
        } catch (\Exception $e) {
            \Log::error('Doctor availability error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch doctor availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alternative method to get available slots for a specific doctor and date
     */
    public function getAvailableSlots(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'doctor_id' => 'nullable|exists:users,id', // Make it nullable
                'date' => 'required|date|after_or_equal:today'
            ]);

            // Check if the doctor has the correct role
            $doctor = User::where('id', $validated['doctor_id'])
                ->where('role', User::ROLE_DOCTOR)
                ->first();

            if (!$doctor) {
                return response()->json([
                    'message' => 'Doctor not found'
                ], 404);
            }

            // All possible time slots
            $allSlots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ];

            // Get booked slots for this doctor on this date
            $bookedSlots = Appointment::where('doctor_id', $validated['doctor_id'])
                ->where('date', $validated['date'])
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->pluck('time')
                ->map(function ($time) {
                    // Ensure time format consistency
                    return date('H:i', strtotime($time));
                })
                ->toArray();

            // Calculate available slots
            $availableSlots = array_diff($allSlots, $bookedSlots);

            return response()->json([
                'doctor' => [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'specialization' => $doctor->specialization ?? 'General Practice'
                ],
                'date' => $validated['date'],
                'available_slots' => array_values($availableSlots),
                'booked_slots' => $bookedSlots,
                'total_available' => count($availableSlots)
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Available slots error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to fetch available slots',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

   /**
 * Get user profile
 */
public function getProfile(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        
        // Ensure avatar_url is a full URL
        $avatarUrl = null;
        if ($user->avatar_url) {
            // If it's already a full URL, use it as is
            if (filter_var($user->avatar_url, FILTER_VALIDATE_URL)) {
                $avatarUrl = $user->avatar_url;
            } else {
                // Convert relative path to full URL
                $avatarUrl = url($user->avatar_url);
            }
        }
        
        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'staff_no' => $user->staff_no,
            'phone' => $user->phone,
            'department' => $user->department,
            'bio' => $user->bio,
            'avatar_url' => $avatarUrl, // This should now be a full URL or null
            'emergency_contact' => $user->emergency_contact,
            'emergency_phone' => $user->emergency_phone,
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Profile fetch error: ' . $e->getMessage());
        
        return response()->json([
            'message' => 'Failed to fetch profile',
            'error' => 'An unexpected error occurred'
        ], 500);
    }
}

/**
 * Update own profile - Enhanced version
 */
public function updateProfile(Request $request): JsonResponse
{
    try {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'department' => 'sometimes|string|max:255',
            'bio' => 'sometimes|string|max:500',
            'emergency_contact' => 'sometimes|string|max:255',
            'emergency_phone' => 'sometimes|string|max:20'
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'staff_no' => $user->staff_no,
                'phone' => $user->phone,
                'department' => $user->department,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'emergency_contact' => $user->emergency_contact,
                'emergency_phone' => $user->emergency_phone,
            ]
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
            $oldPath = str_replace(url('/storage/'), '', $user->avatar_url); // Handle full URLs too
            
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
            'avatar_url' => $avatarUrl // Return the full URL
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
 * Remove profile avatar
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
     * Helper method to format working hours
     */
    private function formatWorkingHours($start, $end, $days)
    {
        if (!$start || !$end || empty($days)) {
            return 'Schedule not available';
        }

        $daysString = implode(', ', $days);
        return "{$daysString}: {$start} - {$end}";
    }
}