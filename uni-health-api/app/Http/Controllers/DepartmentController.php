<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    /**
     * Get all departments
     */
    public function index(): JsonResponse
    {
        try {
            // Simple fetch without the relationship count for now
            $departments = Department::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'description', 'type', 'is_active']);

            return response()->json($departments);
        } catch (\Exception $e) {
            \Log::error('Department fetch error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new department (SuperAdmin only)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'code' => 'required|string|max:10|unique:departments,code',
            'description' => 'nullable|string',
            'type' => 'required|in:academic,medical,administrative',
            'metadata' => 'nullable|array'
        ]);

        try {
            $department = Department::create([
                'name' => $request->name,
                'code' => strtoupper($request->code),
                'description' => $request->description,
                'type' => $request->type,
                'metadata' => $request->metadata ?? [],
                'is_active' => true
            ]);

            return response()->json([
                'message' => 'Department created successfully',
                'department' => $department
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create department',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update department (SuperAdmin only)
     */
    public function update(Request $request, Department $department): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,' . $department->id,
            'code' => 'required|string|max:10|unique:departments,code,' . $department->id,
            'description' => 'nullable|string',
            'type' => 'required|in:academic,medical,administrative',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array'
        ]);

        try {
            $department->update([
                'name' => $request->name,
                'code' => strtoupper($request->code),
                'description' => $request->description,
                'type' => $request->type,
                'is_active' => $request->is_active ?? true,
                'metadata' => $request->metadata ?? []
            ]);

            return response()->json([
                'message' => 'Department updated successfully',
                'department' => $department->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update department',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get department details with staff
     */
    public function show(Department $department): JsonResponse
    {
        try {
            $department->load([
                'users' => function($query) {
                    $query->whereIn('role', ['doctor', 'clinical_staff', 'academic_staff'])
                          ->select('id', 'name', 'email', 'role', 'staff_type', 'department_id');
                }
            ]);

            return response()->json($department);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch department details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete department (SuperAdmin only)
     */
    public function destroy(Department $department): JsonResponse
    {
        try {
            // Check if department has active staff
            $activeStaffCount = $department->users()
                ->whereIn('role', ['doctor', 'clinical_staff', 'academic_staff'])
                ->where('status', 'active')
                ->count();

            if ($activeStaffCount > 0) {
                return response()->json([
                    'message' => 'Cannot delete department with active staff members',
                    'active_staff_count' => $activeStaffCount
                ], 422);
            }

            $department->update(['is_active' => false]);

            return response()->json([
                'message' => 'Department deactivated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to deactivate department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
