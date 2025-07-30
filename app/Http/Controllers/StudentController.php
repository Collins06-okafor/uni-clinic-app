<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\Course;
use App\Models\Assignment;
use App\Models\Grade;
use App\Models\MedicalRecord;

class StudentController extends Controller
{
    /**
     * Student dashboard with comprehensive overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get student statistics (in real app, fetch from database)
        $upcomingAppointments = 2; // Appointment::where('patient_id', $user->id)->upcoming()->count();
        $pendingAssignments = 5; // Assignment::where('student_id', $user->id)->pending()->count();
        $currentCourses = 8; // $user->courses()->active()->count();
        $currentGPA = 3.75; // Calculate from grades
        
        return response()->json([
            'message' => 'Welcome to Student Dashboard',
            'student' => [
                'name' => $user->name,
                'university_id' => $user->university_id,
                'department' => $user->department,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'year' => $this->getStudentYear($user), // Helper method
            ],
            'academic_summary' => [
                'current_semester' => 'Fall 2024',
                'current_courses' => $currentCourses,
                'pending_assignments' => $pendingAssignments,
                'current_gpa' => $currentGPA,
                'completed_credits' => 90,
                'total_required_credits' => 120
            ],
            'health_summary' => [
                'upcoming_appointments' => $upcomingAppointments,
                'last_checkup' => '2024-01-15',
                'health_status' => 'Good',
                'vaccination_up_to_date' => true
            ],
            'recent_activities' => [
                'Last assignment submitted: Introduction to Algorithms - 2 days ago',
                'Next appointment: General Checkup - Tomorrow 2:00 PM',
                'New course announcement: Database Systems',
                'Grade posted: Data Structures (A-)'
            ],
            'quick_actions' => [
                'view_courses',
                'view_grades',
                'schedule_appointment',
                'view_assignments',
                'update_profile'
            ]
        ]);
    }

    /**
     * Get student's enrolled courses
     */
    public function getCourses(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // In real implementation, fetch from database with relationships
        $courses = [
            [
                'id' => 1,
                'name' => 'Introduction to Computer Science',
                'code' => 'CS101',
                'credits' => 3,
                'instructor' => 'Dr. Sarah Smith',
                'instructor_email' => 'sarah.smith@university.edu',
                'schedule' => [
                    'days' => ['Monday', 'Wednesday', 'Friday'],
                    'time' => '10:00 AM - 11:00 AM',
                    'location' => 'Computer Lab A'
                ],
                'semester' => 'Fall 2024',
                'status' => 'active',
                'current_grade' => 'B+',
                'attendance' => '92%'
            ],
            [
                'id' => 2,
                'name' => 'Calculus I',
                'code' => 'MATH101',
                'credits' => 4,
                'instructor' => 'Prof. Michael Johnson',
                'instructor_email' => 'michael.johnson@university.edu',
                'schedule' => [
                    'days' => ['Tuesday', 'Thursday'],
                    'time' => '2:00 PM - 3:30 PM',
                    'location' => 'Mathematics Building 201'
                ],
                'semester' => 'Fall 2024',
                'status' => 'active',
                'current_grade' => 'A-',
                'attendance' => '95%'
            ],
            [
                'id' => 3,
                'name' => 'Database Systems',
                'code' => 'CS301',
                'credits' => 3,
                'instructor' => 'Dr. Emily Davis',
                'instructor_email' => 'emily.davis@university.edu',
                'schedule' => [
                    'days' => ['Monday', 'Wednesday'],
                    'time' => '1:00 PM - 2:30 PM',
                    'location' => 'Computer Lab B'
                ],
                'semester' => 'Fall 2024',
                'status' => 'active',
                'current_grade' => 'A',
                'attendance' => '98%'
            ]
        ];

        return response()->json([
            'courses' => $courses,
            'summary' => [
                'total_courses' => count($courses),
                'total_credits' => array_sum(array_column($courses, 'credits')),
                'average_grade' => 'A-',
                'semester' => 'Fall 2024'
            ]
        ]);
    }

