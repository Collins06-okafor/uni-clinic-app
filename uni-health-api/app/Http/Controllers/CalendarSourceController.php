<?php
// app/Http/Controllers/CalendarSourceController.php

namespace App\Http\Controllers;

use App\Models\CalendarSource;
use App\Services\EnhancedCalendarSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CalendarSourceController extends Controller
{
    protected $syncService;

    public function __construct(EnhancedCalendarSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Get all calendar sources
     */
    public function index(): JsonResponse
    {
        try {
            $sources = CalendarSource::orderBy('priority')
                ->orderBy('name')
                ->get()
                ->map(function ($source) {
                    return [
                        'id' => $source->id,
                        'name' => $source->name,
                        'url_pattern' => $source->url_pattern,
                        'type' => $source->type,
                        'priority' => $source->priority,
                        'is_active' => $source->is_active,
                        'last_checked' => $source->last_checked?->format('Y-m-d H:i:s'),
                        'last_successful_sync' => $source->last_successful_sync?->format('Y-m-d H:i:s'),
                        'consecutive_failures' => $source->consecutive_failures,
                        'is_reliable' => $source->isReliable(),
                        'needs_check' => $source->needsCheck(),
                        'current_year_url' => $source->buildUrl(now()->year),
                    ];
                });

            return response()->json($sources);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch calendar sources',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new calendar source
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'url_pattern' => 'required|string|max:500',
            'type' => 'required|in:pdf,html,api,manual',
            'file_pattern' => 'nullable|string|max:255',
            'priority' => 'required|integer|min:1|max:10',
            'is_active' => 'boolean'
        ]);

        try {
            $source = CalendarSource::create([
                'name' => $request->name,
                'url_pattern' => $request->url_pattern,
                'type' => $request->type,
                'file_pattern' => $request->file_pattern,
                'priority' => $request->priority,
                'is_active' => $request->boolean('is_active', true)
            ]);

            return response()->json([
                'message' => 'Calendar source created successfully',
                'source' => $source
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create calendar source',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test a specific calendar source
     */
    public function test(Request $request, $id): JsonResponse
    {
        try {
            $source = CalendarSource::findOrFail($id);
            $year = $request->get('year', now()->year);
            
            $url = $source->buildUrl($year);
            $source->markAsChecked();
            
            // Test if URL exists and is accessible
            $response = \Http::timeout(30)->get($url);
            
            if ($response->successful()) {
                $source->markAsSuccessful([
                    'test_year' => $year,
                    'response_size' => strlen($response->body()),
                    'content_type' => $response->header('Content-Type')
                ]);
                
                return response()->json([
                    'message' => 'Calendar source test successful',
                    'url' => $url,
                    'status' => $response->status(),
                    'content_type' => $response->header('Content-Type'),
                    'size' => strlen($response->body())
                ]);
                
            } else {
                $source->markAsFailed("HTTP {$response->status()}: {$response->body()}");
                
                return response()->json([
                    'message' => 'Calendar source test failed',
                    'url' => $url,
                    'status' => $response->status(),
                    'error' => $response->body()
                ], 422);
            }
            
        } catch (\Exception $e) {
            if (isset($source)) {
                $source->markAsFailed($e->getMessage());
            }
            
            return response()->json([
                'message' => 'Calendar source test failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check for new calendars automatically
     */
    public function checkNew(Request $request): JsonResponse
    {
        try {
            $year = $request->get('year', now()->year);
            $newCalendars = $this->syncService->checkForNewCalendars();
            
            return response()->json([
                'message' => 'New calendar check completed',
                'new_calendars' => $newCalendars,
                'count' => count($newCalendars)
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to check for new calendars',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Trigger manual sync from all sources
     */
    public function syncAll(Request $request): JsonResponse
    {
        try {
            $year = $request->get('year', now()->year);
            $result = $this->syncService->syncCalendar($year);
            
            return response()->json([
                'message' => 'Calendar sync completed',
                'result' => $result
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Calendar sync failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update calendar source
     */
    public function update(Request $request, $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'url_pattern' => 'sometimes|string|max:500',
            'type' => 'sometimes|in:pdf,html,api,manual',
            'file_pattern' => 'nullable|string|max:255',
            'priority' => 'sometimes|integer|min:1|max:10',
            'is_active' => 'sometimes|boolean'
        ]);

        try {
            $source = CalendarSource::findOrFail($id);
            $source->update($request->only([
                'name', 'url_pattern', 'type', 'file_pattern', 'priority', 'is_active'
            ]));

            return response()->json([
                'message' => 'Calendar source updated successfully',
                'source' => $source->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update calendar source',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete calendar source
     */
    public function destroy($id): JsonResponse
    {
        try {
            $source = CalendarSource::findOrFail($id);
            $source->delete();

            return response()->json([
                'message' => 'Calendar source deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete calendar source',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}