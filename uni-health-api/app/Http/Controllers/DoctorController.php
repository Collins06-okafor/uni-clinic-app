<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator; // <- ADD THIS MISSING IMPORT
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log; // <- ADD THIS TOO
use Illuminate\Support\Facades\Schema; // Add this line
use App\Models\MedicalCard;
use Carbon\Carbon;


class DoctorController extends Controller
{
    /**
     * Enhanced Doctor dashboard with comprehensive medical overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->format('Y-m-d');
        
        // Today's appointment statistics - enhanced version
        $todayAppointments = Appointment::where('doctor_id', $user->id)
            ->whereDate('date', $today)
            ->get();
            
        $scheduledToday = $todayAppointments->where('status', 'scheduled')->count();
        $confirmedToday = $todayAppointments->where('status', 'confirmed')->count();
        $completedToday = $todayAppointments->where('status', 'completed')->count();
        $cancelledToday = $todayAppointments->where('status', 'cancelled')->count();
        
        // Patient statistics - enhanced version
        $totalPatients = User::whereHas('appointments', function($query) use ($user) {
            $query->where('doctor_id', $user->id);
        })->count();
        
        $newPatientsThisMonth = User::whereHas('appointments', function($query) use ($user) {
            $query->where('doctor_id', $user->id)
                  ->whereMonth('created_at', now()->month)
                  ->whereYear('created_at', now()->year);
        })->count();
        
        // Prescription statistics - enhanced version
        $activePrescriptions = Prescription::where('doctor_id', $user->id)
            ->where('status', 'active')
            ->count();
            
        $prescriptionsThisMonth = Prescription::where('doctor_id', $user->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        return response()->json([
            'message' => 'Dashboard data retrieved successfully',
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization,
                'license_number' => $user->medical_license_number,
                'staff_no' => $user->staff_no,
                'title' => $user->full_title ?? "Dr. {$user->name}",
                'department' => 'Medical Services',
                'phone' => $user->phone,
                'email' => $user->email
            ],
            'today_statistics' => [
                'date' => $today,
                'scheduled_appointments' => $scheduledToday,
                'confirmed_appointments' => $confirmedToday,
                'completed_appointments' => $completedToday,
                'cancelled_appointments' => $cancelledToday,
                'total_appointments' => $todayAppointments->count(),
                'emergency_cases' => 0, // Can be enhanced later
                'no_shows' => 0 // Can be enhanced later
            ],
            'patient_statistics' => [
                'total_active_patients' => $totalPatients,
                'new_patients_this_month' => $newPatientsThisMonth,
                'follow_up_required' => 0, // Can be enhanced later
                'high_priority_cases' => 0 // Can be enhanced later
            ],
            'prescription_statistics' => [
                'active_prescriptions' => $activePrescriptions,
                'prescriptions_this_month' => $prescriptionsThisMonth,
            ],
            'weekly_stats' => $this->getWeeklyStatistics($user->id),
            'upcoming_appointments' => [],
            'recent_activities' => [],
            'alerts' => []
        ]);
    }

    /**
     * Get weekly statistics for charts
     */
    private function getWeeklyStatistics($doctorId): array
{
    $weekStart = now()->startOfWeek(); // Monday
    $weekData = [
        'appointments' => [],
        'patients' => [],
        'completed' => []
    ];
    
    for ($i = 0; $i < 7; $i++) {
        $date = $weekStart->copy()->addDays($i);
        
        $dayAppointments = Appointment::where('doctor_id', $doctorId)
            ->whereDate('date', $date->format('Y-m-d'))
            ->get();
            
        $dayPatients = $dayAppointments->unique('patient_id')->count();
        $dayCompleted = $dayAppointments->where('status', 'completed')->count();
        
        $weekData['appointments'][] = $dayAppointments->count();
        $weekData['patients'][] = $dayPatients;
        $weekData['completed'][] = $dayCompleted;
    }
    
    // Add debugging
    \Log::info('Weekly stats generated:', $weekData);
    
    return $weekData;
}

public function completeAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'status' => 'required|string|in:completed',
        'completion_report' => 'required|array',
        'completion_report.diagnosis' => 'required|string',
        'completion_report.treatment_provided' => 'required|string',
        'completion_report.medications_prescribed' => 'nullable|string',
        'completion_report.recommendations' => 'nullable|string',
        'completion_report.follow_up_required' => 'boolean',
        'completion_report.follow_up_date' => 'nullable|date',
        'completion_report.notes' => 'nullable|string',
    ]);

    try {
        DB::beginTransaction();

        $appointment = Appointment::where('doctor_id', $request->user()->id)
            ->findOrFail($id);

        // Update appointment status and completion report
        $appointment->update([
            'status' => 'completed',
            'completion_report' => json_encode($validated['completion_report']),
            'completed_at' => now()
        ]);

        // Create medical record from completion report
        $medicalRecord = MedicalRecord::create([
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $request->user()->id,
            'appointment_id' => $appointment->id,
            'created_by' => $request->user()->id,
            'diagnosis' => $validated['completion_report']['diagnosis'],
            'treatment' => $validated['completion_report']['treatment_provided'],
            'notes' => $validated['completion_report']['notes'] ?? null,
            'visit_date' => $appointment->date
        ]);

        // Create prescription if medications were prescribed
        if (!empty($validated['completion_report']['medications_prescribed'])) {
            $prescription = Prescription::create([
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $request->user()->id,
                'notes' => "Prescribed during appointment completion. Medications: " . $validated['completion_report']['medications_prescribed'],
                'status' => 'active'
            ]);

            // Parse medications from the text (simple approach)
            // You might want to enhance this parsing logic
            $medicationsText = $validated['completion_report']['medications_prescribed'];
            $medicationLines = explode("\n", $medicationsText);
            
            foreach ($medicationLines as $line) {
                $line = trim($line);
                if (empty($line)) continue;
                
                // Simple parsing - you can enhance this
                // Expected format: "Medication Name - Dosage - Instructions"
                $parts = explode(' - ', $line);
                
                if (count($parts) >= 2) {
                    $prescription->medications()->create([
                        'name' => $parts[0] ?? 'Not specified',
                        'dosage' => $parts[1] ?? 'As directed',
                        'instructions' => $parts[2] ?? 'As directed by doctor',
                        'start_date' => $appointment->date,
                        'end_date' => date('Y-m-d', strtotime($appointment->date . ' + 7 days')), // Default 7 days
                        'frequency' => 'daily',
                        'created_by' => $request->user()->id,
                        'patient_id' => $appointment->patient_id,
                        'status' => 'active'
                    ]);
                }
            }
        }

        DB::commit();

        return response()->json([
            'message' => 'Appointment completed successfully',
            'appointment' => $appointment->load(['patient', 'doctor']),
            'medical_record' => $medicalRecord,
            'prescription_created' => !empty($validated['completion_report']['medications_prescribed'])
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error completing appointment: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to complete appointment',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get urgent appointment requests
 */
public function getUrgentRequests(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        
        // Get appointments marked as urgent that are NOT completed or cancelled
        $urgentAppointments = Appointment::where('doctor_id', $user->id)
            ->where('priority', 'urgent')
            ->whereIn('status', ['scheduled', 'confirmed']) // Only show scheduled or confirmed
            ->whereNotIn('status', ['completed', 'cancelled']) // Explicitly exclude completed/cancelled
            ->with('patient:id,name,email,phone')
            ->orderBy('date', 'asc')
            ->orderBy('time', 'asc')
            ->get();
        
        // Format for frontend
        $urgentRequests = $urgentAppointments->map(function ($appointment) {
            return [
                'id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'patient_name' => $appointment->patient->name ?? 'Unknown',
                'reason' => $appointment->reason,
                'date' => $appointment->date,
                'time' => $appointment->time,
                'status' => $appointment->status,
                'created_at' => $appointment->created_at->toISOString()
            ];
        });
        
        return response()->json([
            'urgent_requests' => $urgentRequests,
            'count' => $urgentRequests->count()
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error fetching urgent requests: ' . $e->getMessage());
        return response()->json([
            'urgent_requests' => [],
            'count' => 0,
            'error' => $e->getMessage()
        ], 200); // Return 200 with empty array to prevent frontend errors
    }
}

/**
 * Cancel appointment and send back to clinical staff
 */
public function cancelAppointment(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'cancellation_reason' => 'required|string|max:500',
        'send_to_clinical_staff' => 'boolean'
    ]);

    try {
        DB::beginTransaction();

        $appointment = Appointment::where('doctor_id', $request->user()->id)
            ->findOrFail($id);

        // Store original doctor info before updating
        $originalDoctor = $appointment->doctor;

        // Update appointment for reassignment
        $updateData = [
            'status' => 'pending', // Change to pending for clinical staff to reassign
            'cancellation_reason' => $validated['cancellation_reason'],
            'cancelled_by' => $request->user()->id,
            'cancelled_at' => now(),
            'needs_reassignment' => $validated['send_to_clinical_staff'] ?? true,
        ];

        // If sending to clinical staff, remove doctor assignment
        if ($validated['send_to_clinical_staff'] ?? true) {
            $updateData['doctor_id'] = null; // Unassign doctor
        } else {
            $updateData['status'] = 'cancelled'; // Fully cancel if not reassigning
        }

        $appointment->update($updateData);

        // Create notification for clinical staff
        if ($validated['send_to_clinical_staff'] ?? true) {
            // Log for notification system
            \Log::info("Appointment {$id} cancelled by Dr. {$originalDoctor->name}, sent to clinical staff for reassignment", [
                'appointment_id' => $id,
                'patient_id' => $appointment->patient_id,
                'original_doctor_id' => $originalDoctor->id,
                'cancellation_reason' => $validated['cancellation_reason'],
                'priority' => $appointment->priority ?? 'normal'
            ]);

            // Trigger WebSocket event for real-time notification
            event(new \App\Events\AppointmentNeedsReassignment($appointment));
        }

        DB::commit();

        return response()->json([
            'message' => $validated['send_to_clinical_staff'] ?? true 
                ? 'Appointment sent to clinical staff for reassignment' 
                : 'Appointment cancelled successfully',
            'appointment' => $appointment->load(['patient']),
            'needs_reassignment' => $validated['send_to_clinical_staff'] ?? true
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Error cancelling appointment: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to cancel appointment',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Get doctor's patient list
     */
public function getPatients(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        $search = $request->get('search');
        $showArchived = $request->boolean('show_archived', false);
        
        // Get patients who have appointments with this doctor
        $query = User::whereHas('appointments', function($query) use ($user) {
                $query->where('appointments.doctor_id', $user->id);  // ← Add table prefix
            })
            ->with(['medicalRecords' => function($query) use ($user) {
                $query->where('medical_records.doctor_id', $user->id)  // ← Add table prefix
                      ->latest()
                      ->limit(5);
            }]);
        
        // Filter archived patients if the pivot table exists
        if (!$showArchived && Schema::hasTable('doctor_archived_patients')) {
            $query->whereDoesntHave('archivedByDoctors', function($q) use ($user) {
                $q->where('doctor_archived_patients.doctor_id', $user->id);  // ← Add table prefix
            });
        }
        
        // Search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")  // ← Add table prefix
                  ->orWhere('users.student_id', 'like', "%{$search}%")  // ← Add table prefix
                  ->orWhere('users.staff_no', 'like', "%{$search}%")  // ← Add table prefix
                  ->orWhere('users.email', 'like', "%{$search}%");  // ← Add table prefix
            });
        }

        $patients = $query->select([
            'users.id',  // ← Add table prefix
            'users.name', 
            'users.email', 
            'users.role', 
            'users.student_id', 
            'users.staff_no',
            'users.department', 
            'users.phone'
        ])->paginate(15);

        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => $patients->total(),
                'active' => $patients->count(),
                'show_archived' => $showArchived
            ]
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching patients: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'message' => 'Failed to load patients',
            'error' => $e->getMessage(),
            'patients' => ['data' => []], 
            'summary' => [
                'total_patients' => 0,
                'active' => 0,
                'show_archived' => $showArchived
            ]
        ], 500);
    }
}