    /**
     * Get student's grades and academic performance
     */
    public function getGrades(Request $request): JsonResponse
    {
        $user = $request->user();
        $semester = $request->get('semester', 'current');
        
        $grades = [
            [
                'course_code' => 'CS101',
                'course_name' => 'Introduction to Computer Science',
                'semester' => 'Fall 2024',
                'instructor' => 'Dr. Sarah Smith',
                'final_grade' => 'B+',
                'grade_points' => 3.3,
                'credits' => 3,
                'components' => [
                    'midterm_exam' => ['score' => 85, 'weight' => 30, 'grade' => 'B'],
                    'final_exam' => ['score' => 88, 'weight' => 40, 'grade' => 'B+'],
                    'assignments' => ['score' => 92, 'weight' => 20, 'grade' => 'A-'],
                    'participation' => ['score' => 95, 'weight' => 10, 'grade' => 'A']
                ]
            ],
            [
                'course_code' => 'MATH101',
                'course_name' => 'Calculus I',
                'semester' => 'Fall 2024',
                'instructor' => 'Prof. Michael Johnson',
                'final_grade' => 'A-',
                'grade_points' => 3.7,
                'credits' => 4,
                'components' => [
                    'midterm_exam' => ['score' => 90, 'weight' => 35, 'grade' => 'A-'],
                    'final_exam' => ['score' => 92, 'weight' => 35, 'grade' => 'A-'],
                    'homework' => ['score' => 95, 'weight' => 20, 'grade' => 'A'],
                    'quizzes' => ['score' => 88, 'weight' => 10, 'grade' => 'B+']
                ]
            ]
        ];

        return response()->json([
            'grades' => $grades,
            'gpa_calculation' => [
                'semester_gpa' => 3.52,
                'cumulative_gpa' => 3.75,
                'total_credits_attempted' => 90,
                'total_credits_earned' => 90,
                'total_grade_points' => 337.5
            ],
            'academic_standing' => [
                'status' => 'Good Standing',
                'dean_list' => true,
                'probation' => false,
                'graduation_progress' => '75%'
            ]
        ]);
    }

    /**
     * Get student's assignments
     */
    public function getAssignments(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->get('status', 'all'); // all, pending, submitted, graded
        
        $assignments = [
            [
                'id' => 1,
                'title' => 'Algorithm Analysis Project',
                'course_code' => 'CS101',
                'course_name' => 'Introduction to Computer Science',
                'instructor' => 'Dr. Sarah Smith',
                'description' => 'Analyze time complexity of various sorting algorithms',
                'due_date' => '2024-02-15T23:59:00Z',
                'assigned_date' => '2024-02-01T00:00:00Z',
                'status' => 'pending',
                'max_points' => 100,
                'submission_type' => 'file_upload',
                'requirements' => ['PDF report', 'Source code', 'Test cases'],
                'late_penalty' => '10% per day'
            ],
            [
                'id' => 2,
                'title' => 'Calculus Problem Set 5',
                'course_code' => 'MATH101',
                'course_name' => 'Calculus I',
                'instructor' => 'Prof. Michael Johnson',
                'description' => 'Integration problems and applications',
                'due_date' => '2024-02-12T23:59:00Z',
                'assigned_date' => '2024-02-05T00:00:00Z',
                'status' => 'submitted',
                'submission_date' => '2024-02-11T20:30:00Z',
                'max_points' => 50,
                'earned_points' => 47,
                'grade' => 'A-',
                'feedback' => 'Excellent work on integration techniques. Minor error in problem 7.'
            ],
            [
                'id' => 3,
                'title' => 'Database Design Project',
                'course_code' => 'CS301',
                'course_name' => 'Database Systems',
                'instructor' => 'Dr. Emily Davis',
                'description' => 'Design a normalized database for a library system',
                'due_date' => '2024-02-20T23:59:00Z',
                'assigned_date' => '2024-02-08T00:00:00Z',
                'status' => 'in_progress',
                'max_points' => 150,
                'submission_type' => 'online_submission',
                'requirements' => ['ER Diagram', 'SQL Schema', 'Sample Queries']
            ]
        ];

        // Filter by status if requested
        if ($status !== 'all') {
            $assignments = array_filter($assignments, function($assignment) use ($status) {
                return $assignment['status'] === $status;
            });
        }

        return response()->json([
            'assignments' => array_values($assignments),
            'summary' => [
                'total_assignments' => count($assignments),
                'pending' => count(array_filter($assignments, fn($a) => $a['status'] === 'pending')),
                'submitted' => count(array_filter($assignments, fn($a) => $a['status'] === 'submitted')),
                'graded' => count(array_filter($assignments, fn($a) => isset($a['grade']))),
                'average_grade' => 'A-'
            ]
        ]);
    }

    /**
     * Submit an assignment
     */
    public function submitAssignment(Request $request, $assignmentId): JsonResponse
    {
        $request->validate([
            'submission_text' => 'nullable|string',
            'files' => 'nullable|array',
            'files.*' => 'file|max:10240', // 10MB max per file
            'comments' => 'nullable|string|max:500'
        ]);

        // In real implementation, handle file uploads and save to database
        
        return response()->json([
            'message' => 'Assignment submitted successfully',
            'assignment_id' => $assignmentId,
            'submission_id' => rand(1000, 9999),
            'submitted_at' => now(),
            'status' => 'submitted',
            'files_uploaded' => $request->hasFile('files') ? count($request->file('files')) : 0
        ], 201);
    }

