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
     * Academic staff dashboard focused on clinic administrative functions
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'message' => 'Welcome to Academic Staff Dashboard',
            'staff_member' => [
                'name' => $user->name,
                'employee_id' => $user->employee_id,
                'faculty' => $user->faculty,
                'department' => $user->department,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => 'Academic Staff'
            ],
            'clinic_overview' => [
                'date' => now()->format('Y-m-d'),
                'students_registered_today' => 8,
                'appointments_scheduled_today' => 25,
                'health_records_reviewed' => 12,
                'health_clearances_issued' => 6,
                'vaccination_compliance_checks' => 15
            ],
            'student_health_summary' => [
                'total_students_in_faculty' => 1250,
                'health_records_complete' => 1180,
                'vaccination_up_to_date' => 1156,
                'pending_health_clearances' => 24,
                'medical_holds' => 8,
                'students_with_chronic_conditions' => 45
            ],
            'faculty_health_stats' => [
                'faculty' => $user->faculty,
                'total_students' => 320,
                'active_health_records' => 315,
                'pending_physicals' => 12,
                'sports_clearances_needed' => 28,
                'immunization_compliance' => '96.8%'
            ],
            'recent_activities' => [
                'Health clearance approved for STU123456 - 30 minutes ago',
                'Vaccination record updated for STU789012 - 1 hour ago',
                'Medical hold placed on STU456789 - 2 hours ago',
                'Sports physical completed for STU111222 - 3 hours ago'
            ],
            'pending_actions' => [
                [
                    'type' => 'health_clearance',
                    'count' => 12,
                    'description' => 'Health clearances requiring review',
                    'priority' => 'medium'
                ],
                [
                    'type' => 'vaccination_follow_up',
                    'count' => 8,
                    'description' => 'Students need vaccination updates',
                    'priority' => 'high'
                ],
                [
                    'type' => 'medical_documentation',
                    'count' => 5,
                    'description' => 'Incomplete medical documentation',
                    'priority' => 'high'
                ]
            ]
        ]);
    }

    /**
     * Get students in academic staff's faculty/department for health tracking
     */
    public function getFacultyStudents(Request $request): JsonResponse
    {
        $user = $request->user();
        $healthStatus = $request->get('health_status', 'all'); // all, complete, incomplete, hold
        $vaccinationStatus = $request->get('vaccination_status', 'all');
        $department = $request->get('department');
        
        $students = [
            [
                'id' => 1,
                'name' => 'John Doe',
                'student_id' => 'STU123456',
                'email' => 'john.doe@university.edu',
                'department' => 'Computer Science',
                'year' => 'Junior',
                'health_status' => 'complete',
                'vaccination_status' => 'up_to_date',
                'last_checkup' => '2024-01-15',
                'medical_holds' => [],
                'sports_clearance' => 'approved',
                'emergency_contact' => [
                    'name' => 'Mary Doe',
                    'phone' => '+1-555-0102'
                ],
                'health_alerts' => []
            ],
            [
                'id' => 2,
                'name' => 'Jane Smith',
                'student_id' => 'STU789012',
                'email' => 'jane.smith@university.edu',
                'department' => 'Mathematics',
                'year' => 'Sophomore',
                'health_status' => 'incomplete',
                'vaccination_status' => 'pending',
                'last_checkup' => '2023-08-20',
                'medical_holds' => ['vaccination_incomplete'],
                'sports_clearance' => 'pending',
                'emergency_contact' => [
                    'name' => 'Robert Smith',
                    'phone' => '+1-555-0202'
                ],
                'health_alerts' => [
                    'Flu vaccination required',
                    'Annual physical overdue'
                ]
            ],
            [
                'id' => 3,
                'name' => 'Mike Johnson',
                'student_id' => 'STU456789',
                'email' => 'mike.johnson@university.edu',
                'department' => 'Physics',
                'year' => 'Senior',
                'health_status' => 'hold',
                'vaccination_status' => 'up_to_date',
                'last_checkup' => '2024-02-01',
                'medical_holds' => ['sports_injury_follow_up'],
                'sports_clearance' => 'restricted',
                'emergency_contact' => [
                    'name' => 'Linda Johnson',
                    'phone' => '+1-555-0302'
                ],
                'health_alerts' => [
                    'Requires orthopedic clearance for sports'
                ]
            ]
        ];

        return response()->json([
            'students' => $students,
            'faculty_summary' => [
                'faculty' => $user->faculty,
                'total_students' => count($students),
                'health_complete' => 1,
                'health_incomplete' => 1,
                'medical_holds' => 1,
                'vaccination_compliance' => '67%'
            ],
            'filters_applied' => [
                'health_status' => $healthStatus,
                'vaccination_status' => $vaccinationStatus,
                'department' => $department
            ]
        ]);
    }

    /**
     * Review and approve health clearances
     */
    public function reviewHealthClearance(Request $request, $studentId): JsonResponse
    {
        $validated = $request->validate([
            'clearance_type' => 'required|in:general,sports,clinical_rotation,laboratory,fieldwork',
            'approval_status' => 'required|in:approved,conditional,denied',
            'conditions' => 'nullable|string|max:1000',
            'valid_until' => 'nullable|date|after:today',
            'restrictions' => 'nullable|array',
            'follow_up_required' => 'boolean',
            'notes' => 'nullable|string|max:1000'
        ]);

        // In real implementation, update student health clearance in database
        
        return response()->json([
            'message' => 'Health clearance reviewed successfully',
            'student_id' => $studentId,
            'clearance_type' => $validated['clearance_type'],
            'status' => $validated['approval_status'],
            'reviewed_by' => $request->user()->name,
            'reviewed_at' => now(),
            'valid_until' => $validated['valid_until'] ?? null,
            'conditions' => $validated['conditions'] ?? null,
            'follow_up_required' => $validated['follow_up_required'] ?? false
        ]);
    }

    /**
     * Get health compliance reports for faculty
     */
    public function getHealthComplianceReport(Request $request): JsonResponse
    {
        $user = $request->user();
        $reportType = $request->get('report_type', 'faculty'); // faculty, department, all
        $timeframe = $request->get('timeframe', 'current_semester');
        
        return response()->json([
            'report_type' => $reportType,
            'timeframe' => $timeframe,
            'faculty' => $user->faculty,
            'generated_at' => now(),
            'overall_compliance' => [
                'total_students' => 320,
                'health_records_complete' => 298,
                'vaccination_compliant' => 310,
                'sports_clearances_current' => 156,
                'medical_holds_active' => 8,
                'compliance_rate' => '93.1%'
            ],
            'vaccination_breakdown' => [
                'measles_mumps_rubella' => ['compliant' => 318, 'non_compliant' => 2],
                'hepatitis_b' => ['compliant' => 315, 'non_compliant' => 5],
                'tuberculosis_screening' => ['compliant' => 320, 'non_compliant' => 0],
                'annual_flu' => ['compliant' => 298, 'non_compliant' => 22],
                'covid_19' => ['compliant' => 312, 'non_compliant' => 8]
            ],
            'health_clearances' => [
                'general_activities' => ['approved' => 298, 'pending' => 12, 'denied' => 0],
                'sports_activities' => ['approved' => 145, 'conditional' => 8, 'denied' => 3],
                'laboratory_work' => ['approved' => 187, 'pending' => 5, 'denied' => 1],
                'clinical_rotations' => ['approved' => 23, 'pending' => 2, 'denied' => 0]
            ],
            'medical_holds' => [
                'vaccination_incomplete' => 3,
                'medical_documentation_missing' => 2,
                'follow_up_required' => 2,
                'sports_injury_clearance' => 1
            ],
            'trends' => [
                'compliance_improvement' => '+2.3% from last semester',
                'vaccination_rate_trend' => 'Stable',
                'new_medical_holds' => 3,
                'resolved_holds' => 7
            ]
        ]);
    }

    /**
     * Manage student medical holds
     */
    public function manageStudentHold(Request $request, $studentId): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:place,remove,modify',
            'hold_type' => 'required|in:vaccination,medical_clearance,documentation,follow_up,sports_restriction',
            'reason' => 'required|string|max:500',
            'requirements' => 'nullable|array',
            'requirements.*' => 'string|max:255',
            'deadline' => 'nullable|date|after:today',
            'notify_student' => 'boolean',
            'notify_department' => 'boolean'
        ]);

        // In real implementation, update student hold status in database
        
        return response()->json([
            'message' => 'Student medical hold updated successfully',
            'student_id' => $studentId,
            'action' => $validated['action'],
            'hold_type' => $validated['hold_type'],
            'reason' => $validated['reason'],
            'managed_by' => $request->user()->name,
            'managed_at' => now(),
            'requirements' => $validated['requirements'] ?? [],
            'deadline' => $validated['deadline'] ?? null,
            'notifications_sent' => [
                'student' => $validated['notify_student'] ?? false,
                'department' => $validated['notify_department'] ?? false
            ]
        ]);
    }

    /**
     * Get vaccination tracking for faculty students
     */
    public function getVaccinationTracking(Request $request): JsonResponse
    {
        $user = $request->user();
        $vaccinationType = $request->get('vaccination_type', 'all');
        $status = $request->get('status', 'all'); // all, compliant, non_compliant, overdue
        
        $vaccinationData = [
            [
                'student_id' => 'STU123456',
                'student_name' => 'John Doe',
                'department' => 'Computer Science',
                'vaccinations' => [
                    'measles_mumps_rubella' => [
                        'status' => 'compliant',
                        'date_administered' => '2023-08-15',
                        'expires' => null,
                        'doses_received' => 2,
                        'doses_required' => 2
                    ],
                    'hepatitis_b' => [
                        'status' => 'compliant',
                        'date_administered' => '2023-08-15',
                        'expires' => null,
                        'doses_received' => 3,
                        'doses_required' => 3
                    ],
                    'annual_flu' => [
                        'status' => 'compliant',
                        'date_administered' => '2023-09-20',
                        'expires' => '2024-09-20',
                        'doses_received' => 1,
                        'doses_required' => 1
                    ]
                ],
                'overall_compliance' => 'compliant'
            ],
            [
                'student_id' => 'STU789012',
                'student_name' => 'Jane Smith',
                'department' => 'Mathematics',
                'vaccinations' => [
                    'measles_mumps_rubella' => [
                        'status' => 'compliant',
                        'date_administered' => '2023-07-10',
                        'expires' => null,
                        'doses_received' => 2,
                        'doses_required' => 2
                    ],
                    'hepatitis_b' => [
                        'status' => 'non_compliant',
                        'date_administered' => null,
                        'expires' => null,
                        'doses_received' => 0,
                        'doses_required' => 3
                    ],
                    'annual_flu' => [
                        'status' => 'overdue',
                        'date_administered' => '2022-10-15',
                        'expires' => '2023-10-15',
                        'doses_received' => 1,
                        'doses_required' => 1
                    ]
                ],
                'overall_compliance' => 'non_compliant'
            ]
        ];

        return response()->json([
            'vaccination_tracking' => $vaccinationData,
            'faculty_summary' => [
                'faculty' => $user->faculty,
                'total_students_tracked' => count($vaccinationData),
                'fully_compliant' => 1,
                'partially_compliant' => 0,
                'non_compliant' => 1,
                'overdue_vaccinations' => 1
            ],
            'vaccination_requirements' => [
                'measles_mumps_rubella' => 'Required - 2 doses',
                'hepatitis_b' => 'Required - 3 doses',
                'tuberculosis_screening' => 'Required - Annual',
                'annual_flu' => 'Recommended - Annual',
                'covid_19' => 'Required - As per current guidelines'
            ]
        ]);
    }

    /**
     * Generate health reports for administration
     */
    public function generateHealthReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => 'required|in:compliance_summary,vaccination_status,medical_holds,health_trends',
            'scope' => 'required|in:faculty,department,university',
            'date_range' => 'required|in:current_semester,academic_year,last_30_days,custom',
            'custom_start_date' => 'nullable|required_if:date_range,custom|date',
            'custom_end_date' => 'nullable|required_if:date_range,custom|date|after_or_equal:custom_start_date',
            'format' => 'sometimes|in:json,csv,pdf'
        ]);

        // In real implementation, generate actual reports
        $reportId = 'HEALTH_RPT_' . now()->format('YmdHis') . '_' . rand(1000, 9999);
        
        return response()->json([
            'message' => 'Health report generation initiated',
            'report_id' => $reportId,
            'report_type' => $validated['report_type'],
            'scope' => $validated['scope'],
            'date_range' => $validated['date_range'],
            'format' => $validated['format'] ?? 'json',
            'requested_by' => $request->user()->name,
            'requested_at' => now(),
            'estimated_completion' => now()->addMinutes(3),
            'status' => 'processing'
        ], 202);
    }

    /**
     * Update student health information
     */
    public function updateStudentHealthInfo(Request $request, $studentId): JsonResponse
    {
        $validated = $request->validate([
            'health_alerts' => 'nullable|array',
            'health_alerts.*' => 'string|max:255',
            'chronic_conditions' => 'nullable|array',
            'chronic_conditions.*' => 'string|max:255',
            'allergies' => 'nullable|array',
            'allergies.*' => 'string|max:255',
            'medications' => 'nullable|array',
            'medications.*.name' => 'required|string|max:255',
            'medications.*.dosage' => 'required|string|max:100',
            'medications.*.frequency' => 'required|string|max:100',
            'emergency_contact_updates' => 'nullable|array',
            'notes' => 'nullable|string|max:1000'
        ]);

        // In real implementation, update student health profile
        
        return response()->json([
            'message' => 'Student health information updated successfully',
            'student_id' => $studentId,
            'updated_fields' => array_keys($validated),
            'updated_by' => $request->user()->name,
            'updated_at' => now()
        ]);
    }

    /**
     * Get health-related appointment requests that need faculty approval
     */
    public function getHealthAppointmentRequests(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->get('status', 'pending'); // pending, approved, denied
        
        $appointmentRequests = [
            [
                'id' => 501,
                'student' => [
                    'name' => 'Sarah Wilson',
                    'student_id' => 'STU111222',
                    'department' => 'Computer Science'
                ],
                'appointment_type' => 'sports_physical',
                'requested_date' => '2024-02-15',
                'requested_time' => '14:00:00',
                'reason' => 'Required for basketball team participation',
                'urgency' => 'routine',
                'status' => 'pending',
                'faculty_approval_required' => true,
                'submitted_at' => '2024-02-08T10:30:00Z',
                'additional_info' => 'Student athlete requiring annual physical'
            ],
            [
                'id' => 502,
                'student' => [
                    'name' => 'David Lee',
                    'student_id' => 'STU333444',
                    'department' => 'Mathematics'
                ],
                'appointment_type' => 'vaccination',
                'requested_date' => '2024-02-12',
                'requested_time' => '10:00:00',
                'reason' => 'Hepatitis B vaccination series completion',
                'urgency' => 'routine',
                'status' => 'approved',
                'faculty_approval_required' => true,
                'approved_by' => $request->user()->name,
                'approved_at' => '2024-02-09T09:15:00Z',
                'submitted_at' => '2024-02-07T15:20:00Z'
            ]
        ];

        return response()->json([
            'appointment_requests' => $appointmentRequests,
            'summary' => [
                'total_requests' => count($appointmentRequests),
                'pending_approval' => 1,
                'approved' => 1,
                'denied' => 0
            ]
        ]);
    }

    /**
     * Approve or deny health appointment requests
     */
    public function reviewAppointmentRequest(Request $request, $requestId): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:approve,deny',
            'comments' => 'nullable|string|max:500',
            'conditions' => 'nullable|string|max:500',
            'priority_adjustment' => 'nullable|in:routine,urgent,emergency'
        ]);

        // In real implementation, update appointment request status
        
        return response()->json([
            'message' => 'Appointment request reviewed successfully',
            'request_id' => $requestId,
            'action' => $validated['action'],
            'reviewed_by' => $request->user()->name,
            'reviewed_at' => now(),
            'comments' => $validated['comments'] ?? null,
            'status' => $validated['action'] === 'approve' ? 'approved' : 'denied'
        ]);
    }
}