/**
 * Get patient's medical card information
 */
public function getPatientMedicalCard(Request $request, $patientId): JsonResponse
{
    try {
        $doctor = $request->user();
        
        // Load patient with all relationships (like Clinical Staff does)
        $patient = User::with(['medicalCard', 'medicalDocuments'])->findOrFail($patientId);
        
        \Log::info('Doctor loading medical card for patient', [
            'doctor_id' => $doctor->id,
            'patient_id' => $patientId,
            'has_medical_card' => !is_null($patient->medicalCard),
        ]);
        
        // Check if doctor has access to this patient
        $hasAccess = Appointment::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->exists();
            
        if (!$hasAccess) {
            return response()->json([
                'error' => 'Access denied',
                'message' => 'You do not have access to this patient\'s medical card'
            ], 403);
        }
        
        // Format date of birth properly
        $dateOfBirth = null;
        if ($patient->date_of_birth) {
            try {
                $dateOfBirth = \Carbon\Carbon::parse($patient->date_of_birth)->format('Y-m-d');
            } catch (\Exception $e) {
                \Log::warning("Could not parse date of birth for patient {$patientId}");
                $dateOfBirth = $patient->date_of_birth;
            }
        }
        
        // Calculate age
        $age = null;
        if ($patient->date_of_birth) {
            try {
                $age = \Carbon\Carbon::parse($patient->date_of_birth)->age;
            } catch (\Exception $e) {
                \Log::warning("Could not calculate age for patient {$patientId}");
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
            'documents' => $patient->medicalDocuments ? $patient->medicalDocuments->map(function($doc) {
                return [
                    'id' => $doc->id,
                    'type' => $doc->type,
                    'description' => $doc->description,
                    'date' => $doc->document_date,
                    'uploaded_at' => $doc->created_at,
                    'uploaded_by' => $doc->uploader->name ?? 'Unknown',
                ];
            }) : [],
        ], 200);
        
    } catch (\Exception $e) {
        \Log::error('Error loading medical card in DoctorController: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'message' => 'Failed to load medical card',
            'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
        ], 500);
    }
}

