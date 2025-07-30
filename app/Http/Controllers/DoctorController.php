<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use App\Models\Prescription;

class DoctorController extends Controller
{
    /**
     * Doctor dashboard with comprehensive medical overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get doctor statistics (in real app, fetch from database)
        $todayAppointments = 12;
        $completedToday = 8;
        $pendingToday = 4;
        $emergencyCases = 1;
        $totalPatients = 245;
        
        return response()->json([
            'message' => 'Welcome to Doctor Dashboard',
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization,
                'license_number' => $user->medical_license_number,
                'employee_id' => $user->employee_id,
                'title' => $user->full_title ?? "Dr. {$user->name}",
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
                'no_shows' => 1
            ],
            'patient_statistics' => [
                'total_active_patients' => $totalPatients,
                'new_patients_this_month' => 15,
                'follow_up_required' => 23,
                'high_priority_cases' => 3
            ],
            'upcoming_appointments' => [
                [
                    'id' => 201,
                    'time' => '14:00:00',
                    'patient' => [
                        'name' => 'John Doe',
                        'student_id' => 'STU123456',
                        'age' => 20,
                        'department' => 'Computer Science'
                    ],
                    'type' => 'Follow-up',
                    'reason' => 'Review test results',
                    'duration' => 30,
                    'priority' => 'normal'
                ],
                [
                    'id' => 202,
                    'time' => '14:30:00',
                    'patient' => [
                        'name' => 'Jane Smith',
                        'student_id' => 'STU789012',
                        'age' => 19,
                        'department' => 'Biology'
                    ],
                    'type' => 'Initial Consultation',
                    'reason' => 'General health assessment',
                    'duration' => 45,
                    'priority' => 'normal'
                ],
                [
                    'id' => 203,
                    'time' => '15:15:00',
                    'patient' => [
                        'name' => 'Mike Johnson',
                        'student_id' => 'STU456789',
                        'age' => 21,
                        'department' => 'Engineering'
                    ],
                    'type' => 'Emergency',
                    'reason' => 'Sports injury - knee pain',
                    'duration' => 60,
                    'priority' => 'high'
                ]
            ],
            'recent_activities' => [
                'Completed annual physical for STU123789 - 1 hour ago',
                'Updated medical record for STU456123 - 2 hours ago',
                'Prescribed medication for STU789456 - 3 hours ago',
                'Emergency consultation completed - 4 hours ago'
            ],
            'alerts' => [
                [
                    'type' => 'high_priority',
                    'message' => 'Patient STU999888 requires immediate follow-up',
                    'action_required' => 'Schedule within 48 hours'
                ],
                [
                    'type' => 'reminder',
                    'message' => '3 patients have pending prescription renewals',
                    'action_required' => 'Review and approve'
                ]
            ]
        ]);
    }

    /**
     * Get doctor's patient list
     */
    public function getPatients(Request $request): JsonResponse
    {
        $user = $request->user();
        $search = $request->get('search');
        $status = $request->get('status', 'all'); // all, active, follow_up, emergency
        $department = $request->get('department');
        
        // In real implementation, fetch with proper filtering and pagination
        $patients = [
            [
                'id' => 1,
                'name' => 'John Doe',
                'student_id' => 'STU123456',
                'email' => 'john.doe@university.edu',
                'phone' => '+1-555-0101',
                'age' => 20,
                'gender' => 'Male',
                'department' => 'Computer Science',
                'year' => 'Junior',
                'blood_type' => 'O+',
                'allergies' => ['Penicillin'],
                'chronic_conditions' => [],
                'last_visit' => '2024-01-15',
                'next_appointment' => '2024-02-15',
                'status' => 'active',
                'priority' => 'normal',
                'total_visits' => 5,
                'emergency_contact' => [
                    'name' => 'Mary Doe',
                    'relationship' => 'Mother',
                    'phone' => '+1-555-0102'
                ]
            ],
            [
                'id' => 2,
                'name' => 'Jane Smith',
                'student_id' => 'STU789012',
                'email' => 'jane.smith@university.edu',
                'phone' => '+1-555-0201',
                'age' => 19,
                'gender' => 'Female',
                'department' => 'Biology',
                'year' => 'Sophomore',
                'blood_type' => 'A+',
                'allergies' => ['None known'],
                'chronic_conditions' => ['Asthma (mild)'],
                'last_visit' => '2024-01-10',
                'next_appointment' => null,
                'status' => 'follow_up_required',
                'priority' => 'high',
                'total_visits' => 12,
                'emergency_contact' => [
                    'name' => 'Robert Smith',
                    'relationship' => 'Father',
                    'phone' => '+1-555-0202'
                ]
            ],
            [
                'id' => 3,
                'name' => 'Mike Johnson',
                'student_id' => 'STU456789',
                'email' => 'mike.johnson@university.edu',
                'phone' => '+1-555-0301',
                'age' => 21,
                'gender' => 'Male',
                'department' => 'Engineering',
                'year' => 'Senior',
                'blood_type' => 'B-',
                'allergies' => ['Shellfish', 'Latex'],
                'chronic_conditions' => [],
                'last_visit' => '2024-02-01',
                'next_appointment' => '2024-02-10',
                'status' => 'emergency',
                'priority' => 'urgent',
                'total_visits' => 3,
                'emergency_contact' => [
                    'name' => 'Linda Johnson',
                    'relationship' => 'Mother',
                    'phone' => '+1-555-0302'
                ]
            ]
        ];

        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => count($patients),
                'active' => 1,
                'follow_up_required' => 1,
                'emergency_cases' => 1,
                'by_department' => [
                    'Computer Science' => 1,
                    'Biology' => 1,
                    'Engineering' => 1
                ]
            ],
            'filters_applied' => [
                'search' => $search,
                'status' => $status,
                'department' => $department
            ]
        ]);
    }

    /**
     * Get detailed patient information
     */
    public function getPatient(Request $request, $patientId): JsonResponse
    {
        // In real implementation, fetch patient with all related data
        $patient = [
            'id' => $patientId,
            'personal_info' => [
                'name' => 'John Doe',
                'student_id' => 'STU123456',
                'email' => 'john.doe@university.edu',
                'phone' => '+1-555-0101',
                'age' => 20,
                'date_of_birth' => '2004-03-15',
                'gender' => 'Male',
                'department' => 'Computer Science',
                'year' => 'Junior',
                'address' => '123 University Ave, Dorm Room 205'
            ],
            'medical_info' => [
                'blood_type' => 'O+',
                'height' => '175 cm',
                'weight' => '70 kg',
                'bmi' => 22.9,
                'allergies' => ['Penicillin'],
                'chronic_conditions' => [],
                'current_medications' => [],
                'vaccination_status' => 'Up to date',
                'emergency_contact' => [
                    'name' => 'Mary Doe',
                    'relationship' => 'Mother',
                    'phone' => '+1-555-0102',
                    'email' => 'mary.doe@email.com'
                ]
            ],
            'visit_history' => [
                [
                    'id' => 501,
                    'date' => '2024-01-15',
                    'type' => 'General Checkup',
                    'chief_complaint' => 'Annual health screening',
                    'diagnosis' => 'Healthy - no acute issues',
                    'treatment' => 'Routine screening completed',
                    'prescriptions' => [],
                    'follow_up' => 'Annual checkup in 1 year',
                    'doctor_notes' => 'Patient in good health. All vitals normal.',
                    'vital_signs' => [
                        'blood_pressure' => '120/80',
                        'heart_rate' => '72 bpm',
                        'temperature' => '98.6°F',
                        'respiratory_rate' => '16/min'
                    ]
                ],
                [
                    'id' => 502,
                    'date' => '2023-11-20',
                    'type' => 'Vaccination',
                    'chief_complaint' => 'Flu vaccination',
                    'diagnosis' => 'Vaccination administered',
                    'treatment' => 'Influenza vaccine given',
                    'prescriptions' => [],
                    'follow_up' => 'None required',
                    'doctor_notes' => 'No adverse reactions. Patient tolerated well.',
                    'vaccines_given' => ['Influenza 2023-2024']
                ]
            ],
            'upcoming_appointments' => [
                [
                    'id' => 201,
                    'date' => '2024-02-15',
                    'time' => '14:00:00',
                    'type' => 'Follow-up',
                    'reason' => 'Review annual checkup results',
                    'status' => 'confirmed'
                ]
            ],
            'test_results' => [
                [
                    'id' => 301,
                    'date' => '2024-01-15',
                    'test_type' => 'Complete Blood Count',
                    'status' => 'completed',
                    'results' => [
                        'WBC' => '6.5 K/uL (Normal)',
                        'RBC' => '4.8 M/uL (Normal)',
                        'Hemoglobin' => '15.2 g/dL (Normal)',
                        'Hematocrit' => '45% (Normal)'
                    ],
                    'interpretation' => 'All values within normal limits'
                ]
            ]
        ];

        return response()->json($patient);
    }

    /**
     * Create a new medical record for a patient
     */
    public function createMedicalRecord(Request $request, $patientId): JsonResponse
    {
        $validated = $request->validate([
            'visit_date' => 'required|date',
            'visit_type' => 'required|in:general_checkup,follow_up,emergency,consultation,vaccination,sports_physical,mental_health',
            'chief_complaint' => 'required|string|max:500',
            'history_of_present_illness' => 'nullable|string',
            'physical_examination' => 'nullable|string',
            'diagnosis' => 'required|string|max:500',
            'treatment_plan' => 'required|string',
            'prescriptions' => 'nullable|array',
            'prescriptions.*.medication' => 'required|string',
            'prescriptions.*.dosage' => 'required|string',
            'prescriptions.*.frequency' => 'required|string',
            'prescriptions.*.duration' => 'required|string',
            'prescriptions.*.instructions' => 'nullable|string',
            'vital_signs' => 'nullable|array',
            'vital_signs.blood_pressure' => 'nullable|string',
            'vital_signs.heart_rate' => 'nullable|string',
            'vital_signs.temperature' => 'nullable|string',
            'vital_signs.respiratory_rate' => 'nullable|string',
            'vital_signs.weight' => 'nullable|string',
            'vital_signs.height' => 'nullable|string',
            'follow_up_required' => 'boolean',
            'follow_up_date' => 'nullable|date|after:visit_date',
            'notes' => 'nullable|string',
            'referrals' => 'nullable|array',
            'lab_orders' => 'nullable|array'
        ]);

        // In real implementation, save to database with proper relationships
        $recordId = rand(1000, 9999);
        
        return response()->json([
            'message' => 'Medical record created successfully',
            'record_id' => $recordId,
            'patient_id' => $patientId,
            'visit_date' => $validated['visit_date'],
            'created_by' => [
                'doctor_id' => $request->user()->id,
                'doctor_name' => $request->user()->name,
                'license_number' => $request->user()->medical_license_number
            ],
            'created_at' => now(),
            'prescriptions_count' => count($validated['prescriptions'] ?? []),
            'follow_up_required' => $validated['follow_up_required'],
            'follow_up_date' => $validated['follow_up_date'] ?? null
        ], 201);
    }

    /**
     * Get doctor's appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $user = $request->user();
        $date = $request->get('date', now()->format('Y-m-d'));
        $status = $request->get('status', 'all');
        
        $appointments = [
            [
                'id' => 201,
                'date' => '2024-02-10',
                'time' => '09:00:00',
                'duration' => 30,
                'patient' => [
                    'id' => 1,
                    'name' => 'John Doe',
                    'student_id' => 'STU123456',
                    'department' => 'Computer Science',
                    'phone' => '+1-555-0101'
                ],
                'type' => 'Follow-up',
                'reason' => 'Review test results',
                'status' => 'confirmed',
                'priority' => 'normal',
                'location' => 'Health Center Room 201',
                'notes' => 'Patient requested early morning appointment'
            ],
            [
                'id' => 202,
                'date' => '2024-02-10',
                'time' => '09:30:00',
                'duration' => 45,
                'patient' => [
                    'id' => 2,
                    'name' => 'Jane Smith',
                    'student_id' => 'STU789012',
                    'department' => 'Biology',
                    'phone' => '+1-555-0201'
                ],
                'type' => 'Initial Consultation',
                'reason' => 'General health assessment',
                'status' => 'confirmed',
                'priority' => 'normal',
                'location' => 'Health Center Room 201',
                'notes' => 'New patient - comprehensive evaluation needed'
            ],
            [
                'id' => 203,
                'date' => '2024-02-10',
                'time' => '14:00:00',
                'duration' => 60,
                'patient' => [
                    'id' => 3,
                    'name' => 'Mike Johnson',
                    'student_id' => 'STU456789',
                    'department' => 'Engineering',
                    'phone' => '+1-555-0301'
                ],
                'type' => 'Emergency',
                'reason' => 'Sports injury - knee pain',
                'status' => 'in_progress',
                'priority' => 'urgent',
                'location' => 'Health Center Room 203',
                'notes' => 'Basketball injury during practice'
            ]
        ];

        return response()->json([
            'appointments' => $appointments,
            'schedule_summary' => [
                'date' => $date,
                'total_appointments' => count($appointments),
                'confirmed' => 2,
                'completed' => 0,
                'cancelled' => 0,
                'no_shows' => 0,
                'total_duration' => array_sum(array_column($appointments, 'duration')),
                'first_appointment' => '09:00:00',
                'last_appointment' => '14:00:00'
            ]
        ]);
    }

    /**
     * Create a prescription
     */
    public function createPrescription(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'medications' => 'required|array|min:1',
            'medications.*.name' => 'required|string|max:255',
            'medications.*.dosage' => 'required|string|max:100',
            'medications.*.frequency' => 'required|string|max:100',
            'medications.*.duration' => 'required|string|max:100',
            'medications.*.instructions' => 'nullable|string|max:500',
            'medications.*.refills' => 'nullable|integer|min:0|max:5',
            'diagnosis' => 'required|string|max:500',
            'notes' => 'nullable|string|max:1000'
        ]);

        // In real implementation, save to database
        $prescriptionId = rand(10000, 99999);
        
        return response()->json([
            'message' => 'Prescription created successfully',
            'prescription_id' => $prescriptionId,
            'patient_id' => $validated['patient_id'],
            'prescribed_by' => [
                'doctor_id' => $request->user()->id,
                'doctor_name' => $request->user()->name,
                'license_number' => $request->user()->medical_license_number
            ],
            'medications_count' => count($validated['medications']),
            'prescribed_at' => now(),
            'status' => 'active'
        ], 201);
    }

    /**
     * Get doctor's schedule
     */
    public function getSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $week_start = $request->get('week_start', now()->startOfWeek()->format('Y-m-d'));
        
        // In real implementation, fetch from database
        $schedule = [
            'week_start' => $week_start,
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization
            ],
            'working_hours' => [
                'monday' => ['09:00', '17:00'],
                'tuesday' => ['09:00', '17:00'],
                'wednesday' => ['09:00', '17:00'],
                'thursday' => ['09:00', '17:00'],
                'friday' => ['09:00', '15:00'],
                'saturday' => 'off',
                'sunday' => 'off'
            ],
            'daily_schedule' => [
                [
                    'date' => '2024-02-10',
                    'day' => 'Monday',
                    'total_appointments' => 8,
                    'available_slots' => 4,
                    'appointments' => [
                        ['time' => '09:00', 'patient' => 'John Doe', 'type' => 'Follow-up'],
                        ['time' => '09:30', 'patient' => 'Jane Smith', 'type' => 'Consultation'],
                        ['time' => '10:30', 'patient' => 'Available', 'type' => 'free'],
                        ['time' => '11:00', 'patient' => 'Mike Johnson', 'type' => 'Checkup']
                    ]
                ],
                [
                    'date' => '2024-02-11',
                    'day' => 'Tuesday',
                    'total_appointments' => 6,
                    'available_slots' => 6,
                    'appointments' => [
                        ['time' => '09:00', 'patient' => 'Available', 'type' => 'free'],
                        ['time' => '09:30', 'patient' => 'Available', 'type' => 'free'],
                        ['time' => '10:00', 'patient' => 'Sarah Wilson', 'type' => 'Vaccination']
                    ]
                ]
            ],
            'statistics' => [
                'total_hours_this_week' => 38,
                'booked_hours' => 28,
                'available_hours' => 10,
                'utilization_rate' => 74
            ]
        ];

        return response()->json($schedule);
    }

    /**
     * Update appointment status
     */
    public function updateAppointmentStatus(Request $request, $appointmentId): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:confirmed,completed,cancelled,no_show,rescheduled',
            'notes' => 'nullable|string|max:500',
            'completion_notes' => 'nullable|string|max:1000'
        ]);

        // In real implementation, update appointment in database
        
        return response()->json([
            'message' => 'Appointment status updated successfully',
            'appointment_id' => $appointmentId,
            'new_status' => $validated['status'],
            'updated_by' => $request->user()->name,
            'updated_at' => now()
        ]);
    }

    /**
     * Get medical statistics for the doctor
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->get('period', 'month'); // week, month, quarter, year
        
        return response()->json([
            'period' => $period,
            'doctor' => [
                'name' => $user->name,
                'specialization' => $user->specialization
            ],
            'patient_statistics' => [
                'total_patients_seen' => 156,
                'new_patients' => 23,
                'follow_up_appointments' => 89,
                'emergency_cases' => 12,
                'average_patients_per_day' => 8.2
            ],
            'appointment_statistics' => [
                'total_appointments' => 168,
                'completed' => 156,
                'cancelled' => 8,
                'no_shows' => 4,
                'completion_rate' => 92.9,
                'average_duration' => 32
            ],
            'medical_activities' => [
                'prescriptions_written' => 124,
                'medical_records_created' => 156,
                'referrals_made' => 18,
                'lab_tests_ordered' => 45,
                'procedures_performed' => 23
            ],
            'top_diagnoses' => [
                'General Health Assessment' => 45,
                'Upper Respiratory Infection' => 23,
                'Sports Injury' => 18,
                'Anxiety/Stress' => 15,
                'Allergic Reaction' => 12
            ]
        ]);
    }
}