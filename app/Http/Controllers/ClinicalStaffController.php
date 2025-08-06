<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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
     * Get medical record for viewing
     */
    public function getMedicalRecord(Request $request, $recordId): JsonResponse
    {
        $record = MedicalRecord::with(['patient', 'doctor', 'creator'])
            ->findOrFail($recordId);
            
        return response()->json($record);
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
     * Get medication schedule for patients
     */
    public function getMedicationSchedule(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all'); // all, due, administered, overdue
        
        $query = MedicalRecord::where('type', 'medication')
            ->whereDate('created_at', $date)
            ->with(['patient', 'doctor']);
            
        if ($status === 'due') {
            $query->where('content->status', 'pending');
        } elseif ($status === 'administered') {
            $query->where('content->status', 'completed');
        }
        
        $medications = $query->get()->map(function($record) {
            return [
                'id' => $record->id,
                'patient' => [
                    'name' => $record->patient->name,
                    'student_id' => $record->patient->student_id
                ],
                'medication' => $record->content['medication_name'],
                'dosage' => $record->content['dosage'],
                'status' => $record->content['status'] ?? 'pending',
                'prescribing_doctor' => $record->doctor->name,
                'administered_by' => $record->creator->name,
                'administered_at' => $record->created_at
            ];
        });
        
        return response()->json([
            'medications' => $medications,
            'summary' => [
                'date' => $date,
                'total_medications' => $medications->count(),
                'due' => $medications->where('status', 'pending')->count(),
                'administered' => $medications->where('status', 'completed')->count(),
            ]
        ]);
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
                'patient' => [
                    'name' => $record->patient->name,
                    'student_id' => $record->patient->student_id
                ],
                'description' => $record->content['description'],
                'status' => $record->content['status'],
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
            ]
        ]);
    }

    /**
 * Send appointment confirmation to patient
 */
public function sendConfirmation(Request $request, $appointmentId): JsonResponse
{
    $appointment = Appointment::with(['patient', 'doctor'])
        ->findOrFail($appointmentId);

    $validated = $request->validate([
        'method' => 'required|in:email,sms',
        'custom_message' => 'nullable|string|max:500'
    ]);

    // Get patient contact info
    $patient = $appointment->patient;
    if (!$patient->email && $validated['method'] === 'email') {
        return response()->json([
            'message' => 'Patient has no email registered',
            'error_code' => 'MISSING_CONTACT_INFO'
        ], 400);
    }

    // Build confirmation message (example)
    $message = $validated['custom_message'] ?? 
        "Your appointment with Dr. {$appointment->doctor->name} " .
        "is confirmed for {$appointment->date} at {$appointment->time}";

    // In a real app, you would:
    // 1. Queue a notification (email/SMS)
    // 2. Log the confirmation
    // This is just a mock implementation
    $notification = [
        'to' => $validated['method'] === 'email' 
            ? $patient->email 
            : $patient->phone,
        'method' => $validated['method'],
        'message' => $message,
        'status' => 'queued'
    ];

    // Update appointment notes
    $appointment->update([
    'content' => array_merge($appointment->content ?? [], [
        'confirmation_sent' => [
            'method' => $validated['method'],
            'at' => now()->format('Y-m-d H:i')
        ]
    ])
]);

    return response()->json([
        'message' => 'Confirmation sent successfully',
        'notification' => $notification,
        'appointment' => $appointment
    ]);
}

    /**
     * Complete a care task
     */
    public function completeTask(Request $request, $taskId): JsonResponse
    {
        $validated = $request->validate([
            'completion_notes' => 'required|string|max:1000',
            'actual_duration' => 'nullable|integer|min:1|max:180'
        ]);

        $task = MedicalRecord::findOrFail($taskId);
        $content = $task->content;
        $content['status'] = 'completed';
        $content['completion_notes'] = $validated['completion_notes'];
        $content['completed_by'] = $request->user()->id;
        $content['completed_at'] = now();
        
        $task->update([
            'content' => $content
        ]);
        
        return response()->json([
            'message' => 'Task completed successfully',
            'task' => $task
        ]);
    }

    /**
     * Get current shift information
     */
    private function getCurrentShift(): string
    {
        $hour = now()->hour;
        
        if ($hour >= 7 && $hour < 15) {
            return 'Day Shift (7:00 AM - 3:00 PM)';
        } elseif ($hour >= 15 && $hour < 23) {
            return 'Evening Shift (3:00 PM - 11:00 PM)';
        } else {
            return 'Night Shift (11:00 PM - 7:00 AM)';
        }
    }

    /**
 * Check vital signs for alerts
 */
