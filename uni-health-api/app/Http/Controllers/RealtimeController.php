<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Appointment;
use App\Models\User;
use App\Models\MedicalRecord;
use App\Events\DashboardStatsUpdated;

class RealtimeController extends Controller
{
    /**
     * Get real-time dashboard statistics
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        $today = now()->format('Y-m-d');
        
        $stats = [
            'appointments' => [
                'total_today' => Appointment::whereDate('date', $today)->count(),
                'pending' => Appointment::where('status', 'pending')->count(),
                'confirmed' => Appointment::where('status', 'confirmed')->count(),
                'completed' => Appointment::where('status', 'completed')->count(),
                'in_progress' => Appointment::where('status', 'in_progress')->count(),
            ],
            'patients' => [
                'total_registered' => User::whereIn('role', ['student', 'academic_staff'])->count(),
                'new_today' => User::whereDate('created_at', $today)->count(),
                'active_sessions' => $this->getActivePatientSessions(),
            ],
            'medical_activities' => [
                'records_created_today' => MedicalRecord::whereDate('created_at', $today)->count(),
                'medications_administered' => MedicalRecord::where('type', 'medication')
                    ->whereDate('created_at', $today)->count(),
                'vital_signs_recorded' => MedicalRecord::where('type', 'vital_signs')
                    ->whereDate('created_at', $today)->count(),
            ],
            'queue' => [
                'waiting_patients' => Appointment::where('status', 'waiting')->count(),
                'current_queue_length' => $this->getCurrentQueueLength(),
                'estimated_wait_time' => $this->getEstimatedWaitTime(),
            ],
            'system' => [
                'active_doctors' => User::where('role', 'doctor')
                    ->where('status', 'active')->count(),
                'active_clinical_staff' => User::where('role', 'clinical_staff')
                    ->where('status', 'active')->count(),
                'last_updated' => now()->toISOString(),
            ]
        ];

        return response()->json($stats);
    }

    /**
     * Broadcast updated stats to all connected clients
     */
    public function broadcastStatsUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel' => 'required|string',
            'stats' => 'required|array'
        ]);

        broadcast(new DashboardStatsUpdated($validated['channel'], $validated['stats']));

        return response()->json([
            'message' => 'Stats update broadcasted successfully',
            'channel' => $validated['channel'],
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * Get real-time patient queue
     */
    public function getPatientQueue(Request $request): JsonResponse
    {
        $queue = Appointment::with(['patient', 'doctor'])
            ->whereDate('date', now())
            ->whereIn('status', ['waiting', 'confirmed'])
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function($appointment, $index) {
                return [
                    'position' => $index + 1,
                    'patient_name' => $appointment->patient->name,
                    'student_id' => $appointment->patient->student_id,
                    'doctor' => $appointment->doctor->name,
                    'estimated_time' => now()->addMinutes($index * 15)->format('H:i'),
                    'priority' => $appointment->priority,
                    'status' => $appointment->status
                ];
            });

        return response()->json([
            'queue' => $queue,
            'total_waiting' => $queue->count(),
            'last_updated' => now()->toISOString()
        ]);
    }

    /**
     * Get real-time appointment updates
     */
    public function getAppointmentUpdates(Request $request): JsonResponse
    {
        $since = $request->get('since', now()->subMinutes(5));
        
        $updates = Appointment::with(['patient', 'doctor'])
            ->where('updated_at', '>=', $since)
            ->orderBy('updated_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function($appointment) {
                return [
                    'id' => $appointment->id,
                    'patient_name' => $appointment->patient->name,
                    'doctor_name' => $appointment->doctor->name,
                    'status' => $appointment->status,
                    'date' => $appointment->date,
                    'time' => $appointment->time,
                    'updated_at' => $appointment->updated_at->toISOString()
                ];
            });

        return response()->json([
            'updates' => $updates,
            'last_checked' => now()->toISOString()
        ]);
    }

    /**
     * Helper methods for calculations
     */
    private function getActivePatientSessions(): int
    {
        // This would require session tracking in production
        return Appointment::where('status', 'in_progress')->count();
    }

    private function getCurrentQueueLength(): int
    {
        return Appointment::whereIn('status', ['waiting', 'confirmed'])
            ->whereDate('date', now())
            ->count();
    }

    private function getEstimatedWaitTime(): string
    {
        $queueLength = $this->getCurrentQueueLength();
        $estimatedMinutes = $queueLength * 15; // 15 minutes per patient
        
        if ($estimatedMinutes < 60) {
            return $estimatedMinutes . ' minutes';
        } else {
            $hours = floor($estimatedMinutes / 60);
            $minutes = $estimatedMinutes % 60;
            return $hours . 'h ' . $minutes . 'm';
        }
    }
}