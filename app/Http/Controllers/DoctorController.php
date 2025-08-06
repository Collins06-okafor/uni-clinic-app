<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

class DoctorController extends Controller
{
    /**
     * Doctor dashboard with comprehensive medical overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get doctor statistics using query scopes
        $todayAppointments = Appointment::forDoctor($user->id)
            ->today()
            ->count();
            
        $completedToday = Appointment::forDoctor($user->id)
            ->today()
            ->completed()
            ->count();
            
        $pendingToday = Appointment::forDoctor($user->id)
            ->today()
            ->confirmed()
            ->count();
            
        $emergencyCases = Appointment::forDoctor($user->id)
            ->today()
            ->emergency()
            ->count();
            
        $totalPatients = MedicalRecord::forDoctor($user->id)
            ->distinct('patient_id')
            ->count();

        return response()->json([
            'message' => 'Welcome to Doctor Dashboard',
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization,
                'license_number' => $user->medical_license_number,
                'staff_no' => $user->staff_no,
                'title' => $user->full_title ?? "{$user->name}",
                'department' => 'Medical Services',
                'phone' => $user->phone,
                'email' => $user->email
            ],
            'today_statistics' => [
                'date' => now()->format('Y-m-d'),
                'scheduled_appointments' => $todayAppointments,
                'completed_appointments' => $completedToday,
                'pending_appointments' => $pendingToday,
                'cancelled_appointments' => 0,
                'emergency_cases' => $emergencyCases,
                'no_shows' => 0
            ],
            'patient_statistics' => [
                'total_active_patients' => $totalPatients,
                'new_patients_this_month' => 0,
                'follow_up_required' => 0,
                'high_priority_cases' => 0
            ],
            'upcoming_appointments' => [],
            'recent_activities' => [],
            'alerts' => []
        ]);
    }

    /**
     * Get doctor's patient list
     */
    public function getPatients(Request $request): JsonResponse
    {
        $user = $request->user();
        $search = $request->get('search');
        $status = $request->get('status', 'all');
        $department = $request->get('department');
        
        // Get patients assigned to this doctor using relationship
        $patients = $user->patients()
            ->with(['medicalRecords' => function($query) use ($user) {
                $query->forDoctor($user->id);
            }])
            ->when($search, function($query, $search) {
                return $query->search($search);
            })
            ->paginate(10);

        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => $patients->total(),
                'active' => 0,
                'follow_up_required' => 0,
                'emergency_cases' => 0,
                'by_department' => []
            ],
            'filters_applied' => [
                'search' => $search,
                'status' => $status,
                'department' => $department
            ]
        ]);
    }

    /**
     * Assign a patient to current doctor
     */
    public function assignPatient(Request $request, $patientId): JsonResponse
    {
        $doctor = $request->user();
        
        try {
            $patient = $doctor->assignPatient($patientId);
            
            return response()->json([
                'message' => 'Patient assigned successfully',
                'patient' => [
                    'id' => $patient->id,
                    'name' => $patient->name,
                    'role' => $patient->role,
                    'assigned_at' => now()
                ]
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get detailed patient information
     */
    public function getPatient(Request $request, $patientId): JsonResponse
    {
        $patient = User::with(['medicalRecords', 'appointments'])
            ->students()
            ->findOrFail($patientId);

        return response()->json([
            'personal_info' => [
                'name' => $patient->name,
                'student_id' => $patient->student_id,
                'email' => $patient->email,
                'phone' => $patient->phone,
                'department' => $patient->department
            ],
            'medical_info' => [],
            'visit_history' => [],
            'upcoming_appointments' => [],
            'test_results' => []
        ]);
    }

    /**
     * Create a new medical record for a patient
     */
    public function createMedicalRecord(Request $request, $patientId)
    {
        $validated = $request->validate([
            'diagnosis' => 'required|string|max:1000',
            'treatment' => 'required|string|max:1000',
            'notes' => 'nullable|string',
            'visit_date' => 'required|date'
        ]);

        $record = MedicalRecord::create([
            'patient_id' => $patientId,
            'doctor_id' => $request->user()->id,
            'diagnosis' => $validated['diagnosis'],
            'treatment' => $validated['treatment'],
            'notes' => $validated['notes'] ?? null,
            'visit_date' => $validated['visit_date']
        ]);

        return response()->json([
            'message' => 'Medical record created successfully',
            'record' => $record
        ], 201);
    }

    /**
     * Get doctor's appointments
     */
    public function getAppointments(Request $request): JsonResponse
{
    $validated = $request->validate([
        'date' => 'sometimes|date_format:Y-m-d',
        'status' => 'sometimes|in:all,scheduled,confirmed,completed,cancelled,no_show'
    ]);

    $user = $request->user();
    $date = $validated['date'] ?? now()->format('Y-m-d');
    $status = $validated['status'] ?? 'all';

    $query = Appointment::with(['patient:id,name,student_id', 'doctor:id,name'])
        ->forDoctor($user->id)
        ->onDate($date)
        ->orderBy('time');

    if ($status !== 'all') {
        $query->where('status', $status);
    }

    $appointments = $query->get();

    return response()->json([
        'appointments' => $appointments->map(function ($appointment) {
            return [
                'id' => $appointment->id,
                'date' => $appointment->date->format('Y-m-d'),
                'time' => $appointment->time ? $appointment->time->format('H:i') : null,
                'status' => $appointment->status,
                'reason' => $appointment->reason,
                'patient' => $appointment->patient->only(['id', 'name', 'student_id']),
                'doctor' => $appointment->doctor->only(['id', 'name'])
            ];
        }),
        'schedule_summary' => [
            'date' => $date,
            'total_appointments' => $appointments->count(),
            'scheduled' => $appointments->where('status', 'scheduled')->count(),
            'confirmed' => $appointments->where('status', 'confirmed')->count(),
            'completed' => $appointments->where('status', 'completed')->count(),
            'cancelled' => $appointments->where('status', 'cancelled')->count(),
            'no_shows' => $appointments->where('status', 'no_show')->count()
        ],
        'meta' => [
            'current_doctor' => $user->only(['id', 'name', 'specialization'])
        ]
    ]);
}


/**
 * Get prescriptions with medication details
 */
public function getPrescriptions(Request $request): JsonResponse
{
    $validated = $request->validate([
        'patient_id' => 'sometimes|exists:users,id',
        'date_from' => 'sometimes|date',
        'date_to' => 'sometimes|date|after_or_equal:date_from'
    ]);

    $query = Prescription::with([
            'patient:id,name,student_id', 
            'doctor:id,name',
            'medications' => function($query) {
                $query->orderBy('start_date', 'desc');
            }
        ])
        ->where('doctor_id', $request->user()->id);

    // Optional filters
    if ($request->has('patient_id')) {
        $query->where('patient_id', $validated['patient_id']);
    }

    if ($request->has('date_from')) {
        $query->whereHas('medications', function($q) use ($validated) {
            $q->whereDate('end_date', '>=', $validated['date_from']);
        });
    }

    if ($request->has('date_to')) {
        $query->whereHas('medications', function($q) use ($validated) {
            $q->whereDate('start_date', '<=', $validated['date_to']);
        });
    }

    $prescriptions = $query->orderBy('created_at', 'desc')
                         ->paginate(10);

    return response()->json([
        'prescriptions' => $prescriptions->map(function ($prescription) {
            return [
                'id' => $prescription->id,
                'patient' => $prescription->patient,
                'doctor' => $prescription->doctor,
                'notes' => $prescription->notes,
                'status' => $prescription->status,
                'created_at' => $prescription->created_at->format('Y-m-d H:i'),
                'medications' => $prescription->medications->map(function ($med) {
                    return [
                        'id' => $med->id,
                        'name' => $med->name,
                        'dosage' => $med->dosage,
                        'instructions' => $med->instructions,
                        'start_date' => $med->start_date->format('Y-m-d'),
                        'end_date' => $med->end_date->format('Y-m-d'),
                        'status' => $med->status,
                        'duration_days' => $med->start_date->diffInDays($med->end_date) + 1
                    ];
                })
            ];
        }),
        'meta' => [
            'current_page' => $prescriptions->currentPage(),
            'total_prescriptions' => $prescriptions->total(),
            'doctor' => $request->user()->only(['id', 'name', 'specialization'])
        ]
    ]);
}
   /**
 * Create a prescription with multiple medications
 */
public function createPrescription(Request $request): JsonResponse
{
    $validated = $request->validate([
        'patient_id' => 'required|exists:users,id',
        'medications' => 'required|array|min:1',
        'medications.*.name' => 'required|string|max:255',
        'medications.*.dosage' => 'required|string|max:100',
        'medications.*.instructions' => 'required|string',
        'medications.*.start_date' => 'required|date|after_or_equal:today',
        'medications.*.end_date' => 'required|date|after_or_equal:medications.*.start_date',
        'notes' => 'nullable|string',
        'status' => 'sometimes|string|in:active,completed,cancelled',
        'force' => 'sometimes|boolean' // New: Force parameter to override checks
    ]);

    try {
        // Check for existing active prescriptions for this patient
        $existingPrescription = Prescription::where('patient_id', $validated['patient_id'])
            ->where('doctor_id', auth()->id())
            ->where('status', 'active')
            ->first();

        // Check for medication overlaps with existing active prescriptions
        $overlappingMeds = collect();
        if ($existingPrescription) {
            foreach ($validated['medications'] as $newMed) {
                $overlaps = $existingPrescription->medications()
                    ->where('name', 'LIKE', '%' . $newMed['name'] . '%')
                    ->where('status', 'active')
                    ->where(function($q) use ($newMed) {
                        $q->where('end_date', '>=', $newMed['start_date'])
                          ->where('start_date', '<=', $newMed['end_date']);
                    })
                    ->get();
                
                if ($overlaps->isNotEmpty()) {
                    $overlappingMeds = $overlappingMeds->merge($overlaps->map(function($med) use ($newMed) {
                        return [
                            'existing_medication' => [
                                'name' => $med->name,
                                'dosage' => $med->dosage,
                                'start_date' => $med->start_date->format('Y-m-d'),
                                'end_date' => $med->end_date->format('Y-m-d')
                            ],
                            'new_medication' => [
                                'name' => $newMed['name'],
                                'dosage' => $newMed['dosage'],
                                'start_date' => $newMed['start_date'],
                                'end_date' => $newMed['end_date']
                            ],
                            'overlap_type' => $this->getOverlapType($med, $newMed)
                        ];
                    }));
                }
            }
        }

        // If force parameter is not set and there are conflicts, return conflict response
        if (!$request->input('force', false) && ($existingPrescription || $overlappingMeds->isNotEmpty())) {
            $response = [
                'message' => 'Prescription conflicts detected',
                'conflicts' => []
            ];

            if ($existingPrescription) {
                $existingMeds = $existingPrescription->medications->map(function($med) {
                    return [
                        'name' => $med->name,
                        'dosage' => $med->dosage,
                        'start_date' => $med->start_date->format('Y-m-d'),
                        'end_date' => $med->end_date->format('Y-m-d'),
                        'status' => $med->status
                    ];
                });

                $response['conflicts']['existing_prescription'] = [
                    'id' => $existingPrescription->id,
                    'created_at' => $existingPrescription->created_at->format('Y-m-d H:i:s'),
                    'medications' => $existingMeds,
                    'notes' => $existingPrescription->notes
                ];
            }

            if ($overlappingMeds->isNotEmpty()) {
                $response['conflicts']['medication_overlaps'] = $overlappingMeds;
            }

            $response['instructions'] = [
                'to_force_creation' => 'Add "force": true to your request body to create prescription despite conflicts',
                'recommended_action' => 'Review existing prescriptions and resolve conflicts before creating new prescription'
            ];

            return response()->json($response, 409); // 409 Conflict status code
        }

        DB::beginTransaction();

        // If force is true and there's an existing prescription, mark it as completed
        if ($request->input('force', false) && $existingPrescription) {
            $existingPrescription->update(['status' => 'completed']);
            $existingPrescription->medications()->update(['status' => 'completed']);
        }

        $prescription = Prescription::create([
            'patient_id' => $validated['patient_id'],
            'doctor_id' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'active'
        ]);

        foreach ($validated['medications'] as $medication) {
            $prescription->medications()->create([
                'name' => $medication['name'],
                'dosage' => $medication['dosage'],
                'instructions' => $medication['instructions'],
                'start_date' => $medication['start_date'],
                'end_date' => $medication['end_date'],
                'status' => 'active'
            ]);
        }

        DB::commit();

        $response = [
            'message' => 'Prescription created successfully',
            'data' => $prescription->load(['patient:id,name', 'doctor:id,name', 'medications'])
        ];

        // Add information about what was done if force was used
        if ($request->input('force', false)) {
            $response['actions_taken'] = [];
            
            if ($existingPrescription) {
                $response['actions_taken'][] = 'Previous active prescription was marked as completed';
            }
            
            if ($overlappingMeds->isNotEmpty()) {
                $response['actions_taken'][] = 'Created prescription despite medication overlaps';
            }
        }

        return response()->json($response, 201);

    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Failed to create prescription',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function updateAvailability(Request $request): JsonResponse
{
    $validated = $request->validate([
        'available_days' => 'required|array',
        'available_days.*' => 'string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
        'working_hours_start' => 'required|date_format:H:i',
        'working_hours_end' => 'required|date_format:H:i|after:working_hours_start'
    ]);

    try {
        $user = $request->user();
        
        // Get or create the doctor profile
        $doctor = Doctor::firstOrCreate(
            ['id' => $user->id],
            [
                'medical_license_number' => $user->medical_license_number ?? '',
                'specialization' => $user->specialization ?? '',
                'is_active' => true
            ]
        );

        // Update the availability
        $doctor->update([
            'available_days' => $validated['available_days'],
            'working_hours_start' => $validated['working_hours_start'],
            'working_hours_end' => $validated['working_hours_end']
        ]);

        // Refresh to get casted values
        $doctor->refresh();

        return response()->json([
            'message' => 'Availability updated successfully',
            'data' => [
                'available_days' => $doctor->available_days,
                'working_hours' => [
                    'start' => $doctor->working_hours_start->format('H:i'),
                    'end' => $doctor->working_hours_end->format('H:i')
                ]
            ]
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error updating doctor availability: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to update availability',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Determine the type of overlap between existing and new medication
 */
private function getOverlapType($existingMed, $newMed): string
{
    $existingStart = $existingMed->start_date;
    $existingEnd = $existingMed->end_date;
    $newStart = \Carbon\Carbon::parse($newMed['start_date']);
    $newEnd = \Carbon\Carbon::parse($newMed['end_date']);

    if ($newStart->lte($existingStart) && $newEnd->gte($existingEnd)) {
        return 'complete_overlap'; // New medication completely covers existing
    } elseif ($newStart->gte($existingStart) && $newEnd->lte($existingEnd)) {
        return 'contained_within'; // New medication is within existing period
    } elseif ($newStart->lt($existingStart) && $newEnd->lt($existingEnd) && $newEnd->gte($existingStart)) {
        return 'partial_start_overlap'; // New medication starts before and overlaps at start
    } elseif ($newStart->gt($existingStart) && $newStart->lte($existingEnd) && $newEnd->gt($existingEnd)) {
        return 'partial_end_overlap'; // New medication overlaps at end
    } else {
        return 'unknown_overlap';
    }
}
    /**
     * Get doctor's schedule
     */
    public function getSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $week_start = $request->get('week_start', now()->startOfWeek()->format('Y-m-d'));
        
        // Get schedule from database using query scopes
        $appointments = Appointment::forDoctor($user->id)
            ->weekStarting($week_start)
            ->get()
            ->groupBy('date');

        return response()->json([
            'week_start' => $week_start,
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization
            ],
            'working_hours' => [],
            'daily_schedule' => [],
            'statistics' => []
        ]);
    }

    /**
     * Update appointment status
     */
    public function updateAppointmentStatus(Request $request, $appointmentId): JsonResponse
    {
        $validated = $request->validate([
            // ... keep existing validation rules ...
        ]);

        $appointment = Appointment::findOrFail($appointmentId);
        $appointment->update($validated);

        return response()->json([
            'message' => 'Appointment status updated successfully',
            'appointment_id' => $appointment->id,
            'new_status' => $appointment->status,
            'updated_by' => $request->user()->name,
            'updated_at' => $appointment->updated_at
        ]);
    }

    /**
     * Get medical statistics for the doctor
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->get('period', 'month');
        
        return response()->json([
            'period' => $period,
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization
            ],
            'patient_statistics' => [],
            'appointment_statistics' => [],
            'medical_activities' => [],
            'top_diagnoses' => []
        ]);
    }
}