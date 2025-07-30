<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;

class ClinicalStaffController extends Controller
{
    /**
     * Clinical staff dashboard with nursing and support overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'message' => 'Welcome to Clinical Staff Dashboard',
            'staff_member' => [
                'name' => $user->name,
                'employee_id' => $user->employee_id,
                'department' => $user->department,
                'role' => 'Clinical Staff',
                'shift' => $this->getCurrentShift(), // Helper method
                'phone' => $user->phone,
                'email' => $user->email
            ],
            'today_overview' => [
                'date' => now()->format('Y-m-d'),
                'shift' => $this->getCurrentShift(),
                'scheduled_appointments' => 15,
                'completed_tasks' => 8,
                'pending_tasks' => 7,
                'patients_seen' => 12,
                'urgent_cases' => 2,
                'medications_administered' => 18
            ],
            'patient_queue' => [
                [
                    'id' => 301,
                    'patient_name' => 'John Doe',
                    'student_id' => 'STU123456',
                    'appointment_time' => '14:00:00',
                    'status' => 'waiting',
                    'priority' => 'normal',
                    'reason' => 'Blood pressure check',
                    'assigned_doctor' => 'Dr. Wilson'
                ],
                [
                    'id' => 302,
                    'patient_name' => 'Jane Smith',
                    'student_id' => 'STU789012',
                    'appointment_time' => '14:30:00',
                    'status' => 'in_progress',
                    'priority' => 'high',
                    'reason' => 'Allergy symptoms',
                    'assigned_doctor' => 'Dr. Anderson'
                ],
                [
                    'id' => 303,
                    'patient_name' => 'Mike Johnson',
                    'student_id' => 'STU456789',
                    'appointment_time' => '15:00:00',
                    'status' => 'scheduled',
                    'priority' => 'urgent',
                    'reason' => 'Sports injury follow-up',
                    'assigned_doctor' => 'Dr. Smith'
                ]
            ],
            'recent_activities' => [
                'Vital signs recorded for patient STU123456 - 30 minutes ago',
                'Medication administered to patient STU789012 - 1 hour ago',
                'Appointment scheduled for patient STU456789 - 1.5 hours ago',
                'Patient intake completed for STU111222 - 2 hours ago'
            ],
            'urgent_notifications' => [
                [
                    'type' => 'medication_due',
                    'message' => 'Patient STU789012 medication due in 15 minutes',
                    'priority' => 'high'
                ],
                [
                    'type' => 'follow_up_required',
                    'message' => '3 patients require follow-up calls today',
                    'priority' => 'medium'
                ]
            ],
            'department_stats' => [
                'total_staff_on_duty' => 8,
                'patients_in_facility' => 15,
                'average_wait_time' => '12 minutes',
                'bed_occupancy' => '75%'
            ]
        ]);
    }

    /**
     * Get patients assigned to clinical staff
     */
    public function getPatients(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->get('status', 'all'); // all, active, waiting, completed
        $priority = $request->get('priority'); // normal, high, urgent
        
        $patients = [
            [
                'id' => 1,
                'name' => 'John Doe',
                'student_id' => 'STU123456',
                'age' => 20,
                'gender' => 'Male',
                'department' => 'Computer Science',
                'room_number' => 'A-101',
                'status' => 'active',
                'priority' => 'normal',
                'admission_time' => '2024-02-10T09:00:00Z',
                'chief_complaint' => 'Regular checkup',
                'assigned_doctor' => 'Dr. Wilson',
                'vital_signs' => [
                    'blood_pressure' => '120/80',
                    'heart_rate' => '72 bpm',
                    'temperature' => '98.6°F',
                    'last_updated' => '2024-02-10T13:30:00Z'
                ],
                'medications' => [
                    [
                        'name' => 'Multivitamin',
                        'dosage' => '1 tablet',
                        'frequency' => 'Daily',
                        'next_due' => '2024-02-11T08:00:00Z'
                    ]
                ],
                'allergies' => ['Penicillin'],
                'notes' => 'Patient cooperative, no complications'
            ],
            [
                'id' => 2,
                'name' => 'Jane Smith',
                'student_id' => 'STU789012',
                'age' => 19,
                'gender' => 'Female',
                'department' => 'Biology',
                'room_number' => 'B-205',
                'status' => 'waiting',
                'priority' => 'high',
                'admission_time' => '2024-02-10T11:30:00Z',
                'chief_complaint' => 'Allergic reaction symptoms',
                'assigned_doctor' => 'Dr. Anderson',
                'vital_signs' => [
                    'blood_pressure' => '130/85',
                    'heart_rate' => '88 bpm',
                    'temperature' => '99.2°F',
                    'last_updated' => '2024-02-10T14:00:00Z'
                ],
                'medications' => [
                    [
                        'name' => 'Antihistamine',
                        'dosage' => '25mg',
                        'frequency' => 'Every 6 hours',
                        'next_due' => '2024-02-10T16:00:00Z'
                    ]
                ],
                'allergies' => ['Shellfish', 'Pollen'],
                'notes' => 'Monitor for improvement, possible discharge tomorrow'
            ],
            [
                'id' => 3,
                'name' => 'Mike Johnson',
                'student_id' => 'STU456789',
                'age' => 21,
                'gender' => 'Male',
                'department' => 'Engineering',
                'room_number' => 'C-312',
                'status' => 'completed',
                'priority' => 'urgent',
                'admission_time' => '2024-02-09T16:45:00Z',
                'discharge_time' => '2024-02-10T10:30:00Z',
                'chief_complaint' => 'Knee injury from basketball',
                'assigned_doctor' => 'Dr. Smith',
                'treatment_summary' => 'X-ray performed, minor sprain diagnosed, prescribed rest and ice',
                'follow_up_required' => true,
                'follow_up_date' => '2024-02-17T14:00:00Z'
            ]
        ];

        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => count($patients),
                'active' => 1,
                'waiting' => 1,
                'completed' => 1,
                'by_priority' => [
                    'normal' => 1,
                    'high' => 1,
                    'urgent' => 1
                ]
            ],
            'ward_status' => [
                'bed_capacity' => 20,
                'beds_occupied' => 15,
                'beds_available' => 5,
                'occupancy_rate' => 75
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

        // In real implementation, update patient record in database
        
        return response()->json([
            'message' => 'Patient information updated successfully',
            'patient_id' => $patientId,
            'updated_fields' => array_keys($validated),
            'updated_by' => $request->user()->name,
            'updated_at' => now(),
            'vital_signs_recorded' => isset($validated['vital_signs'])
        ]);
    }