// ADD THIS HELPER METHOD at the very end of your DoctorController class (before the final closing brace })
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
        
        // Try to parse as comma or newline-separated list
        $items = preg_split('/[,\n\r]+/', $field);
        return array_filter(array_map('trim', $items));
    }
    
    return [];
}

/**
 * Get patient's vitals history (for doctors)
 * Returns vital signs history for the past X days
 */
/**
 * Get patient's vitals history (enhanced version)
 * Returns vital signs history for the past X days
 */
public function getPatientVitalsHistory(Request $request, $patientId): JsonResponse
{
    try {
        $doctor = $request->user();
        $days = $request->query('days', 30);
        $startDate = now()->subDays($days);
        
        Log::info('Fetching vitals history for doctor', [
            'doctor_id' => $doctor->id,
            'patient_id' => $patientId,
            'days' => $days
        ]);
        
        // Verify patient exists
        $patient = User::find($patientId);
        if (!$patient) {
            return response()->json([
                'error' => 'Patient not found',
                'message' => 'No patient found with the given ID'
            ], 404);
        }
        
        // Check doctor access
        $hasAccess = Appointment::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->exists();
            
        if (!$hasAccess) {
            return response()->json([
                'error' => 'Access denied',
                'message' => 'You do not have access to this patient\'s vitals history'
            ], 403);
        }
        
        // ✅ ENHANCED: Use Eloquent model instead of raw DB query
        $vitalsRecords = MedicalRecord::where('patient_id', $patientId)
            ->where('created_at', '>=', $startDate)
            ->where(function($query) {
                // Get records with any vital signs data
                $query->whereNotNull('blood_pressure')
                      ->orWhereNotNull('heart_rate')
                      ->orWhereNotNull('temperature')
                      ->orWhereNotNull('respiratory_rate')
                      ->orWhereNotNull('oxygen_saturation')
                      ->orWhereNotNull('weight')
                      ->orWhereNotNull('height')
                      ->orWhereNotNull('bmi');
            })
            ->with(['creator' => function($query) {
                $query->select('id', 'name', 'role');
            }])
            ->orderBy('created_at', 'desc')
            ->get();
        
        Log::info('Found vitals records', [
            'count' => $vitalsRecords->count(),
            'first_record' => $vitalsRecords->first() ? [
                'id' => $vitalsRecords->first()->id,
                'blood_pressure' => $vitalsRecords->first()->blood_pressure,
                'created_at' => $vitalsRecords->first()->created_at
            ] : null
        ]);
        
        // Format results
        $vitalsHistory = $vitalsRecords->map(function ($record) {
            return [
                'id' => $record->id,
                'date' => $record->created_at->toISOString(),
                'date_formatted' => $record->created_at->format('M d, Y H:i'),
                'blood_pressure' => $record->blood_pressure ?? 'N/A',
                'heart_rate' => $record->heart_rate ?? 'N/A',
                'temperature' => $record->temperature ?? 'N/A',
                'respiratory_rate' => $record->respiratory_rate ?? 'N/A',
                'oxygen_saturation' => $record->oxygen_saturation ?? 'N/A',
                'weight' => $record->weight ?? 'N/A',
                'height' => $record->height ?? 'N/A',
                'bmi' => $record->bmi ?? 'N/A',
                'recorded_by' => $record->creator ? 
                    ($record->creator->role === 'doctor' ? "Dr. {$record->creator->name}" : $record->creator->name) 
                    : 'System',
                'recorded_by_id' => $record->created_by,
                'recorded_by_role' => $record->creator->role ?? null,
                'alerts' => $this->checkVitalSignsAlertsFromRecord($record),
                'notes' => $record->notes,
            ];
        });
        
        // Get the latest vital signs for quick overview
        $latestVitals = $vitalsRecords->first();
        $latestVitalsSummary = null;
        
        if ($latestVitals) {
            $latestVitalsSummary = [
                'date' => $latestVitals->created_at->format('Y-m-d H:i'),
                'blood_pressure' => $latestVitals->blood_pressure,
                'heart_rate' => $latestVitals->heart_rate,
                'temperature' => $latestVitals->temperature,
                'oxygen_saturation' => $latestVitals->oxygen_saturation,
                'has_alerts' => !empty($this->checkVitalSignsAlertsFromRecord($latestVitals))
            ];
        }
        
        return response()->json([
            'patient_id' => $patientId,
            'patient_name' => $patient->name,
            'period_days' => $days,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => now()->format('Y-m-d'),
            'total_records' => $vitalsHistory->count(),
            'latest_vitals' => $latestVitalsSummary,
            'vital_signs_history' => $vitalsHistory->values(),
            'summary' => [
                'with_blood_pressure' => $vitalsRecords->whereNotNull('blood_pressure')->count(),
                'with_heart_rate' => $vitalsRecords->whereNotNull('heart_rate')->count(),
                'with_temperature' => $vitalsRecords->whereNotNull('temperature')->count(),
                'abnormal_readings' => $vitalsRecords->filter(function($record) {
                    return !empty($this->checkVitalSignsAlertsFromRecord($record));
                })->count()
            ]
        ], 200);
        
    } catch (\Exception $e) {
        Log::error('Error fetching vitals history: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'error' => 'Internal server error',
            'message' => 'Failed to load vitals history',
            'details' => config('app.debug') ? $e->getMessage() : null
        ], 500);
    }
}

/**
 * Check vital signs for alerts from MedicalRecord model
 */