    /**
     * Get student's medical history and health records
     */
    public function getMedicalHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $medicalHistory = [
            [
                'id' => 1,
                'date' => '2024-01-15',
                'type' => 'General Checkup',
                'doctor' => 'Dr. Wilson',
                'doctor_specialization' => 'General Medicine',
                'notes' => 'Annual health screening completed. All vitals normal.',
                'prescriptions' => [],
                'follow_up_required' => false,
                'status' => 'completed'
            ],
            [
                'id' => 2,
                'date' => '2023-11-20',
                'type' => 'Vaccination',
                'doctor' => 'Nurse Johnson',
                'notes' => 'Flu vaccination administered. No adverse reactions.',
                'vaccines' => ['Influenza 2023-2024'],
                'next_due' => '2024-11-20',
                'status' => 'completed'
            ],
            [
                'id' => 3,
                'date' => '2023-09-10',
                'type' => 'Sports Physical',
                'doctor' => 'Dr. Anderson',
                'doctor_specialization' => 'Sports Medicine',
                'notes' => 'Cleared for athletic participation. No restrictions.',
                'clearance' => 'Full participation approved',
                'valid_until' => '2024-09-10',
                'status' => 'completed'
            ]
        ];

        return response()->json([
            'patient_info' => [
                'name' => $user->name,
                'student_id' => $user->university_id,
                'department' => $user->department,
                'emergency_contact' => 'Not on file', // In real app, fetch from profile
                'blood_type' => 'O+', // In real app, store in medical profile
                'allergies' => ['None known'], // In real app, store in medical profile
                'chronic_conditions' => [] // In real app, store in medical profile
            ],
            'medical_history' => $medicalHistory,
            'upcoming_appointments' => [
                [
                    'id' => 101,
                    'date' => '2024-02-15',
                    'time' => '2:00 PM',
                    'type' => 'Follow-up Checkup',
                    'doctor' => 'Dr. Wilson',
                    'location' => 'Health Center Room 201'
                ]
            ],
            'health_summary' => [
                'last_visit' => '2024-01-15',
                'next_appointment' => '2024-02-15',
                'vaccinations_up_to_date' => true,
                'health_status' => 'Good'
            ]
        ]);
    }

    /**
     * Get student's appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->get('status', 'all'); // all, upcoming, past, cancelled
        
        $appointments = [
            [
                'id' => 101,
                'date' => '2024-02-15',
                'time' => '14:00:00',
                'type' => 'Follow-up Checkup',
                'doctor' => [
                    'name' => 'Dr. Wilson',
                    'specialization' => 'General Medicine',
                    'phone' => '+1-555-0123'
                ],
                'location' => 'Health Center Room 201',
                'status' => 'confirmed',
                'reason' => 'Routine follow-up after annual checkup',
                'notes' => 'Bring previous test results',
                'estimated_duration' => 30
            ],
            [
                'id' => 102,
                'date' => '2024-01-15',
                'time' => '10:00:00',
                'type' => 'General Checkup',
                'doctor' => [
                    'name' => 'Dr. Wilson',
                    'specialization' => 'General Medicine',
                    'phone' => '+1-555-0123'
                ],
                'location' => 'Health Center Room 201',
                'status' => 'completed',
                'reason' => 'Annual health screening',
                'diagnosis' => 'Healthy - no issues found',
                'prescriptions' => [],
                'actual_duration' => 25
            ]
        ];

        return response()->json([
            'appointments' => $appointments,
            'summary' => [
                'total_appointments' => count($appointments),
                'upcoming' => 1,
                'completed' => 1,
                'cancelled' => 0
            ]
        ]);
    }

    /**
     * Schedule a new medical appointment
     */
    public function scheduleAppointment(Request $request): JsonResponse
    {
        $request->validate([
            'preferred_date' => 'required|date|after:today',
            'preferred_time' => 'required|date_format:H:i',
            'appointment_type' => 'required|in:general_checkup,follow_up,vaccination,sports_physical,mental_health',
            'doctor_preference' => 'nullable|string',
            'reason' => 'required|string|max:500',
            'urgency' => 'required|in:routine,urgent,emergency'
        ]);

        // In real implementation, check doctor availability and create appointment
        
        return response()->json([
            'message' => 'Appointment request submitted successfully',
            'appointment_id' => rand(1000, 9999),
            'status' => 'pending_confirmation',
            'requested_date' => $request->preferred_date,
            'requested_time' => $request->preferred_time,
            'type' => $request->appointment_type,
            'reason' => $request->reason,
            'next_steps' => 'You will receive a confirmation email within 24 hours'
        ], 201);
    }

    /**
     * Helper method to determine student year based on credits or enrollment date
     */
    private function getStudentYear($user): string
    {
        // In real implementation, calculate based on credits earned or enrollment date
        $credits = 90; // Get from database
        
        if ($credits < 30) return 'Freshman';
        if ($credits < 60) return 'Sophomore';
        if ($credits < 90) return 'Junior';
        return 'Senior';
    }
}