private function checkVitalSignsAlerts($vitalSigns): array
{
    $alerts = [];
    
    // Blood pressure alerts (only if both values are present)
    if (isset($vitalSigns['blood_pressure_systolic']) && isset($vitalSigns['blood_pressure_diastolic'])) {
        if ($vitalSigns['blood_pressure_systolic'] > 140 || $vitalSigns['blood_pressure_diastolic'] > 90) {
            $alerts[] = [
                'type' => 'high_blood_pressure',
                'message' => 'Blood pressure elevated - notify doctor',
                'severity' => 'high'
            ];
        }
        
        if ($vitalSigns['blood_pressure_systolic'] < 90 || $vitalSigns['blood_pressure_diastolic'] < 60) {
            $alerts[] = [
                'type' => 'low_blood_pressure',
                'message' => 'Blood pressure low - monitor patient',
                'severity' => 'medium'
            ];
        }
    }
    
    // Heart rate alerts
    if (isset($vitalSigns['heart_rate'])) {
        if ($vitalSigns['heart_rate'] > 100) {
            $alerts[] = [
                'type' => 'tachycardia',
                'message' => 'Heart rate elevated',
                'severity' => 'medium'
            ];
        } elseif ($vitalSigns['heart_rate'] < 60) {
            $alerts[] = [
                'type' => 'bradycardia',
                'message' => 'Heart rate low',
                'severity' => 'medium'
            ];
        }
    }
    
    // Temperature alerts
    if (isset($vitalSigns['temperature']) && isset($vitalSigns['temperature_unit'])) {
        $tempInF = $vitalSigns['temperature_unit'] === 'C' 
            ? ($vitalSigns['temperature'] * 9/5) + 32 
            : $vitalSigns['temperature'];
            
        if ($tempInF > 100.4) {
            $alerts[] = [
                'type' => 'fever',
                'message' => 'Patient has fever - monitor closely',
                'severity' => 'high'
            ];
        } elseif ($tempInF < 96.0) {
            $alerts[] = [
                'type' => 'hypothermia',
                'message' => 'Low body temperature - check patient condition',
                'severity' => 'medium'
            ];
        }
    }
    
    // Respiratory rate alerts
    if (isset($vitalSigns['respiratory_rate'])) {
        if ($vitalSigns['respiratory_rate'] > 24) {
            $alerts[] = [
                'type' => 'tachypnea',
                'message' => 'Respiratory rate elevated',
                'severity' => 'medium'
            ];
        } elseif ($vitalSigns['respiratory_rate'] < 12) {
            $alerts[] = [
                'type' => 'bradypnea',
                'message' => 'Respiratory rate low',
                'severity' => 'medium'
            ];
        }
    }
    
    // Oxygen saturation alerts
    if (isset($vitalSigns['oxygen_saturation'])) {
        if ($vitalSigns['oxygen_saturation'] < 90) {
            $alerts[] = [
                'type' => 'critical_low_oxygen',
                'message' => 'Critical low oxygen saturation - immediate attention required',
                'severity' => 'critical'
            ];
        } elseif ($vitalSigns['oxygen_saturation'] < 95) {
            $alerts[] = [
                'type' => 'low_oxygen',
                'message' => 'Low oxygen saturation - monitor closely',
                'severity' => 'high'
            ];
        }
    }
    
    return $alerts;
}
}