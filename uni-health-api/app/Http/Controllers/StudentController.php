<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\User;
use Carbon\Carbon;

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
                    'doctor' => $appt->doctor->name ?? 'N/A',
                    'status' => $appt->status,
                    'reason' => $appt->reason,
                    'notes' => $appt->notes
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
            'status' => 'pending'
        ]);

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
     * Get available doctors and their time slots (simplified like AcademicStaffController)
     */
    public function getDoctorAvailability(Request $request): JsonResponse
{
    try {
        $doctorId = $request->get('doctor_id');
        
        $query = User::where('role', User::ROLE_DOCTOR)
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