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
                    'status' => $appointment->status,
                    'reason' => $appointment->reason
                ];
            });

        return response()->json([
            'appointments' => $appointments
        ]);
    }

    /**
     * Schedule a new appointment
     */
    public function scheduleAppointment(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'doctor_id' => 'required|exists:users,id',
                'date' => 'required|date|after_or_equal:today',
                'time' => 'required|date_format:H:i',
                'reason' => 'required|string|max:500'
            ]);

            // Check if user already has an appointment on this date
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

            // Check if doctor exists and has doctor role
            $doctor = User::where('id', $validated['doctor_id'])
                ->where('role', User::ROLE_DOCTOR)
                ->first();

            if (!$doctor) {
                return response()->json([
                    'message' => 'Selected doctor not found or invalid',
                    'errors' => ['doctor_id' => ['Selected doctor is invalid']]
                ], 422);
            }

            // Check for existing appointment at the same time
            $existingAppointment = Appointment::where('doctor_id', $validated['doctor_id'])
                ->where('date', $validated['date'])
                ->where('time', $validated['time'])
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->first();

            if ($existingAppointment) {
                return response()->json([
                    'message' => 'Doctor is not available at this time',
                    'errors' => ['time' => ['This time slot is already booked']]
                ], 422);
            }

            $appointment = Appointment::create([
                'patient_id' => $request->user()->id,
                'doctor_id' => $validated['doctor_id'],
                'date' => $validated['date'],
                'time' => $validated['time'],
                'reason' => $validated['reason'],
                'status' => 'scheduled'
            ]);

            // Load the relationship for response
            $appointment->load('doctor');

            return response()->json([
                'message' => 'Appointment scheduled successfully',
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
                'status' => 'rescheduled'
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
                'doctor_id' => 'required|exists:users,id',
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
     * Update own profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'phone' => 'sometimes|string|max:20',
                'emergency_contact' => 'sometimes|string|max:255',
                'emergency_phone' => 'sometimes|string|max:20'
            ]);

            $request->user()->update($validated);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $request->user()->only(['name', 'email', 'phone', 'emergency_contact', 'emergency_phone'])
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