    /**
     * Get appointments for clinical staff
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $user = $request->user();
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all');
        
        $appointments = [
            [
                'id' => 401,
                'date' => '2024-02-10',
                'time' => '09:00:00',
                'duration' => 30,
                'patient' => [
                    'name' => 'Sarah Wilson',
                    'student_id' => 'STU111222',
                    'age' => 22,
                    'department' => 'Psychology'
                ],
                'type' => 'Vaccination',
                'doctor' => 'Dr. Brown',
                'status' => 'completed',
                'room' => 'Vaccination Room A',
                'notes' => 'Annual flu vaccination administered',
                'staff_tasks' => [
                    'Prepare vaccination materials - Completed',
                    'Record vital signs - Completed',
                    'Post-vaccination monitoring - Completed'
                ]
            ],
            [
                'id' => 402,
                'date' => '2024-02-10',
                'time' => '10:30:00',
                'duration' => 45,
                'patient' => [
                    'name' => 'David Lee',
                    'student_id' => 'STU333444',
                    'age' => 19,
                    'department' => 'Chemistry'
                ],
                'type' => 'Blood Test',
                'doctor' => 'Dr. Wilson',
                'status' => 'in_progress',
                'room' => 'Lab Room 1',
                'notes' => 'Routine blood work for physical',
                'staff_tasks' => [
                    'Patient preparation - Completed',
                    'Blood draw - In Progress',
                    'Sample labeling - Pending',
                    'Lab submission - Pending'
                ]
            ],
            [
                'id' => 403,
                'date' => '2024-02-10',
                'time' => '14:00:00',
                'duration' => 60,
                'patient' => [
                    'name' => 'Emma Davis',
                    'student_id' => 'STU555666',
                    'age' => 20,
                    'department' => 'Art'
                ],
                'type' => 'Physical Therapy',
                'doctor' => 'Dr. Anderson',
                'status' => 'scheduled',
                'room' => 'PT Room 2',
                'notes' => 'Follow-up for ankle sprain',
                'staff_tasks' => [
                    'Setup PT equipment - Pending',
                    'Patient assessment - Pending',
                    'Exercise assistance - Pending',
                    'Progress documentation - Pending'
                ]
            ]
        ];

        return response()->json([
            'appointments' => $appointments,
            'schedule_summary' => [
                'date' => $date,
                'total_appointments' => count($appointments),
                'completed' => 1,
                'in_progress' => 1,
                'scheduled' => 1,
                'cancelled' => 0,
                'workload_hours' => 2.25
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
            'appointment_date' => 'required|date|after:today',
            'appointment_time' => 'required|date_format:H:i',
            'type' => 'required|in:consultation,follow_up,vaccination,blood_test,physical_therapy,emergency',
            'duration' => 'required|integer|min:15|max:180',
            'room' => 'sometimes|string|max:50',
            'reason' => 'required|string|max:500',
            'priority' => 'required|in:normal,high,urgent',
            'special_instructions' => 'nullable|string|max:1000',
            'equipment_needed' => 'nullable|array',
            'staff_required' => 'nullable|array'
        ]);

        // In real implementation, check availability and create appointment
        $appointmentId = rand(10000, 99999);
        
        return response()->json([
            'message' => 'Appointment scheduled successfully',
            'appointment_id' => $appointmentId,
            'patient_id' => $validated['patient_id'],
            'doctor_id' => $validated['doctor_id'],
            'scheduled_for' => $validated['appointment_date'] . ' ' . $validated['appointment_time'],
            'type' => $validated['type'],
            'duration' => $validated['duration'] . ' minutes',
            'priority' => $validated['priority'],
            'scheduled_by' => $request->user()->name,
            'scheduled_at' => now(),
            'status' => 'confirmed'
        ], 201);
    }

    /**
     * Get medical record for viewing
     */
    public function getMedicalRecord(Request $request, $recordId): JsonResponse
    {
        // In real implementation, fetch from database with proper authorization
        $record = [
            'id' => $recordId,
            'patient' => [
                'name' => 'John Doe',
                'student_id' => 'STU123456',
                'age' => 20,
                'gender' => 'Male',
                'department' => 'Computer Science'
            ],
            'visit_info' => [
                'date' => '2024-02-10',
                'time' => '10:30:00',
                'type' => 'Follow-up Appointment',
                'duration' => 45,
                'doctor' => 'Dr. Wilson',
                'clinical_staff' => $request->user()->name
            ],
            'vital_signs' => [
                'blood_pressure' => '120/80 mmHg',
                'heart_rate' => '72 bpm',
                'temperature' => '98.6°F (37°C)',
                'respiratory_rate' => '16/min',
                'oxygen_saturation' => '98%',
                'weight' => '70 kg',
                'height' => '175 cm',
                'bmi' => 22.9,
                'recorded_by' => $request->user()->name,
                'recorded_at' => '2024-02-10T10:35:00Z'
            ],
            'chief_complaint' => 'Follow-up for previous respiratory infection',
            'assessment' => [
                'general_appearance' => 'Alert and oriented, appears well',
                'respiratory' => 'Clear lung sounds, no distress',
                'cardiovascular' => 'Regular rate and rhythm, no murmurs',
                'other_systems' => 'Normal examination findings'
            ],
            'diagnosis' => 'Resolved upper respiratory infection, patient recovered',
            'treatment_plan' => [
                'Continue current medications as prescribed',
                'Return to regular activities',
                'Follow-up if symptoms return'
            ],
            'medications' => [
                [
                    'name' => 'Completed antibiotic course',
                    'status' => 'discontinued',
                    'completion_date' => '2024-02-08'
                ]
            ],
            'procedures_performed' => [
                'Vital signs assessment',
                'Physical examination',
                'Patient education'
            ],
            'staff_notes' => [
                'Patient cooperative throughout visit',
                'Vital signs stable and within normal limits',
                'No adverse reactions noted',
                'Patient education provided on infection prevention'
            ],
            'follow_up' => [
                'required' => false,
                'type' => 'as_needed',
                'instructions' => 'Return if symptoms recur or worsen'
            ]
        ];

        return response()->json($record);
    }

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
            'lot_number' => 'nullable|string|max:50',
            'expiration_date' => 'nullable|date|after:today',
            'patient_response' => 'nullable|in:good,mild_reaction,adverse_reaction',
            'side_effects' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000'
        ]);

        // In real implementation, record in database
        $recordId = rand(100000, 999999);
        
        return response()->json([
            'message' => 'Medication administration recorded successfully',
            'record_id' => $recordId,
            'patient_id' => $patientId,
            'medication' => $validated['medication_name'],
            'dosage' => $validated['dosage'],
            'administered_by' => $request->user()->name,
            'administered_at' => $validated['administration_time'],
            'status' => 'completed'
        ], 201);
    }

    /**
     * Get medication schedule for patients
     */
    public function getMedicationSchedule(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all'); // all, due, administered, overdue
        
        $medications = [
            [
                'id' => 501,
                'patient' => [
                    'name' => 'Jane Smith',
                    'student_id' => 'STU789012',
                    'room' => 'B-205'
                ],
                'medication' => 'Antihistamine',
                'dosage' => '25mg',
                'route' => 'oral',
                'scheduled_time' => '2024-02-10T16:00:00Z',
                'status' => 'due',
                'prescribing_doctor' => 'Dr. Anderson',
                'special_instructions' => 'Take with food',
                'priority' => 'high'
            ],
            [
                'id' => 502,
                'patient' => [
                    'name' => 'John Doe',
                    'student_id' => 'STU123456',
                    'room' => 'A-101'
                ],
                'medication' => 'Multivitamin',
                'dosage' => '1 tablet',
                'route' => 'oral',
                'scheduled_time' => '2024-02-10T08:00:00Z',
                'administered_time' => '2024-02-10T08:15:00Z',
                'status' => 'administered',
                'prescribing_doctor' => 'Dr. Wilson',
                'administered_by' => $request->user()->name,
                'patient_response' => 'good'
            ],
            [
                'id' => 503,
                'patient' => [
                    'name' => 'Mike Johnson',
                    'student_id' => 'STU456789',
                    'room' => 'C-312'
                ],
                'medication' => 'Pain Relief',
                'dosage' => '400mg',
                'route' => 'oral',
                'scheduled_time' => '2024-02-10T12:00:00Z',
                'status' => 'overdue',
                'prescribing_doctor' => 'Dr. Smith',
                'special_instructions' => 'Monitor for drowsiness',
                'priority' => 'urgent'
            ]
        ];

        return response()->json([
            'medications' => $medications,
            'summary' => [
                'date' => $date,
                'total_medications' => count($medications),
                'due' => 1,
                'administered' => 1,
                'overdue' => 1,
                'next_due' => '2024-02-10T16:00:00Z'
            ]
        ]);
    }

    /**
     * Update patient vital signs
     */
    public function updateVitalSigns(Request $request, $patientId): JsonResponse
    {
        $validated = $request->validate([
            'blood_pressure_systolic' => 'required|integer|min:60|max:250',
            'blood_pressure_diastolic' => 'required|integer|min:40|max:150',
            'heart_rate' => 'required|integer|min:30|max:200',
            'temperature' => 'required|numeric|min:90|max:110',
            'temperature_unit' => 'required|in:F,C',
            'respiratory_rate' => 'required|integer|min:8|max:40',
            'oxygen_saturation' => 'nullable|integer|min:70|max:100',
            'weight' => 'nullable|numeric|min:20|max:300',
            'height' => 'nullable|numeric|min:100|max:250',
            'pain_level' => 'nullable|integer|min:0|max:10',
            'notes' => 'nullable|string|max:500'
        ]);

        // In real implementation, save to database
        $vitalSignsId = rand(1000000, 9999999);
        
        return response()->json([
            'message' => 'Vital signs recorded successfully',
            'vital_signs_id' => $vitalSignsId,
            'patient_id' => $patientId,
            'recorded_by' => $request->user()->name,
            'recorded_at' => now(),
            'vital_signs' => [
                'blood_pressure' => $validated['blood_pressure_systolic'] . '/' . $validated['blood_pressure_diastolic'] . ' mmHg',
                'heart_rate' => $validated['heart_rate'] . ' bpm',
                'temperature' => $validated['temperature'] . '°' . $validated['temperature_unit'],
                'respiratory_rate' => $validated['respiratory_rate'] . '/min',
                'oxygen_saturation' => ($validated['oxygen_saturation'] ?? 'N/A') . '%',
                'pain_level' => $validated['pain_level'] ?? 'Not assessed'
            ],
            'alerts' => $this->checkVitalSignsAlerts($validated)
        ], 201);
    }

    /**
     * Get patient care tasks
     */
    public function getCareTasks(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all');
        
        $tasks = [
            [
                'id' => 601,
                'patient' => [
                    'name' => 'Jane Smith',
                    'student_id' => 'STU789012',
                    'room' => 'B-205'
                ],
                'task_type' => 'vital_signs',
                'description' => 'Record vital signs every 2 hours',
                'due_time' => '2024-02-10T16:00:00Z',
                'priority' => 'high',
                'status' => 'pending',
                'assigned_by' => 'Dr. Anderson',
                'estimated_duration' => 10,
                'special_notes' => 'Monitor blood pressure closely'
            ],
            [
                'id' => 602,
                'patient' => [
                    'name' => 'John Doe',
                    'student_id' => 'STU123456',
                    'room' => 'A-101'
                ],
                'task_type' => 'medication',
                'description' => 'Administer evening medication',
                'due_time' => '2024-02-10T20:00:00Z',
                'priority' => 'normal',
                'status' => 'pending',
                'assigned_by' => 'Dr. Wilson',
                'estimated_duration' => 5,
                'medication_details' => [
                    'name' => 'Multivitamin',
                    'dosage' => '1 tablet',
                    'route' => 'oral'
                ]
            ],
            [
                'id' => 603,
                'patient' => [
                    'name' => 'Sarah Wilson',
                    'student_id' => 'STU111222',
                    'room' => 'D-408'
                ],
                'task_type' => 'wound_care',
                'description' => 'Change dressing on knee wound',
                'due_time' => '2024-02-10T14:00:00Z',
                'completed_time' => '2024-02-10T14:15:00Z',
                'priority' => 'normal',
                'status' => 'completed',
                'assigned_by' => 'Dr. Smith',
                'completed_by' => $request->user()->name,
                'estimated_duration' => 15,
                'actual_duration' => 12,
                'completion_notes' => 'Wound healing well, no signs of infection'
            ]
        ];

        return response()->json([
            'tasks' => $tasks,
            'summary' => [
                'date' => $date,
                'total_tasks' => count($tasks),
                'pending' => 2,
                'completed' => 1,
                'overdue' => 0,
                'estimated_time_remaining' => 15
            ]
        ]);
    }

    /**
     * Complete a care task
     */
    public function completeTask(Request $request, $taskId): JsonResponse
    {
        $validated = $request->validate([
            'completion_notes' => 'required|string|max:1000',
            'actual_duration' => 'nullable|integer|min:1|max:180',
            'complications' => 'nullable|string|max:500',
            'follow_up_required' => 'boolean',
            'next_task_due' => 'nullable|date|after:now'
        ]);

        // In real implementation, update task in database
        
        return response()->json([
            'message' => 'Task completed successfully',
            'task_id' => $taskId,
            'completed_by' => $request->user()->name,
            'completed_at' => now(),
            'completion_notes' => $validated['completion_notes'],
            'actual_duration' => $validated['actual_duration'] ?? null,
            'follow_up_required' => $validated['follow_up_required'] ?? false
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
        
        // Blood pressure alerts
        if ($vitalSigns['blood_pressure_systolic'] > 140 || $vitalSigns['blood_pressure_diastolic'] > 90) {
            $alerts[] = [
                'type' => 'high_blood_pressure',
                'message' => 'Blood pressure elevated - notify doctor',
                'severity' => 'high'
            ];
        }
        
        // Heart rate alerts
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
        
        // Temperature alerts
        $tempInF = $vitalSigns['temperature_unit'] === 'C' 
            ? ($vitalSigns['temperature'] * 9/5) + 32 
            : $vitalSigns['temperature'];
            
        if ($tempInF > 100.4) {
            $alerts[] = [
                'type' => 'fever',
                'message' => 'Patient has fever - monitor closely',
                'severity' => 'high'
            ];
        }
        
        // Oxygen saturation alerts
        if (isset($vitalSigns['oxygen_saturation']) && $vitalSigns['oxygen_saturation'] < 95) {
            $alerts[] = [
                'type' => 'low_oxygen',
                'message' => 'Low oxygen saturation - immediate attention required',
                'severity' => 'critical'
            ];
        }
        
        return $alerts;
    }
}