<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

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
                    'diagnosis_details' => $record->diagnosis_details ?? '',
                    'treatment' => $record->treatment,
                    'prescription' => $record->prescription ?? [],
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
            ->with('doctor')
            ->orderBy('date', 'desc')
            ->orderBy('time', 'desc')
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'date' => $appointment->date,
                    'time' => $appointment->time,
                    'doctor' => $appointment->doctor->name ?? 'N/A',
                    'specialization' => $appointment->doctor->specialization ?? 'General Practice',
                    'status' => $appointment->status,
                    'reason' => $appointment->reason,
                    'urgency' => $appointment->urgency ?? $appointment->priority ?? 'normal'
                ];
            });

        return response()->json([
            'appointments' => $appointments
        ]);
    }

    /**
     * Check if a date is a valid clinic day
     */
    private function isClinicOpen(string $date): bool
    {
        $dayOfWeek = \Carbon\Carbon::parse($date)->dayOfWeek;
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
 * Schedule a new appointment with clinic hours validation
 */
public function scheduleAppointment(Request $request): JsonResponse
{
    try {
        $validated = $request->validate([
            'specialization' => 'nullable|string|exists:users,specialization',
            'doctor_id' => 'nullable|exists:users,id', 
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
            'urgency' => 'sometimes|in:normal,high,urgent'
        ]);

        $validated['urgency'] = $validated['urgency'] ?? 'normal';

        // ✅ Validate weekday
        if (!$this->isClinicOpen($validated['date'])) {
            return response()->json([
                'message' => $this->getClosureReason($validated['date']),
                'errors' => [
                    'date' => [$this->getClosureReason($validated['date']) . '. Please select a weekday (Monday-Friday).']
                ]
            ], 422);
        }

        // ✅ Validate clinic hours
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

        // ✅ REMOVED DUPLICATE CHECK - Handle doctor assignment
        if (empty($validated['doctor_id']) && empty($validated['specialization'])) {
            // ✅ If no doctor/specialization specified, system will auto-assign later
            // This is now ALLOWED - clinical staff will assign
            Log::info('Appointment request without specific doctor - will be assigned by clinical staff');
            
            // ✅ For now, just assign to first available doctor or leave null for clinical staff
            $anyDoctor = User::where('role', User::ROLE_DOCTOR)
                ->where('status', 'active')
                ->first();
                
            if ($anyDoctor) {
                $validated['doctor_id'] = $anyDoctor->id;
                Log::info('Auto-assigned to doctor: ' . $anyDoctor->name);
            } else {
                return response()->json([
                    'message' => 'No doctors available at this time',
                    'errors' => ['doctor_id' => ['No doctors are currently available. Please try again later.']]
                ], 422);
            }
        }

        // ✅ If specialization provided but no doctor_id, find doctor by specialization
        if (!empty($validated['specialization']) && empty($validated['doctor_id'])) {
            $doctor = User::where('specialization', $validated['specialization'])
                ->where('role', User::ROLE_DOCTOR)
                ->where('status', 'active')
                ->first();

            if (!$doctor) {
                return response()->json([
                    'message' => 'No doctor found with the given specialization',
                    'errors' => ['specialization' => ['No available doctor matches this specialization']]
                ], 422);
            }

            $validated['doctor_id'] = $doctor->id;
        }

        // ✅ Check if user already has appointment on this date
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

        // ✅ Check for existing pending appointments
        $existingPendingAppointment = Appointment::where('patient_id', $request->user()->id)
            ->where('status', 'pending')
            ->first();

        if ($existingPendingAppointment) {
            return response()->json([
                'message' => 'Pending Appointment: You already have a pending appointment request. Please wait for it to be approved before requesting another appointment.',
                'errors' => [
                    'appointment' => ['You already have a pending appointment request. Please wait for approval.']
                ]
            ], 422);
        }

        // ✅ Verify the doctor exists and is valid
        $doctor = User::where('id', $validated['doctor_id'])
            ->where('role', User::ROLE_DOCTOR)
            ->first();

        if (!$doctor) {
            return response()->json([
                'message' => 'Selected doctor not found or invalid',
                'errors' => ['doctor_id' => ['Selected doctor is invalid']]
            ], 422);
        }

        // ✅ Check doctor availability for this time slot
        $existingDoctorAppointment = Appointment::where('doctor_id', $validated['doctor_id'])
            ->where('date', $validated['date'])
            ->where('time', $validated['time'])
            ->whereIn('status', ['scheduled', 'confirmed', 'pending'])
            ->first();

        if ($existingDoctorAppointment) {
            return response()->json([
                'message' => 'Doctor is not available at this time',
                'errors' => ['time' => ['This time slot is already booked']]
            ], 422);
        }

        // ✅ Create the appointment
        $appointment = Appointment::create([
            'patient_id' => $request->user()->id,
            'doctor_id' => $validated['doctor_id'],
            'date' => $validated['date'],
            'time' => $validated['time'],
            'reason' => $validated['reason'],
            'urgency' => $validated['urgency'],
            'priority' => $validated['urgency'],
            'status' => 'pending',
            'type' => 'staff_request'
        ]);

        $appointment->load('doctor');

        // ✅ Broadcast event
        try {
            broadcast(new \App\Events\DashboardStatsUpdated('clinical-staff', [
                'pending_student_requests' => Appointment::whereIn('status', ['pending', 'under_review'])->count()
            ]));
        } catch (\Exception $e) {
            Log::warning('Failed to broadcast appointment creation: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Appointment request submitted successfully. Awaiting clinical staff approval.',
            'appointment' => [
                'id' => $appointment->id,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'doctor' => $appointment->doctor->name,
                'reason' => $appointment->reason,
                'urgency' => $appointment->urgency,
                'status' => $appointment->status
            ]
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        Log::error('Appointment scheduling error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
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
            Log::error('Appointment rescheduling error: ' . $e->getMessage());
            
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
            Log::error('Appointment cancellation error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to cancel appointment',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Get doctor availability
     */
    public function getDoctorAvailability(Request $request): JsonResponse
    {
        try {
            $doctorId = $request->get('doctor_id');
            
            $query = User::where('role', User::ROLE_DOCTOR)
                         ->where('status', User::STATUS_ACTIVE ?? 'active');
                
            if ($doctorId) {
                $query->where('id', $doctorId);
            }
            
            $doctors = $query->get();

            $doctorsWithAvailability = $doctors->map(function ($doctor) {
                $availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                $workingHoursStart = '09:00';
                $workingHoursEnd = '17:00';
                
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
                    Log::error("Error processing working hours for doctor {$doctor->id}: " . $e->getMessage());
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
            Log::error('Doctor availability error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch doctor availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available slots for a specific doctor and date
     */
    /**
 * Get available slots for a specific doctor and date
 */
public function getAvailableSlots(Request $request): JsonResponse
{
    try {
        // More flexible validation
        $validated = $request->validate([
            'doctor_id' => 'nullable|exists:users,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today'
        ]);

        // Check if date is a weekday
        if (!$this->isClinicOpen($validated['date'])) {
            return response()->json([
                'message' => $this->getClosureReason($validated['date']),
                'available_slots' => [],
                'booked_slots' => [],
                'total_available' => 0
            ], 422);
        }

        $allSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];

        // If no doctor_id provided, return all slots (they'll pick "any available doctor")
        if (empty($validated['doctor_id'])) {
            // Get all booked slots for ANY doctor on this date
            $bookedSlots = Appointment::where('date', $validated['date'])
                ->whereIn('status', ['scheduled', 'confirmed', 'pending'])
                ->pluck('time')
                ->map(function ($time) {
                    return date('H:i', strtotime($time));
                })
                ->unique()
                ->values()
                ->toArray();

            $availableSlots = array_diff($allSlots, $bookedSlots);

            return response()->json([
                'doctor' => null,
                'date' => $validated['date'],
                'available_slots' => array_values($availableSlots),
                'booked_slots' => $bookedSlots,
                'total_available' => count($availableSlots)
            ]);
        }

        // If doctor_id is provided, check that specific doctor
        $doctor = User::where('id', $validated['doctor_id'])
            ->where('role', User::ROLE_DOCTOR)
            ->first();

        if (!$doctor) {
            return response()->json([
                'message' => 'Doctor not found',
                'available_slots' => [],
                'booked_slots' => [],
                'total_available' => 0
            ], 404);
        }

        $bookedSlots = Appointment::where('doctor_id', $validated['doctor_id'])
            ->where('date', $validated['date'])
            ->whereIn('status', ['scheduled', 'confirmed', 'pending'])
            ->pluck('time')
            ->map(function ($time) {
                return date('H:i', strtotime($time));
            })
            ->toArray();

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
        Log::error('Available slots error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'message' => 'Failed to fetch available slots',
            'error' => config('app.debug') ? $e->getMessage() : 'An unexpected error occurred'
        ], 500);
    }
}

    /**
     * Get user profile - FIXED VERSION
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
                'name' => $user->name,
                'email' => $user->email,
                'staff_no' => $user->staff_no,
                'phone' => $user->phone,
                'department' => $user->department,
                'bio' => $user->bio,
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
            Log::error('Profile fetch error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to fetch profile',
                'error' => 'An unexpected error occurred'
            ], 500);
        }
    }

    /**
     * Update own profile - CRITICAL FIX FOR DATA PERSISTENCE
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $minBirthDate = now()->subYears(18)->toDateString();
            
            // Create validator
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
                'department' => 'nullable|string|max:255',
                'bio' => 'nullable|string|max:500',
                'date_of_birth' => [
                    'nullable',
                    'date',
                    'before_or_equal:' . $minBirthDate
                ],
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:20',
                'emergency_contact_relationship' => 'nullable|string|max:100',
                'emergency_contact_email' => 'nullable|email|max:255',
                'blood_type' => 'nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-,Unknown',
                'gender' => 'nullable|in:male,female,other,prefer_not_to_say',
                'allergies' => 'nullable|string',
                'has_known_allergies' => 'nullable|boolean',
                'allergies_uncertain' => 'nullable|boolean',
                'addictions' => 'nullable|string',
                'medical_history' => 'nullable|string|max:1000',
            ], [
                'date_of_birth.before_or_equal' => 'Academic staff must be at least 18 years old.',
                'name.required' => 'Name is required.',
            ]);

            // Check validation
            if ($validator->fails()) {
                Log::error('Validation failed', [
                    'errors' => $validator->errors(),
                    'input' => $request->except(['password'])
                ]);
                
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();

            // Age verification if date_of_birth is being updated
            if (isset($validated['date_of_birth'])) {
                $birthDate = \Carbon\Carbon::parse($validated['date_of_birth']);
                $age = $birthDate->diffInYears(now());
                
                if ($age < 18) {
                    return response()->json([
                        'message' => 'Age requirement not met',
                        'errors' => [
                            'date_of_birth' => ['Academic staff must be at least 18 years old. Current age: ' . $age . ' years.']
                        ]
                    ], 422);
                }
            }

            $user = $request->user();
            
            // 🔥 CRITICAL FIX: Prepare data for update - convert empty strings to NULL
            $updateData = [];
            
            foreach ($validated as $key => $value) {
                // For boolean fields, explicitly convert
                if (in_array($key, ['has_known_allergies', 'allergies_uncertain'])) {
                    $updateData[$key] = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
                }
                // For string fields, convert empty strings to NULL
                elseif (is_string($value) && trim($value) === '') {
                    $updateData[$key] = null;
                }
                // Otherwise, keep the value
                else {
                    $updateData[$key] = $value;
                }
            }
            
            Log::info('Updating user profile', [
                'user_id' => $user->id,
                'update_data' => $updateData
            ]);

            // 🔥 CRITICAL: Use update() method which saves to database
            $user->update($updateData);
            
            // 🔥 CRITICAL: Refresh the user model to get latest data from DB
            $user->refresh();
            
            Log::info('Profile updated successfully', [
                'user_id' => $user->id,
                'updated_fields' => array_keys($updateData)
            ]);

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

        } catch (\Exception $e) {
            Log::error('Profile update error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => 'An unexpected error occurred: ' . $e->getMessage()
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
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            $user = $request->user();
            
            if ($user->avatar_url) {
                $oldPath = str_replace('/storage/', '', $user->avatar_url);
                $oldPath = str_replace(url('/storage/'), '', $user->avatar_url);
                
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $file = $request->file('avatar');
            $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('avatars', $filename, 'public');
            
            $avatarUrl = url('/storage/' . $path);
            
            $user->update(['avatar_url' => $avatarUrl]);

            Log::info('Avatar uploaded', [
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
            Log::error('Avatar upload error: ' . $e->getMessage());
            
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
                $oldPath = str_replace('/storage/', '', $user->avatar_url);
                $oldPath = str_replace(url('/storage/'), '', $user->avatar_url);
                
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
                
                $user->update(['avatar_url' => null]);
                
                Log::info('Avatar removed', ['user_id' => $user->id]);
            }

            return response()->json([
                'message' => 'Avatar removed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Avatar removal error: ' . $e->getMessage());
            
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