private function checkVitalSignsAlertsFromRecord(MedicalRecord $record): array
{
    $alerts = [];
    
    // Blood pressure check
    if (!empty($record->blood_pressure)) {
        $bp = explode('/', $record->blood_pressure);
        if (count($bp) === 2) {
            $systolic = (int)$bp[0];
            $diastolic = (int)$bp[1];
            
            if ($systolic > 180 || $diastolic > 120) {
                $alerts[] = [
                    'type' => 'HYPERTENSIVE_CRISIS',
                    'severity' => 'critical',
                    'message' => 'Blood pressure is critically high - immediate attention required',
                    'value' => $record->blood_pressure,
                    'normal_range' => '90-120/60-80'
                ];
            } elseif ($systolic > 140 || $diastolic > 90) {
                $alerts[] = [
                    'type' => 'HIGH_BLOOD_PRESSURE',
                    'severity' => 'warning',
                    'message' => 'Blood pressure is elevated (Stage 1 Hypertension)',
                    'value' => $record->blood_pressure,
                    'normal_range' => '90-120/60-80'
                ];
            } elseif ($systolic < 90 || $diastolic < 60) {
                $alerts[] = [
                    'type' => 'LOW_BLOOD_PRESSURE',
                    'severity' => 'warning',
                    'message' => 'Blood pressure is low (Hypotension)',
                    'value' => $record->blood_pressure,
                    'normal_range' => '90-120/60-80'
                ];
            }
        }
    }
    
    // Heart rate check
    if (!empty($record->heart_rate)) {
        $hr = (int)$record->heart_rate;
        if ($hr > 120) {
            $alerts[] = [
                'type' => 'HIGH_HEART_RATE',
                'severity' => 'critical',
                'message' => 'Heart rate is critically elevated (Severe Tachycardia)',
                'value' => $hr . ' bpm',
                'normal_range' => '60-100 bpm'
            ];
        } elseif ($hr > 100) {
            $alerts[] = [
                'type' => 'HIGH_HEART_RATE',
                'severity' => 'warning',
                'message' => 'Heart rate is elevated (Tachycardia)',
                'value' => $hr . ' bpm',
                'normal_range' => '60-100 bpm'
            ];
        } elseif ($hr < 60 && $hr > 0) {
            $alerts[] = [
                'type' => 'LOW_HEART_RATE',
                'severity' => 'warning',
                'message' => 'Heart rate is below normal (Bradycardia)',
                'value' => $hr . ' bpm',
                'normal_range' => '60-100 bpm'
            ];
        }
    }
    
    // Temperature check
    if (!empty($record->temperature)) {
        $temp = (float)$record->temperature;
        
        if ($temp >= 39.5) {
            $alerts[] = [
                'type' => 'HIGH_FEVER',
                'severity' => 'critical',
                'message' => 'Patient has a high fever',
                'value' => $temp . '°C',
                'normal_range' => '36.5-37.5°C'
            ];
        } elseif ($temp >= 38.0) {
            $alerts[] = [
                'type' => 'FEVER',
                'severity' => 'warning',
                'message' => 'Patient has a fever',
                'value' => $temp . '°C',
                'normal_range' => '36.5-37.5°C'
            ];
        } elseif ($temp < 36.0) {
            $alerts[] = [
                'type' => 'LOW_TEMPERATURE',
                'severity' => 'warning',
                'message' => 'Body temperature is below normal',
                'value' => $temp . '°C',
                'normal_range' => '36.5-37.5°C'
            ];
        }
    }
    
    // Oxygen saturation check
    if (!empty($record->oxygen_saturation)) {
        $spo2 = (int)$record->oxygen_saturation;
        if ($spo2 < 90) {
            $alerts[] = [
                'type' => 'LOW_OXYGEN',
                'severity' => 'critical',
                'message' => 'Oxygen saturation is critically low',
                'value' => $spo2 . '%',
                'normal_range' => '95-100%'
            ];
        } elseif ($spo2 < 95) {
            $alerts[] = [
                'type' => 'LOW_OXYGEN',
                'severity' => 'warning',
                'message' => 'Oxygen saturation is below normal range',
                'value' => $spo2 . '%',
                'normal_range' => '95-100%'
            ];
        }
    }
    
    // BMI check
    if (!empty($record->bmi)) {
        $bmi = (float)$record->bmi;
        if ($bmi >= 30) {
            $alerts[] = [
                'type' => 'OBESITY',
                'severity' => 'warning',
                'message' => 'Patient BMI indicates obesity',
                'value' => round($bmi, 1),
                'normal_range' => '18.5-24.9'
            ];
        } elseif ($bmi >= 25) {
            $alerts[] = [
                'type' => 'OVERWEIGHT',
                'severity' => 'info',
                'message' => 'Patient BMI indicates overweight',
                'value' => round($bmi, 1),
                'normal_range' => '18.5-24.9'
            ];
        } elseif ($bmi < 18.5) {
            $alerts[] = [
                'type' => 'UNDERWEIGHT',
                'severity' => 'warning',
                'message' => 'Patient BMI indicates underweight',
                'value' => round($bmi, 1),
                'normal_range' => '18.5-24.9'
            ];
        }
    }
    
    return $alerts;
}

/**
 * Get patient's latest vital signs (quick access)
 */
