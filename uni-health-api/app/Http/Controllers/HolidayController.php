<?php

namespace App\Http\Controllers;

use App\Models\AcademicHoliday;
use App\Services\EnhancedCalendarSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class HolidayController extends Controller
{
    protected $syncService;

    public function __construct(EnhancedCalendarSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Get all holidays
     */
    public function index(): JsonResponse
    {
        try {
            $holidays = AcademicHoliday::orderBy('start_date', 'desc')->get();
            
            return response()->json([
                'holidays' => $holidays
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch holidays',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new holiday
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'type' => 'required|string',
            'affects_staff_type' => 'required|string',
            'blocks_appointments' => 'required|boolean'
        ]);

        try {
            $holiday = AcademicHoliday::create([
                'name' => $request->name,
                'description' => $request->description,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'type' => $request->type,
                'affects_staff_type' => $request->affects_staff_type,
                'blocks_appointments' => $request->blocks_appointments,
                'is_active' => true,
                'academic_year' => Carbon::parse($request->start_date)->year
            ]);

            return response()->json([
                'message' => 'Holiday created successfully',
                'holiday' => $holiday
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create holiday',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update holiday
     */
    public function update(Request $request, AcademicHoliday $holiday): JsonResponse
    {
        try {
            $holiday->update($request->only([
                'name', 'description', 'start_date', 'end_date', 
                'type', 'affects_staff_type', 'blocks_appointments', 'is_active'
            ]));

            return response()->json([
                'message' => 'Holiday updated successfully',
                'holiday' => $holiday
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update holiday',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete holiday
     */
    public function destroy(AcademicHoliday $holiday): JsonResponse
    {
        try {
            $holiday->delete();
            
            return response()->json([
                'message' => 'Holiday deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete holiday',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync from calendar
     */
    public function syncFromCalendar(Request $request): JsonResponse
    {
        try {
            $year = $request->get('year', now()->year);
            $result = $this->syncService->syncCalendar($year);

            return response()->json([
                'message' => 'Calendar sync completed successfully',
                'synced_holidays' => $result['synced'],
                'updated_holidays' => $result['updated'],
                'failed_syncs' => $result['failed'],
                'sources_checked' => $result['sources_checked'],
                'year' => $year
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Calendar sync failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}