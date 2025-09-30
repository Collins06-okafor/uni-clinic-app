<?php
// app/Http/Controllers/AppointmentController.php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use App\Models\AcademicHoliday;
use App\Models\StaffSchedule;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    /**
     * Create new appointment with holiday validation
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'date' => 'required|date|after:today',
            'time' => 'required|date_format:H:i',
            'type' => 'required|string|max:100',
            'reason' => 'required|string|max:500',
            'priority' => 'nullable|in:normal,urgent,emergency'
        ]);

        try {
            $patient = $request->user();
            $doctor = User::findOrFail($request->doctor_id);
            $appointmentDate = Carbon::parse($request->date);
            $appointmentTime = $request->time;

            // Validate doctor role
            if ($doctor->role !== 'doctor') {
                return response()->json([
                    'message' => 'Selected user is not a doctor'
                ], 422);
            }

            // Check for holidays that block appointments
            $holidayCheck = $this->checkHolidayConflicts($appointmentDate, $doctor);
            if ($holidayCheck['blocked']) {
                return response()->json([
                    'message' => 'Appointments cannot be booked on this date due to academic calendar',
                    'blocking_holidays' => $holidayCheck['holidays'],
                    'suggested_dates' => $this->suggestAlternativeDates($appointmentDate, $doctor)
                ], 422);
            }

            // Check doctor availability
            $availabilityCheck = $this->checkDoctorAvailability($doctor, $appointmentDate, $appointmentTime);
            if (!$availabilityCheck['available']) {
                return response()->json([
                    'message' => 'Doctor is not available at requested time',
                    'conflicts' => $availabilityCheck['conflicts'],
                    'available_slots' => $this->generateAvailableSlots($doctor, $appointmentDate)
                ], 422);
            }

            // Create appointment
            $appointment = Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'date' => $appointmentDate->format('Y-m-d'),
                'time' => Carbon::createFromFormat('H:i', $appointmentTime),
                'type' => $request->type,
                'reason' => $request->reason,
                'status' => Appointment::STATUS_SCHEDULED,
                'priority' => $request->priority ?? Appointment::PRIORITY_NORMAL
            ]);

            $appointment->load(['patient', 'doctor']);

            return response()->json([
                'message' => 'Appointment scheduled successfully',
                'appointment' => $appointment
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check for holiday conflicts
     */
    protected function checkHolidayConflicts($date, $doctor)
    {
        $holidays = AcademicHoliday::active()
            ->blocksAppointments()
            ->forDate($date)
            ->get();

        $blockingHolidays = [];
        
        foreach ($holidays as $holiday) {
            $doctorStaffType = $doctor->staff_type ?? 'clinical';
            $doctorDepartmentId = $doctor->department_id;

            if ($holiday->affectsStaff($doctorStaffType) && 
                $holiday->affectsDepartment($doctorDepartmentId)) {
                $blockingHolidays[] = $holiday;
            }
        }

        return [
            'blocked' => !empty($blockingHolidays),
            'holidays' => $blockingHolidays
        ];
    }

    /**
     * Check doctor availability considering schedule and existing appointments
     */
    protected function checkDoctorAvailability($doctor, $date, $time)
    {
        $conflicts = [];
        $available = true;

        // Check staff schedule
        $schedule = StaffSchedule::where('user_id', $doctor->id)
            ->active()
            ->first();

        if ($schedule && !$schedule->isAvailableOnDate($date)) {
            $available = false;
            $conflicts[] = 'Doctor not scheduled to work on this day';
        }

        // Check for existing appointments
        $existingAppointment = Appointment::where('doctor_id', $doctor->id)
            ->where('date', $date->format('Y-m-d'))
            ->where('time', Carbon::createFromFormat('H:i', $time))
            ->whereIn('status', [Appointment::STATUS_SCHEDULED, Appointment::STATUS_CONFIRMED])
            ->first();

        if ($existingAppointment) {
            $available = false;
            $conflicts[] = 'Time slot already booked';
        }

        // Check working hours
        if ($schedule) {
            $requestTime = Carbon::createFromFormat('H:i', $time);
            $startTime = Carbon::createFromFormat('H:i', $schedule->working_hours_start->format('H:i'));
            $endTime = Carbon::createFromFormat('H:i', $schedule->working_hours_end->format('H:i'));

            if ($requestTime->lt($startTime) || $requestTime->gt($endTime)) {
                $available = false;
                $conflicts[] = 'Outside working hours';
            }
        }

        return [
            'available' => $available,
            'conflicts' => $conflicts
        ];
    }

    /**
     * Get available appointment slots for a doctor on a specific date
     */
    public function getAvailableSlots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'date' => 'required|date|after:today'
        ]);

        try {
            $doctor = User::findOrFail($request->doctor_id);
            $date = Carbon::parse($request->date);

            // Check if date is blocked by holidays
            $holidayCheck = $this->checkHolidayConflicts($date, $doctor);
            if ($holidayCheck['blocked']) {
                return response()->json([
                    'available_slots' => [],
                    'message' => 'No slots available due to academic calendar',
                    'blocking_holidays' => $holidayCheck['holidays']
                ]);
            }

            $availableSlots = $this->generateAvailableSlots($doctor, $date);

            return response()->json([
                'date' => $date->format('Y-m-d'),
                'doctor' => $doctor->only(['id', 'name', 'specialization']),
                'available_slots' => $availableSlots,
                'total_slots' => count($availableSlots)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch available slots',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to generate available time slots
     */
    protected function generateAvailableSlots($doctor, $date)
    {
        $schedule = StaffSchedule::where('user_id', $doctor->id)->active()->first();
        
        if (!$schedule || !$schedule->isAvailableOnDate($date)) {
            return [];
        }

        $slots = [];
        $startTime = Carbon::createFromFormat('H:i', $schedule->working_hours_start->format('H:i'));
        $endTime = Carbon::createFromFormat('H:i', $schedule->working_hours_end->format('H:i'));
        
        // Generate 30-minute slots
        $currentTime = $startTime->copy();
        while ($currentTime->lt($endTime)) {
            // Check if slot is available
            $existingAppointment = Appointment::where('doctor_id', $doctor->id)
                ->where('date', $date->format('Y-m-d'))
                ->where('time', $currentTime)
                ->whereIn('status', [Appointment::STATUS_SCHEDULED, Appointment::STATUS_CONFIRMED])
                ->exists();

            if (!$existingAppointment) {
                $slots[] = $currentTime->format('H:i');
            }

            $currentTime->addMinutes(30);
        }

        return $slots;
    }

    /**
     * Suggest alternative dates when requested date is blocked
     */
    protected function suggestAlternativeDates($blockedDate, $doctor, $daysToCheck = 14)
    {
        $suggestions = [];
        $checkDate = $blockedDate->copy()->addDay();
        
        for ($i = 0; $i < $daysToCheck && count($suggestions) < 5; $i++) {
            $holidayCheck = $this->checkHolidayConflicts($checkDate, $doctor);
            
            if (!$holidayCheck['blocked']) {
                $availableSlots = $this->generateAvailableSlots($doctor, $checkDate);
                if (!empty($availableSlots)) {
                    $suggestions[] = [
                        'date' => $checkDate->format('Y-m-d'),
                        'day_name' => $checkDate->format('l'),
                        'available_slots_count' => count($availableSlots),
                        'first_available_slot' => $availableSlots[0] ?? null
                    ];
                }
            }
            
            $checkDate->addDay();
        }

        return $suggestions;
    }

    /**
     * Get appointment history for patient with holiday info
     */
    public function getPatientAppointments(Request $request): JsonResponse
    {
        try {
            $patient = $request->user();
            
            $appointments = Appointment::where('patient_id', $patient->id)
                ->with(['doctor', 'blockedByHoliday'])
                ->orderBy('date', 'desc')
                ->orderBy('time', 'desc')
                ->paginate(20);

            return response()->json($appointments);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get doctor's schedule with holiday information
     */
    public function getDoctorSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        try {
            $doctor = User::findOrFail($request->doctor_id);
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            // Get appointments in date range
            $appointments = Appointment::where('doctor_id', $doctor->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->with('patient')
                ->get();

            // Get holidays in date range
            $holidays = AcademicHoliday::active()
                ->forDateRange($startDate, $endDate)
                ->get()
                ->filter(function($holiday) use ($doctor) {
                    $doctorStaffType = $doctor->staff_type ?? 'clinical';
                    $doctorDepartmentId = $doctor->department_id;
                    return $holiday->affectsStaff($doctorStaffType) && 
                           $holiday->affectsDepartment($doctorDepartmentId);
                });

            return response()->json([
                'doctor' => $doctor->only(['id', 'name', 'specialization', 'department']),
                'date_range' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d')
                ],
                'appointments' => $appointments,
                'holidays' => $holidays,
                'statistics' => [
                    'total_appointments' => $appointments->count(),
                    'holiday_days' => $holidays->sum('duration_in_days'),
                    'available_days' => $startDate->diffInDays($endDate) + 1 - $holidays->sum('duration_in_days')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch doctor schedule',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel appointment
     */
    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Check if user can cancel this appointment
            if ($appointment->patient_id !== $user->id && 
                $appointment->doctor_id !== $user->id && 
                !in_array($user->role, ['admin', 'clinical_staff'])) {
                return response()->json([
                    'message' => 'Not authorized to cancel this appointment'
                ], 403);
            }

            // Check if appointment can be cancelled
            if (in_array($appointment->status, [Appointment::STATUS_COMPLETED, Appointment::STATUS_CANCELLED])) {
                return response()->json([
                    'message' => 'Appointment cannot be cancelled'
                ], 422);
            }

            $appointment->cancel();

            return response()->json([
                'message' => 'Appointment cancelled successfully',
                'appointment' => $appointment->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}