public function getPatientLatestVitals(Request $request, $patientId): JsonResponse
{
    try {
        $doctor = $request->user();
        
        // Check doctor access
        $hasAccess = Appointment::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->exists();
            
        if (!$hasAccess) {
            return response()->json([
                'error' => 'Access denied',
                'message' => 'You do not have access to this patient\'s vitals'
            ], 403);
        }
        
        // Get the most recent vital signs record
        $latestVitals = MedicalRecord::where('patient_id', $patientId)
            ->whereNotNull('blood_pressure') // Only get actual vital records
            ->orderBy('created_at', 'desc')
            ->with(['creator' => function($query) {
                $query->select('id', 'name', 'role');
            }])
            ->first();
        
        if (!$latestVitals) {
            return response()->json([
                'has_vitals' => false,
                'message' => 'No vital signs recorded yet'
            ]);
        }
        
        $vitalsData = [
            'id' => $latestVitals->id,
            'date' => $latestVitals->created_at->toISOString(),
            'date_formatted' => $latestVitals->created_at->format('M d, Y H:i'),
            'blood_pressure' => $latestVitals->blood_pressure,
            'heart_rate' => $latestVitals->heart_rate,
            'temperature' => $latestVitals->temperature,
            'respiratory_rate' => $latestVitals->respiratory_rate,
            'oxygen_saturation' => $latestVitals->oxygen_saturation,
            'weight' => $latestVitals->weight,
            'height' => $latestVitals->height,
            'bmi' => $latestVitals->bmi,
            'recorded_by' => $latestVitals->creator ? 
                ($latestVitals->creator->role === 'doctor' ? "Dr. {$latestVitals->creator->name}" : $latestVitals->creator->name) 
                : 'System',
            'recorded_at' => $latestVitals->created_at->format('g:i A'),
            'alerts' => $this->checkVitalSignsAlertsFromRecord($latestVitals),
            'notes' => $latestVitals->notes,
        ];
        
        // Calculate trends if there are previous records
        $previousVitals = MedicalRecord::where('patient_id', $patientId)
            ->where('id', '!=', $latestVitals->id)
            ->whereNotNull('blood_pressure')
            ->orderBy('created_at', 'desc')
            ->first();
        
        $trends = [];
        if ($previousVitals) {
            // Blood pressure trend
            if ($latestVitals->blood_pressure && $previousVitals->blood_pressure) {
                $latestBP = explode('/', $latestVitals->blood_pressure);
                $previousBP = explode('/', $previousVitals->blood_pressure);
                
                if (count($latestBP) === 2 && count($previousBP) === 2) {
                    $latestSystolic = (int)$latestBP[0];
                    $previousSystolic = (int)$previousBP[0];
                    $trends['blood_pressure'] = $latestSystolic > $previousSystolic ? 'increasing' : 
                                               ($latestSystolic < $previousSystolic ? 'decreasing' : 'stable');
                }
            }
            
            // Heart rate trend
            if ($latestVitals->heart_rate && $previousVitals->heart_rate) {
                $trends['heart_rate'] = $latestVitals->heart_rate > $previousVitals->heart_rate ? 'increasing' : 
                                       ($latestVitals->heart_rate < $previousVitals->heart_rate ? 'decreasing' : 'stable');
            }
            
            // Temperature trend
            if ($latestVitals->temperature && $previousVitals->temperature) {
                $trends['temperature'] = $latestVitals->temperature > $previousVitals->temperature ? 'increasing' : 
                                        ($latestVitals->temperature < $previousVitals->temperature ? 'decreasing' : 'stable');
            }
        }
        
        return response()->json([
            'has_vitals' => true,
            'patient_id' => $patientId,
            'vitals' => $vitalsData,
            'trends' => $trends,
            'time_since_recording' => $latestVitals->created_at->diffForHumans(),
            'is_today' => $latestVitals->created_at->isToday()
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching latest vitals: ' . $e->getMessage());
        return response()->json([
            'error' => 'Failed to fetch vitals',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get recorder name
 * Helper method to get the name of who recorded the vitals
 */
private function getRecorderName($userId): string
{
    if (!$userId) {
        return 'System';
    }
    
    try {
        $user = User::find($userId);
        if ($user) {
            if ($user->role === 'doctor') {
                return "Dr. {$user->name}";
            }
            return $user->name;
        }
    } catch (\Exception $e) {
        Log::warning('Error getting recorder name: ' . $e->getMessage());
    }
    
    return 'Unknown';
}

    public function archivePatients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_ids' => 'required|array|min:1',
            'patient_ids.*' => 'required|integer|exists:users,id',
            'archive_reason' => 'nullable|string|max:500'
        ]);

        try {
            DB::beginTransaction();
            
            $doctor = $request->user();
            
            // Get patients who have appointments with this doctor
            $patientsToArchive = User::whereIn('id', $validated['patient_ids'])
                ->whereHas('appointments', function($query) use ($doctor) {
                    $query->where('doctor_id', $doctor->id);
                })
                ->get();
            
            if ($patientsToArchive->isEmpty()) {
                return response()->json([
                    'message' => 'No patients found to archive',
                    'archived_count' => 0
                ], 400);
            }
            
            $archivedCount = 0;
            
            
            // APPROACH 2: Using pivot table (doctor-specific archiving)
            // This allows different doctors to have different archived patient lists
            foreach ($patientsToArchive as $patient) {
                DB::table('doctor_archived_patients')->updateOrInsert(
                    [
                        'doctor_id' => $doctor->id,
                        'patient_id' => $patient->id
                    ],
                    [
                        'archive_reason' => $validated['archive_reason'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
                $archivedCount++;
            }
            
            DB::commit();

            return response()->json([
                'message' => "{$archivedCount} patient(s) archived successfully",
                'archived_count' => $archivedCount
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error archiving patients: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Failed to archive patients',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unarchive patients
     */
    public function unarchivePatients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_ids' => 'required|array|min:1',
            'patient_ids.*' => 'required|integer|exists:users,id'
        ]);

        try {
            DB::beginTransaction();
            
            $doctor = $request->user();
            
            // APPROACH 1: Using status column
            /*
            User::whereIn('id', $validated['patient_ids'])
                ->update([
                    'status' => 'active',
                    'archived_at' => null,
                    'archived_by' => null
                ]);
            */
            
            // APPROACH 2: Using pivot table
            DB::table('doctor_archived_patients')
                ->where('doctor_id', $doctor->id)
                ->whereIn('patient_id', $validated['patient_ids'])
                ->delete();
            
            DB::commit();

            return response()->json([
                'message' => 'Patients unarchived successfully',
                'unarchived_count' => count($validated['patient_ids'])
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error unarchiving patients: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to unarchive patients',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get doctor profile (updated to match admin pattern)
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
            'address' => $user->address ?? '',  // ADD THIS LINE
            'department' => $user->department ?? '',
            // REMOVE: 'bio' => $user->bio ?? '',
            'avatar_url' => $user->avatar_url ? url($user->avatar_url) : null,
            'specialization' => $user->specialization ?? '',
            'medical_license_number' => $user->medical_license_number ?? '',
            'staff_no' => $user->staff_no ?? '',
            'date_of_birth' => $user->date_of_birth ?? '',
            'emergency_contact_name' => $user->emergency_contact_name ?? '',
            'emergency_contact_phone' => $user->emergency_contact_phone ?? '',
            'years_of_experience' => $user->years_of_experience ?? 0,
            'certifications' => $user->certifications ?? '',
            'languages_spoken' => $user->languages_spoken ?? '',
            'last_login' => $user->last_login,
            'created_at' => $user->created_at,
        ]);
    }

    /**
     * Update doctor profile (updated to match admin pattern)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',  // ADD THIS LINE
            'department' => 'nullable|string|max:100',
            // REMOVE: 'bio' => 'nullable|string|max:1000',
            'specialization' => 'nullable|string|max:255',
            'medical_license_number' => 'nullable|string|max:100',
            'staff_no' => 'nullable|string|max:50',
            'date_of_birth' => 'nullable|date',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'years_of_experience' => 'nullable|integer|min:0',
            'certifications' => 'nullable|string',
            'languages_spoken' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user->update($validator->validated());
            
            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user->fresh()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating doctor profile: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload avatar (updated to match admin pattern)
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid file',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            
            // Delete old avatar if exists
            if ($user->avatar_url) {
                $oldPath = str_replace('/storage/', '', $user->avatar_url);
                Storage::disk('public')->delete($oldPath);
            }

            if ($request->hasFile('avatar')) {
                $file = $request->file('avatar');
                $filename = 'doctor_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('avatars', $filename, 'public');
                
                $avatarUrl = '/storage/' . $path;
                $user->update(['avatar_url' => $avatarUrl]);
                
                return response()->json([
                    'message' => 'Avatar uploaded successfully',
                    'avatar_url' => url($avatarUrl)
                ]);
            }
            
            return response()->json(['message' => 'No file uploaded'], 400);
            
        } catch (\Exception $e) {
            Log::error('Error uploading avatar: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to upload avatar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove avatar (new method to match admin pattern)
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

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
            
        } catch (\Exception $e) {
            Log::error('Error removing avatar: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to remove avatar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ... rest of your methods remain the same ...
    // (I'm omitting the rest for brevity, but they should remain unchanged)

    /**
     * Get doctor's appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:all,scheduled,confirmed,completed,cancelled,no_show'
        ]);

        $user = $request->user();
        $status = $validated['status'] ?? 'all';

        $query = Appointment::with(['patient:id,name,student_id,email,phone,department', 'doctor:id,name'])
            ->where('doctor_id', $user->id)
            ->orderBy('date', 'desc')
            ->orderBy('time');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $appointments = $query->get();

        return response()->json([
            'appointments' => $appointments->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'date' => $appointment->date,
                    'time' => $appointment->time,
                    'status' => $appointment->status,
                    'priority' => $appointment->priority ?? 'normal', // ADD THIS LINE
                    'reason' => $appointment->reason,
                    'patient' => $appointment->patient ? [
                        'id' => $appointment->patient->id,
                        'name' => $appointment->patient->name,
                        'student_id' => $appointment->patient->student_id,
                        'email' => $appointment->patient->email,
                        'phone' => $appointment->patient->phone,
                        'department' => $appointment->patient->department
                    ] : null,
                    'doctor' => $appointment->doctor ? $appointment->doctor->only(['id', 'name']) : null
                ];
            }),
            'schedule_summary' => [
                'total_appointments' => $appointments->count(),
                'scheduled' => $appointments->where('status', 'scheduled')->count(),
                'confirmed' => $appointments->where('status', 'confirmed')->count(),
                'completed' => $appointments->where('status', 'completed')->count(),
                'cancelled' => $appointments->where('status', 'cancelled')->count(),
                'urgent_cases' => $appointments->where('priority', 'urgent')->count(), // ADD THIS
                'high_priority' => $appointments->where('priority', 'high')->count(), // ADD THIS
            ]
        ]);
    }
    /**
 * Update appointment status (enhanced to handle completion reports)
 */
public function updateAppointmentStatus(Request $request, $id): JsonResponse
{
    $validated = $request->validate([
        'status' => 'required|in:scheduled,confirmed,completed,cancelled,no_show',
        'completion_report' => 'sometimes|array',
        'completion_report.diagnosis' => 'required_if:status,completed|string',
        'completion_report.treatment_provided' => 'required_if:status,completed|string',
        'completion_report.medications_prescribed' => 'nullable|string',
        'completion_report.recommendations' => 'nullable|string',
        'completion_report.follow_up_required' => 'boolean',
        'completion_report.follow_up_date' => 'nullable|date',
        'completion_report.notes' => 'nullable|string',
    ]);

    try {
        DB::beginTransaction();

        $appointment = Appointment::where('doctor_id', $request->user()->id)
            ->findOrFail($id);

        // ✅ NEW: Block confirmation/completion if time hasn't arrived
        if (in_array($validated['status'], ['confirmed', 'completed'])) {
            $attendanceCheck = $this->canAttendToPatient(
                $request->user()->id, 
                $appointment->patient_id
            );
            
            if (!$attendanceCheck['can_attend']) {
                return response()->json([
                    'message' => 'Cannot update appointment status at this time',
                    'reason' => $attendanceCheck['reason'],
                    'appointment_time' => $attendanceCheck['appointment_time'] ?? null,
                    'can_attend_from' => $attendanceCheck['can_attend_from'] ?? null,
                    'current_time' => $attendanceCheck['current_time'] ?? null
                ], 403);
            }
        }

        // Update appointment status
        $updateData = [
            'status' => $validated['status'],
            'updated_at' => now()
        ];

        // If completing appointment, add completion report
        if ($validated['status'] === 'completed' && isset($validated['completion_report'])) {
            $updateData['completion_report'] = json_encode($validated['completion_report']);
            $updateData['completed_at'] = now();
        }

        $appointment->update($updateData);

        // If completing appointment with completion report, create medical record and prescription
        if ($validated['status'] === 'completed' && isset($validated['completion_report'])) {
            $completionReport = $validated['completion_report'];

            // Create medical record
            $medicalRecord = MedicalRecord::create([
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $request->user()->id,
                'appointment_id' => $appointment->id,
                'created_by' => $request->user()->id,
                'diagnosis' => $completionReport['diagnosis'],
                'treatment' => $completionReport['treatment_provided'],
                'notes' => $completionReport['notes'] ?? null,
                'visit_date' => $appointment->date
            ]);

            // Create prescription if medications were prescribed
            if (!empty($completionReport['medications_prescribed'])) {
                $prescription = Prescription::create([
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $request->user()->id,
                    'notes' => "Prescribed during appointment completion on " . $appointment->date . ". Original medications text: " . $completionReport['medications_prescribed'],
                    'status' => 'active'
                ]);

                // Parse medications from the completion report
                $this->createMedicationsFromText($prescription, $completionReport['medications_prescribed'], $appointment);
            }
        }

        DB::commit();

        return response()->json([
            'message' => 'Appointment status updated successfully',
            'appointment' => $appointment->load(['patient', 'doctor']),
            'medical_record_created' => $validated['status'] === 'completed' && isset($validated['completion_report']),
            'prescription_created' => $validated['status'] === 'completed' && !empty($validated['completion_report']['medications_prescribed'] ?? '')
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error updating appointment status: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to update appointment status',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Check if doctor can attend to patient (appointment time has arrived)
 */
/**
 * Check if doctor can attend to patient (appointment time has arrived)
 */
private function canAttendToPatient($doctorId, $patientId): array
{
    // Get the patient's appointment with this doctor
    $appointment = Appointment::where('doctor_id', $doctorId)
        ->where('patient_id', $patientId)
        ->whereIn('status', ['scheduled', 'confirmed'])
        ->where('date', '<=', now()->format('Y-m-d'))
        ->orderBy('date', 'desc')
        ->orderBy('time', 'desc')
        ->first();
    
    if (!$appointment) {
        return [
            'can_attend' => false,
            'reason' => 'No active appointment found for this patient'
        ];
    }
    
    // ✅ NEW CHECK: For walk-ins, only allow if status is 'confirmed'
    if ($appointment->priority === 'urgent' || isset($appointment->is_walk_in)) {
        if ($appointment->status !== 'confirmed') {
            return [
                'can_attend' => false,
                'reason' => 'Walk-in patient must be confirmed by clinical staff before treatment',
                'appointment_status' => $appointment->status
            ];
        }
        
        // Walk-in is confirmed, allow treatment immediately
        return [
            'can_attend' => true,
            'appointment' => $appointment
        ];
    }
    
    // ✅ STRICT TIME CHECK for regular appointments
    try {
        $timeString = $appointment->time instanceof \Carbon\Carbon 
            ? $appointment->time->format('H:i:s')
            : trim((string) $appointment->time);
        
        $dateTimeString = $appointment->date . ' ' . $timeString;
        $appointmentDateTime = Carbon::parse($dateTimeString);
        
    } catch (\Exception $e) {
        Log::error('Error parsing appointment datetime', [
            'appointment_id' => $appointment->id,
            'date' => $appointment->date,
            'time' => $appointment->time,
            'error' => $e->getMessage()
        ]);
        
        // If parsing fails, block access for safety
        return [
            'can_attend' => false,
            'reason' => 'It is not possible to attend to this patient at this time',
            'appointment' => $appointment
        ];
    }
    
    $now = Carbon::now();
    
    // ✅ STRICT RULE: Allow attendance 15 minutes before appointment
    $gracePeriod = 15; // minutes
    $canAttendFrom = $appointmentDateTime->copy()->subMinutes($gracePeriod);
    
    // ✅ Block if appointment time hasn't arrived yet
    if ($now->lt($canAttendFrom)) {
        return [
            'can_attend' => false,
            'reason' => "Appointment is scheduled for {$appointmentDateTime->format('F j, Y')} at {$appointmentDateTime->format('g:i A')}. You can start attending from {$canAttendFrom->format('g:i A')}.",
            'appointment_time' => $appointmentDateTime->format('Y-m-d H:i'),
            'can_attend_from' => $canAttendFrom->format('Y-m-d H:i'),
            'current_time' => $now->format('Y-m-d H:i')
        ];
    }
    
    // ✅ Time has arrived - allow attendance
    return [
        'can_attend' => true,
        'appointment' => $appointment
    ];
}

/**
 * Check if doctor can prescribe to a patient
 */
public function canPrescribeToPatient(Request $request, $patientId): JsonResponse
{
    $attendanceCheck = $this->canAttendToPatient($request->user()->id, $patientId);
    
    if (!$attendanceCheck['can_attend']) {
        return response()->json([
            'can_prescribe' => false,
            'reason' => $attendanceCheck['reason'],
            'appointment_time' => $attendanceCheck['appointment_time'] ?? null,
            'can_attend_from' => $attendanceCheck['can_attend_from'] ?? null
        ], 403);
    }
    
    return response()->json([
        'can_prescribe' => true,
        'appointment' => [
            'id' => $attendanceCheck['appointment']->id,
            'date' => $attendanceCheck['appointment']->date,
            'time' => $attendanceCheck['appointment']->time,
            'status' => $attendanceCheck['appointment']->status
        ]
    ]);
}

/**
 * Helper method to create medications from text
 */
private function createMedicationsFromText($prescription, $medicationsText, $appointment)
{
    // Split medications by lines or semicolons
    $medicationLines = preg_split('/[;\n]/', $medicationsText);
    
    foreach ($medicationLines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        // Try to parse the medication line
        // Common formats:
        // "Medication Name - Dosage - Instructions"
        // "Medication Name, Dosage, Instructions"
        // "Medication Name (Dosage) - Instructions"
        
        $name = 'Not specified';
        $dosage = 'As directed';
        $instructions = 'As directed by doctor';
        
        // Pattern 1: "Name - Dosage - Instructions"
        if (strpos($line, ' - ') !== false) {
            $parts = explode(' - ', $line);
            $name = trim($parts[0]);
            $dosage = trim($parts[1] ?? 'As directed');
            $instructions = trim($parts[2] ?? 'As directed by doctor');
        }
        // Pattern 2: "Name, Dosage, Instructions"
        elseif (strpos($line, ', ') !== false) {
            $parts = explode(', ', $line);
            $name = trim($parts[0]);
            $dosage = trim($parts[1] ?? 'As directed');
            $instructions = trim($parts[2] ?? 'As directed by doctor');
        }
        // Pattern 3: "Name (Dosage) Instructions"
        elseif (preg_match('/^(.+?)\s*\((.+?)\)\s*(.*)$/', $line, $matches)) {
            $name = trim($matches[1]);
            $dosage = trim($matches[2]);
            $instructions = trim($matches[3]) ?: 'As directed by doctor';
        }
        // Pattern 4: Just medication name
        else {
            $name = $line;
        }
        
        // Create the medication entry
        $prescription->medications()->create([
            'name' => $name,
            'dosage' => $dosage,
            'instructions' => $instructions,
            'start_date' => $appointment->date,
            'end_date' => date('Y-m-d', strtotime($appointment->date . ' + 7 days')), // Default 7 days
            'frequency' => 'daily',
            'created_by' => auth()->id(),
            'patient_id' => $appointment->patient_id,
            'status' => 'active'
        ]);
    }
}

/**
 * Get prescriptions for a specific patient
 */
public function getPatientPrescriptions(Request $request, $patientId): JsonResponse
{
    try {
        $doctor = $request->user();
        
        // Check if doctor has access to this patient
        $hasAccess = Appointment::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->exists();
            
        if (!$hasAccess) {
            return response()->json([
                'error' => 'Access denied',
                'message' => 'You do not have access to this patient\'s prescriptions'
            ], 403);
        }
        
        // Get ALL prescriptions for this patient (not just current doctor's)
        $prescriptions = Prescription::where('patient_id', $patientId)
            ->with([
                'doctor:id,name',
                'medications' => function($query) {
                    $query->orderBy('start_date', 'desc');
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'prescriptions' => $prescriptions,
            'count' => $prescriptions->count()
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching patient prescriptions: ' . $e->getMessage());
        return response()->json([
            'error' => 'Failed to load prescriptions',
            'message' => $e->getMessage()
        ], 500);
    }
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
        'force' => 'sometimes|boolean'
    ]);

    try {
        // ✅ NEW: Check if doctor can attend to this patient
        $attendanceCheck = $this->canAttendToPatient($request->user()->id, $validated['patient_id']);
        
        if (!$attendanceCheck['can_attend']) {
            return response()->json([
                'message' => 'Cannot create prescription at this time',
                'reason' => $attendanceCheck['reason'],
                'appointment_time' => $attendanceCheck['appointment_time'] ?? null,
                'can_attend_from' => $attendanceCheck['can_attend_from'] ?? null
            ], 403);
        }

        DB::beginTransaction();

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
                'created_by' => auth()->id(),
                'patient_id' => $validated['patient_id'],
                'status' => 'active',
                'frequency' => 'daily'
            ]);
        }

        DB::commit();

        return response()->json([
            'message' => 'Prescription created successfully',
            'data' => $prescription->load(['patient:id,name', 'doctor:id,name', 'medications'])
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Prescription creation error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to create prescription',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Update doctor availability
     */
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
            
            $user->update([
                'available_days' => json_encode($validated['available_days']),
                'working_hours_start' => $validated['working_hours_start'],
                'working_hours_end' => $validated['working_hours_end'],
                'is_available' => true
            ]);

            return response()->json([
                'message' => 'Availability updated successfully',
                'data' => [
                    'available_days' => $validated['available_days'],
                    'working_hours' => [
                        'start' => $validated['working_hours_start'],
                        'end' => $validated['working_hours_end']
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating doctor availability: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createMedicalRecord(Request $request, $patientId)
{
    $validated = $request->validate([
        'diagnosis' => 'required|string|max:1000',
        'treatment' => 'required|string|max:1000',
        'notes' => 'nullable|string',
        'visit_date' => 'required|date',
        'has_prescription' => 'boolean',
        'medications' => 'sometimes|array|min:1',
        'medications.*.name' => 'required_if:has_prescription,true|string|max:255',
        'medications.*.dosage' => 'required_if:has_prescription,true|string|max:100',
        'medications.*.instructions' => 'required_if:has_prescription,true|string',
        'medications.*.start_date' => 'required_if:has_prescription,true|date',
        'medications.*.end_date' => 'required_if:has_prescription,true|date|after_or_equal:medications.*.start_date',
        'medications.*.frequency' => 'sometimes|string|in:daily,twice_daily,weekly,as_needed',
    ]);

    try {
        // ✅ NEW: Check if doctor can attend to this patient
        $attendanceCheck = $this->canAttendToPatient($request->user()->id, $patientId);
        
        if (!$attendanceCheck['can_attend']) {
            return response()->json([
                'message' => 'Cannot create medical record at this time',
                'reason' => $attendanceCheck['reason'],
                'appointment_time' => $attendanceCheck['appointment_time'] ?? null,
                'can_attend_from' => $attendanceCheck['can_attend_from'] ?? null
            ], 403);
        }

        DB::beginTransaction();

        // Create medical record
        $record = MedicalRecord::create([
            'patient_id' => $patientId,
            'doctor_id' => $request->user()->id,
            'appointment_id' => $attendanceCheck['appointment']->id ?? null, // Link to appointment
            'created_by' => $request->user()->id,
            'diagnosis' => $validated['diagnosis'],
            'treatment' => $validated['treatment'],
            'notes' => $validated['notes'] ?? null,
            'visit_date' => $validated['visit_date']
        ]);

        $prescription = null;

        // Create prescription if medications are provided
        if ($validated['has_prescription'] && !empty($validated['medications'])) {
            $prescription = Prescription::create([
                'patient_id' => $patientId,
                'doctor_id' => $request->user()->id,
                'notes' => "Created with medical record #" . $record->id,
                'status' => 'active'
            ]);

            // Add medications to prescription
            foreach ($validated['medications'] as $medication) {
                $prescription->medications()->create([
                    'name' => $medication['name'],
                    'dosage' => $medication['dosage'],
                    'instructions' => $medication['instructions'],
                    'start_date' => $medication['start_date'],
                    'end_date' => $medication['end_date'],
                    'frequency' => $medication['frequency'] ?? 'daily',
                    'created_by' => $request->user()->id,
                    'patient_id' => $patientId,
                    'status' => 'active'
                ]);
            }
        }

        DB::commit();

        $response = [
            'message' => 'Medical record created successfully',
            'record' => $record->load('doctor:id,name')
        ];

        if ($prescription) {
            $response['prescription'] = $prescription->load(['medications', 'doctor:id,name']);
            $response['message'] = 'Medical record and prescription created successfully';
        }

        return response()->json($response, 201);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Medical record creation error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Failed to create medical record',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get medical records for a specific patient
 */
public function getPatientMedicalRecords(Request $request, $patientId)
{
    $records = MedicalRecord::where('patient_id', $patientId)
        ->where('doctor_id', $request->user()->id)
        ->with('doctor:id,name')
        ->orderBy('visit_date', 'desc')
        ->get();

    return response()->json([
        'medical_records' => $records
    ]);
}

    /**
     * Get detailed statistics with period filter
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->get('period', 'month');
        
        switch ($period) {
            case 'week':
                $startDate = now()->startOfWeek();
                $endDate = now()->endOfWeek();
                break;
            case 'quarter':
                $startDate = now()->startOfQuarter();
                $endDate = now()->endOfQuarter();
                break;
            case 'year':
                $startDate = now()->startOfYear();
                $endDate = now()->endOfYear();
                break;
            default: // month
                $startDate = now()->startOfMonth();
                $endDate = now()->endOfMonth();
        }
        
        $appointments = Appointment::where('doctor_id', $user->id)
            ->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->get();
            
        $appointmentsByStatus = $appointments->groupBy('status')->map->count();
        
        return response()->json([
            'period' => $period,
            'date_range' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'summary' => [
                'total_appointments' => $appointments->count(),
                'unique_patients' => $appointments->unique('patient_id')->count(),
                'completed_appointments' => $appointments->where('status', 'completed')->count(),
                'cancelled_appointments' => $appointments->where('status', 'cancelled')->count(),
            ],
            'appointments_by_status' => $appointmentsByStatus,
            'weekly_stats' => $period === 'week' ? $this->getWeeklyStatistics($user->id) : null,
        ]);
    }

    // Helper methods
    private function notifyPatientConfirmed($appointment)
    {
        Log::info("Patient {$appointment->patient->name} notified of confirmed appointment {$appointment->id}");
    }

    private function notifyPatientRescheduled($appointment)
    {
        Log::info("Patient {$appointment->patient->name} notified of rescheduled appointment {$appointment->id}");
    }
}