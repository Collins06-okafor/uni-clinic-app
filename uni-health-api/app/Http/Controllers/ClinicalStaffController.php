<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Medication;


class ClinicalStaffController extends Controller
{
    /**
     * Clinical staff dashboard with nursing and support overview
     */
    public function dashboard(Request $request): JsonResponse
{
    $user = $request->user();
    $today = now()->format('Y-m-d');
    
    // Get today's appointments count by status
    $appointmentStats = Appointment::whereDate('date', $today)
        ->select('status', DB::raw('count(*) as count'))
        ->groupBy('status')
        ->pluck('count', 'status');
        
    // Get patient queue for today
    $patientQueue = Appointment::with(['patient', 'doctor'])
        ->whereDate('date', $today)
        ->orderBy('time')
        ->limit(10)
        ->get()
        ->map(function($appointment) {
            return [
                'id' => $appointment->id,
                'patient_name' => $appointment->patient->name,
                'student_id' => $appointment->patient->student_id,
                'time' => $appointment->time,
                'status' => $appointment->status,
                'priority' => $appointment->priority,
                'reason' => $appointment->reason,
                'assigned_doctor' => $appointment->doctor->name
            ];
        });

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
            'urgent_cases' => Appointment::whereDate('date', $today)
                                ->where('priority', 'urgent')
                                ->count(),
        ],
        'patient_queue' => $patientQueue,
    ]);
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
    
    // Update appointment status to confirmed
    $appointment->update(['status' => 'confirmed']);
    
    // Here you would typically send SMS/Email
    // For now, we'll just return success
    
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
 * Get all doctors (for the doctors tab)
 */
