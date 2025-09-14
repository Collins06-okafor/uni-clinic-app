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
        $weekStart = now()->startOfWeek();
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
        
        return $weekData;
    }

    /**
     * Get doctor's patient list
     */
    public function getPatients(Request $request): JsonResponse
    {
        $user = $request->user();
        $search = $request->get('search');
        
        // Get patients who have appointments with this doctor
        $patients = User::whereHas('appointments', function($query) use ($user) {
                $query->where('doctor_id', $user->id);
            })
            ->with(['medicalRecords' => function($query) use ($user) {
                $query->where('doctor_id', $user->id);
            }])
            ->when($search, function($query, $search) {
                return $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('student_id', 'like', "%{$search}%")
                      ->orWhere('staff_id', 'like', "%{$search}%");
                });
            })
            ->paginate(10);

        return response()->json([
            'patients' => $patients,
            'summary' => [
                'total_patients' => $patients->total(),
                'active' => $patients->count(),
                'follow_up_required' => 0,
                'emergency_cases' => 0,
            ]
        ]);
    }

    /**
     * Archive multiple patients
     */
    public function archivePatients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_ids' => 'required|array',
            'patient_ids.*' => 'integer|exists:users,id'
        ]);

        try {
            $doctor = $request->user();
            
            // Only archive patients assigned to this doctor
            $archivedCount = User::whereIn('id', $validated['patient_ids'])
                ->whereHas('appointments', function($query) use ($doctor) {
                    $query->where('doctor_id', $doctor->id);
                })
                ->update(['status' => 'archived']);

            return response()->json([
                'message' => "{$archivedCount} patients archived successfully",
                'archived_count' => $archivedCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error archiving patients: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to archive patients',
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
            'department' => $user->department ?? '',
            'bio' => $user->bio ?? '',
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
            'department' => 'nullable|string|max:100',
            'bio' => 'nullable|string|max:1000',
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

        $query = Appointment::with(['patient:id,name,student_id', 'doctor:id,name'])
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
                    'reason' => $appointment->reason,
                    'patient' => $appointment->patient ? $appointment->patient->only(['id', 'name', 'student_id']) : null,
                    'doctor' => $appointment->doctor ? $appointment->doctor->only(['id', 'name']) : null
                ];
            }),
            'schedule_summary' => [
                'total_appointments' => $appointments->count(),
                'scheduled' => $appointments->where('status', 'scheduled')->count(),
                'confirmed' => $appointments->where('status', 'confirmed')->count(),
                'completed' => $appointments->where('status', 'completed')->count(),
                'cancelled' => $appointments->where('status', 'cancelled')->count(),
            ]
        ]);
    }

    /**
     * Update appointment status
     */
    public function updateAppointmentStatus(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,confirmed,completed,cancelled,no_show'
        ]);

        $appointment = Appointment::where('doctor_id', $request->user()->id)
            ->findOrFail($id);

        $appointment->update([
            'status' => $validated['status'],
            'updated_at' => now()
        ]);

        return response()->json([
            'message' => 'Appointment status updated successfully',
            'appointment' => $appointment->load(['patient', 'doctor'])
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
            'force' => 'sometimes|boolean'
        ]);

        try {
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
                    'status' => 'active'
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Prescription created successfully',
                'data' => $prescription->load(['patient:id,name', 'doctor:id,name', 'medications'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
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