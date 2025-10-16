<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Appointment;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SuperAdminController extends Controller
{
    /**
     * Store a new privileged user (doctor, admin, staff)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:doctor,admin,clinical_staff,academic_staff',
            'department_id' => 'nullable|exists:departments,id',
            'staff_type' => 'nullable|in:clinical,academic'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'department_id' => $request->department_id,
            'staff_type' => $request->staff_type,
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ]);
    }

    /**
     * Delete a user by ID
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * List all privileged users
     */
    public function index()
    {
        \Log::info('=== SuperAdmin users called ===');
        try {
            $users = User::with('department')
                ->whereIn('role', ['doctor', 'admin', 'clinical_staff', 'academic_staff'])
                ->get();

            \Log::info('Filtered user count: ' . $users->count());

            return response()->json($users);
        } catch (\Exception $e) {
            \Log::error('SuperAdmin error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Dashboard statistics endpoint
     */
    public function getDashboardStats(Request $request)
    {
        try {
            $selectedDate = $request->input('date', Carbon::today()->toDateString());
            $selectedMonth = $request->input('month', Carbon::now()->month);
            $selectedYear = $request->input('year', Carbon::now()->year);

            $date = Carbon::parse($selectedDate);
            $startOfWeek = $date->copy()->startOfWeek();
            $endOfWeek = $date->copy()->endOfWeek();
            $startOfMonth = Carbon::create($selectedYear, $selectedMonth, 1)->startOfMonth();
            $endOfMonth = Carbon::create($selectedYear, $selectedMonth, 1)->endOfMonth();

            return response()->json([
                'daily_stats' => $this->getDailyStats($date),
                'weekly_stats' => $this->getWeeklyStats($startOfWeek, $endOfWeek),
                'monthly_stats' => $this->getMonthlyStats($startOfMonth, $endOfMonth),
                'overall_stats' => $this->getOverallStats(),
                'appointment_trends' => $this->getAppointmentTrends($selectedMonth, $selectedYear),
                'prescription_stats' => $this->getPrescriptionStats($date, $startOfMonth, $endOfMonth),
                'system_health' => $this->getSystemHealth(),
                'selected_date' => $date->toDateString(),
                'selected_week' => [
                    'start' => $startOfWeek->toDateString(),
                    'end' => $endOfWeek->toDateString()
                ],
                'selected_month' => [
                    'month' => $selectedMonth,
                    'year' => $selectedYear,
                    'start' => $startOfMonth->toDateString(),
                    'end' => $endOfMonth->toDateString()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Dashboard stats error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // --- Dashboard Helper Methods ---

    private function getDailyStats($date)
    {
        // CHANGED: appointment_date → date
        $appointments = Appointment::whereDate('date', $date->toDateString());

        return [
            'date' => $date->toDateString(),
            'total_appointments' => $appointments->count(),
            'scheduled' => (clone $appointments)->where('status', 'scheduled')->count(),
            'confirmed' => (clone $appointments)->where('status', 'confirmed')->count(),
            'completed' => (clone $appointments)->where('status', 'completed')->count(),
            'cancelled' => (clone $appointments)->where('status', 'cancelled')->count(),
            'no_show' => (clone $appointments)->where('status', 'no_show')->count(),
            'in_progress' => (clone $appointments)->where('status', 'in_progress')->count(),
            'pending' => (clone $appointments)->where('status', 'pending')->count(),
            'sessions_today' => (clone $appointments)
                ->whereIn('status', ['in_progress', 'completed'])
                ->count(),
            'completion_rate' => $this->calculateCompletionRate($appointments),
            'cancellation_rate' => $this->calculateCancellationRate($appointments)
        ];
    }

    private function getWeeklyStats($start, $end)
    {
        // CHANGED: appointment_date → date
        $appointments = Appointment::whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        return [
            'week_start' => $start->toDateString(),
            'week_end' => $end->toDateString(),
            'total_appointments' => $appointments->count(),
            'scheduled' => (clone $appointments)->where('status', 'scheduled')->count(),
            'confirmed' => (clone $appointments)->where('status', 'confirmed')->count(),
            'completed' => (clone $appointments)->where('status', 'completed')->count(),
            'cancelled' => (clone $appointments)->where('status', 'cancelled')->count(),
            'no_show' => (clone $appointments)->where('status', 'no_show')->count(),
            'in_progress' => (clone $appointments)->where('status', 'in_progress')->count(),
            'completion_rate' => $this->calculateCompletionRate($appointments),
            'cancellation_rate' => $this->calculateCancellationRate($appointments)
        ];
    }

    private function getMonthlyStats($start, $end)
    {
        // CHANGED: appointment_date → date
        $appointments = Appointment::whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        return [
            'month' => $start->format('F Y'),
            'month_start' => $start->toDateString(),
            'month_end' => $end->toDateString(),
            'total_appointments' => $appointments->count(),
            'scheduled' => (clone $appointments)->where('status', 'scheduled')->count(),
            'confirmed' => (clone $appointments)->where('status', 'confirmed')->count(),
            'completed' => (clone $appointments)->where('status', 'completed')->count(),
            'cancelled' => (clone $appointments)->where('status', 'cancelled')->count(),
            'no_show' => (clone $appointments)->where('status', 'no_show')->count(),
            'in_progress' => (clone $appointments)->where('status', 'in_progress')->count(),
            'by_department' => (clone $appointments)
                ->join('users', 'appointments.doctor_id', '=', 'users.id')
                ->select('users.department', DB::raw('count(*) as count'))
                ->groupBy('users.department')
                ->pluck('count', 'department'),
            'completion_rate' => $this->calculateCompletionRate($appointments),
            'cancellation_rate' => $this->calculateCancellationRate($appointments),
            'average_per_day' => round($appointments->count() / $start->daysInMonth, 2)
        ];
    }

    private function getOverallStats()
    {
        return [
            'total_users' => User::count(),
            'doctors' => User::where('role', 'doctor')->count(),
            'clinical_staff' => User::where('role', 'clinical_staff')->count(),
            'students' => User::where('role', 'student')->count(),
            'academic_staff' => User::where('role', 'academic_staff')->count(),
            'admins' => User::where('role', 'admin')->count(),
            'active_users' => User::where('status', 'active')->count(),
            'total_appointments' => Appointment::count(),
            'total_prescriptions' => Prescription::count(),
            'average_appointments_per_day' => $this->calculateAverageAppointmentsPerDay(),
            'busiest_day_of_week' => $this->getBusiestDayOfWeek(),
        ];
    }

    private function getAppointmentTrends($month, $year)
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = Carbon::create($year, $month, 1)->endOfMonth();

        // CHANGED: appointment_date → date
        $trends = Appointment::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->select(DB::raw('DATE(date) as date'), 'status', DB::raw('count(*) as count'))
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get();

        $formatted = [];
        foreach ($trends as $trend) {
            $date = Carbon::parse($trend->date)->format('M d');
            if (!isset($formatted[$date])) {
                $formatted[$date] = [
                    'date' => $date,
                    'scheduled' => 0,
                    'completed' => 0,
                    'cancelled' => 0,
                    'no_show' => 0,
                    'total' => 0
                ];
            }
            $formatted[$date][$trend->status] = $trend->count;
            $formatted[$date]['total'] += $trend->count;
        }

        return array_values($formatted);
    }

    private function getPrescriptionStats($date, $startOfMonth, $endOfMonth)
    {
        return [
            'today' => Prescription::whereDate('created_at', $date)->count(),
            'this_week' => Prescription::whereBetween('created_at', [
                $date->copy()->startOfWeek(),
                $date->copy()->endOfWeek()
            ])->count(),
            'this_month' => Prescription::whereBetween('created_at', [$startOfMonth, $endOfMonth])->count(),
            'total' => Prescription::count(),
            'active_prescriptions' => Prescription::where('status', 'active')->count(),
            'completed_prescriptions' => Prescription::where('status', 'completed')->count(),
            'by_doctor' => Prescription::join('users', 'prescriptions.doctor_id', '=', 'users.id')
                ->select('users.name', DB::raw('count(*) as count'))
                ->whereBetween('prescriptions.created_at', [$startOfMonth, $endOfMonth])
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('count')
                ->limit(10)
                ->get()
        ];
    }

    private function getSystemHealth()
    {
        $today = Carbon::today();

        return [
            // CHANGED: appointment_date → date
            'appointments_today' => Appointment::whereDate('date', $today)->count(),
            'upcoming_appointments' => Appointment::where('date', '>', Carbon::now())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->count(),
            'overdue_appointments' => Appointment::where('date', '<', Carbon::now())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->count(),
            'active_doctors' => User::where('role', 'doctor')->where('status', 'active')->count(),
            'pending_requests' => Appointment::where('status', 'pending')->count(),
            'completion_rate_today' => $this->getTodayCompletionRate(),
        ];
    }

    // --- Utility Helpers ---

    private function calculateCompletionRate($appointments)
    {
        $total = (clone $appointments)->whereNotIn('status', ['pending', 'scheduled', 'confirmed'])->count();
        if ($total === 0) return 0;
        $completed = (clone $appointments)->where('status', 'completed')->count();
        return round(($completed / $total) * 100, 2);
    }

    private function calculateCancellationRate($appointments)
    {
        $total = (clone $appointments)->count();
        if ($total === 0) return 0;
        $cancelled = (clone $appointments)->whereIn('status', ['cancelled', 'no_show'])->count();
        return round(($cancelled / $total) * 100, 2);
    }

    private function calculateAverageAppointmentsPerDay()
    {
        // CHANGED: appointment_date → date
        $first = Appointment::orderBy('date')->first();
        if (!$first) return 0;
        $days = Carbon::parse($first->date)->diffInDays(Carbon::today()) + 1;
        return round(Appointment::count() / $days, 2);
    }

    private function getBusiestDayOfWeek()
    {
        // CHANGED: appointment_date → date
        $result = Appointment::select(DB::raw('DAYNAME(date) as day'), DB::raw('count(*) as count'))
            ->groupBy('day')
            ->orderByDesc('count')
            ->first();

        return $result ? $result->day : 'N/A';
    }

    private function getTodayCompletionRate()
    {
        $today = Carbon::today();
        // CHANGED: appointment_date → date
        $appointments = Appointment::whereDate('date', $today);
        return $this->calculateCompletionRate($appointments);
    }
}