public function getAllDoctors(Request $request): JsonResponse
{
    $doctors = User::where('role', 'doctor')
        ->where('status', 'active')
        ->select('id', 'name', 'email', 'phone', 'staff_no', 'department', 'specialty', 'status')
        ->get()
        ->map(function($doctor) {
            return [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'full_name' => $doctor->name, // For compatibility
                'email' => $doctor->email,
                'phone' => $doctor->phone,
                'staff_no' => $doctor->staff_no,
                'department' => $doctor->department,
                'specialty' => $doctor->specialty,
                'status' => $doctor->status
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
            'specialty' => 'sometimes|string|max:100'
        ]);

        $date = $validated['date'];
        $time = $validated['time'];
        $duration = $validated['duration'] ?? 30; // Default 30 minutes
        $specialty = $validated['specialty'] ?? null;

        // Calculate end time for the requested slot
        $requestedStartTime = Carbon::parse("$date $time");
        $requestedEndTime = $requestedStartTime->copy()->addMinutes($duration);

        // Get all doctors
        $doctorsQuery = User::where('role', 'doctor')
            ->where('status', 'active');

        // Filter by specialty if provided
        if ($specialty) {
            $doctorsQuery->where('specialty', $specialty);
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
                $existingStart = Carbon::parse($appointment->date . ' ' . $appointment->time);
                $existingEnd = $existingStart->copy()->addMinutes($appointment->duration ?? 30);

                // Check if there's an overlap
                if ($requestedStartTime->lt($existingEnd) && $requestedEndTime->gt($existingStart)) {
                    $isAvailable = false;
                    break;
                }
            }

            // Check doctor's working hours (assuming 8 AM - 5 PM working hours)
            $workingHoursStart = Carbon::parse("$date 08:00");
            $workingHoursEnd = Carbon::parse("$date 17:00");
            
            if ($requestedStartTime->lt($workingHoursStart) || $requestedEndTime->gt($workingHoursEnd)) {
                $isAvailable = false;
            }

            if ($isAvailable) {
                $availableDoctors[] = [
                    'id' => $doctor->id,
                    'name' => $doctor->name,
                    'specialty' => $doctor->specialty,
                    'department' => $doctor->department,
                    'email' => $doctor->email,
                    'phone' => $doctor->phone,
                    'staff_no' => $doctor->staff_no,
                    'experience_years' => $doctor->experience_years ?? null,
                    'qualifications' => $doctor->qualifications ?? null,
                    'current_appointments_count' => $existingAppointments->count(),
                    'next_available_slot' => $this->getNextAvailableSlot($doctor->id, $date, $time)
                ];
            } else {
                // If not available at requested time, still include with next available slot
                $nextSlot = $this->getNextAvailableSlot($doctor->id, $date, $time);
                if ($nextSlot) {
                    $availableDoctors[] = [
                        'id' => $doctor->id,
                        'name' => $doctor->name,
                        'specialty' => $doctor->specialty,
                        'department' => $doctor->department,
                        'email' => $doctor->email,
                        'phone' => $doctor->phone,
                        'staff_no' => $doctor->staff_no,
                        'experience_years' => $doctor->experience_years ?? null,
                        'qualifications' => $doctor->qualifications ?? null,
                        'available_at_requested_time' => false,
                        'current_appointments_count' => $existingAppointments->count(),
                        'next_available_slot' => $nextSlot
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
                'specialty' => $specialty
            ],
            'available_doctors' => $availableDoctors,
            'summary' => [
                'total_doctors' => count($availableDoctors),
                'available_at_requested_time' => count(array_filter($availableDoctors, function($doc) {
                    return $doc['available_at_requested_time'] ?? true;
                })),
                'specialties_available' => array_unique(array_column($availableDoctors, 'specialty'))
            ]
        ]);
    }

    /**
     * Get next available slot for a doctor
     */
    private function getNextAvailableSlot($doctorId, $date, $requestedTime): ?array
    {
        $startTime = Carbon::parse("$date $requestedTime");
        $workingHoursEnd = Carbon::parse("$date 17:00");
        
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
                $appointmentStart = Carbon::parse($appointment->date . ' ' . $appointment->time);
                $appointmentEnd = $appointmentStart->copy()->addMinutes($appointment->duration ?? 30);
                
                if ($currentTime->lt($appointmentEnd) && $slotEnd->gt($appointmentStart)) {
                    $isSlotFree = false;
                    $currentTime = $appointmentEnd->copy()->subMinutes(30); // Jump to end of this appointment
                    break;
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
                'age' => Carbon::parse($patient->date_of_birth)->age,
                'gender' => $patient->gender,
                'department' => $patient->department,
                'status' => $latestAppointment ? $latestAppointment->status : 'inactive',
                'priority' => $latestAppointment ? $latestAppointment->priority : 'normal',
                'assigned_doctor' => $patient->doctor ? $patient->doctor->name : null,
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
        
        $appointments = $query->get()->map(function($appointment) {
            return [
                'id' => $appointment->id,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'duration' => $appointment->duration,
                'patient' => [
                    'name' => $appointment->patient->name,
                    'student_id' => $appointment->patient->student_id,
                    'department' => $appointment->patient->department
                ],
                'type' => $appointment->type,
                'doctor' => $appointment->doctor->name,
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
     * Schedule a new appointment
     */
    public function scheduleAppointment(Request $request): JsonResponse
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
    
    return response()->json([
        'message' => 'Medication administration recorded successfully',
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


   public function updateVitalSigns(Request $request, $patientId): JsonResponse
{
    $validated = $request->validate([
        'blood_pressure_systolic' => 'required|integer|min:60|max:250',
        'blood_pressure_diastolic' => 'required|integer|min:40|max:150',
        'heart_rate' => 'required|integer|min:30|max:200',
        'temperature' => 'required|numeric|min:90|max:110',
        'temperature_unit' => 'required|in:F,C',
        'respiratory_rate' => 'nullable|integer|min:8|max:40',
        'oxygen_saturation' => 'nullable|integer|min:70|max:100',
        'notes' => 'nullable|string|max:500',
        'doctor_id' => 'sometimes|exists:users,id'
    ]);

    $doctorId = $validated['doctor_id'] ?? null;
    
    if (!$doctorId) {
        $todayAppointment = Appointment::where('patient_id', $patientId)
            ->whereDate('date', now()->format('Y-m-d'))
            ->whereIn('status', ['confirmed', 'in_progress', 'scheduled'])
            ->first();
            
        $doctorId = $todayAppointment ? $todayAppointment->doctor_id : null;
    }

    unset($validated['doctor_id']);

    $record = MedicalRecord::create([
        'patient_id' => $patientId,
        'doctor_id' => $doctorId,
        'type' => 'vital_signs',
        'content' => $validated,
        'diagnosis' => 'Vital signs recording',
        'treatment' => 'N/A',
        'visit_date' => now()->format('Y-m-d'), // Add current date
        'created_by' => $request->user()->id
    ]);
    
    return response()->json([
        'message' => 'Vital signs recorded successfully',
        'record' => $record->load(['patient', 'doctor']),
        'alerts' => $this->checkVitalSignsAlerts($validated)
    ], 201);
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
public function getMedicalCard($studentId): JsonResponse
{
    $student = User::with(['medicalCard', 'medicalDocuments'])
        ->findOrFail($studentId);
        
    return response()->json([
        'student' => [
            'id' => $student->id,
            'name' => $student->name,
            'student_id' => $student->student_id,
            'department' => $student->department,
        ],
        'medical_card' => $student->medicalCard,
        'documents' => $student->medicalDocuments->map(function($doc) {
            return [
                'id' => $doc->id,
                'type' => $doc->type,
                'description' => $doc->description,
                'date' => $doc->document_date,
                'uploaded_at' => $doc->created_at,
                'uploaded_by' => $doc->uploader->name,
                'download_url' => route('medical.download', $doc->id),
            ];
        }),
    ]);
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
        $days = $request->get('days', 7); // Default to 1 week
        
        $records = MedicalRecord::where('patient_id', $patientId)
            ->where('type', 'vital_signs')
            ->whereDate('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->created_at->format('Y-m-d H:i'),
                    'blood_pressure' => $record->content['blood_pressure_systolic'] . '/' . 
                                       $record->content['blood_pressure_diastolic'],
                    'heart_rate' => $record->content['heart_rate'],
                    'temperature' => $record->content['temperature'] . '°' . 
                                    ($record->content['temperature_unit'] ?? 'F'),
                    'respiratory_rate' => $record->content['respiratory_rate'] ?? null,
                    'oxygen_saturation' => $record->content['oxygen_saturation'] ?? null,
                    'recorded_by' => $record->creator->name,
                    'alerts' => $this->checkVitalSignsAlerts($record->content)
                ];
            });
            
        return response()->json([
            'patient_id' => $patientId,
            'vital_signs_history' => $records,
            'time_period' => "$days days",
            'summary' => [
                'total_readings' => $records->count(),
                'abnormal_readings' => $records->filter(fn($r) => !empty($r['alerts']))->count()
            ]
        ]);
    }
}