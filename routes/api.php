<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\ClinicalStaffController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AdminController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes (no authentication required)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
});

// Check if authenticated (for testing)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return response()->json([
        'user' => $request->user()->makeHidden(['password']),
        'permissions' => $request->user()->getAllPermissions(),
    ]);
});

// Protected routes (authentication required)
Route::middleware('auth:sanctum')->group(function () {
    
    // Authentication routes
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
    });

    // Global appointment system (accessible by multiple roles)
    Route::prefix('appointments')->group(function () {
        Route::get('/', [AppointmentController::class, 'index']);
        Route::post('/', [AppointmentController::class, 'store'])->middleware('role:student|doctor|clinical_staff');

        Route::get('/{id}', [AppointmentController::class, 'show']);
        Route::put('/{id}', [AppointmentController::class, 'update'])->middleware('role:doctor,clinical_staff,admin');
        Route::delete('/{id}', [AppointmentController::class, 'destroy'])->middleware('role:doctor,clinical_staff,admin');
    });

    // Student-specific routes
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/dashboard', [StudentController::class, 'dashboard']);
        Route::get('/courses', [StudentController::class, 'getCourses']);
        Route::get('/grades', [StudentController::class, 'getGrades']);
        Route::post('/assignments/{id}/submit', [StudentController::class, 'submitAssignment']);
        Route::get('/medical-history', [StudentController::class, 'getMedicalHistory']);
        Route::get('/appointments', [StudentController::class, 'getAppointments']);
    });

    // Doctor-specific routes
    Route::middleware('role:doctor')->prefix('doctor')->group(function () {
        Route::get('/dashboard', [DoctorController::class, 'dashboard']);
        Route::get('/patients', [DoctorController::class, 'getPatients']);
        Route::get('/patients/{id}', [DoctorController::class, 'getPatient']);
        Route::post('/patients/{id}/records', [DoctorController::class, 'createMedicalRecord']);
        Route::get('/appointments', [DoctorController::class, 'getAppointments']);
        Route::post('/prescriptions', [DoctorController::class, 'createPrescription']);
        Route::get('/schedule', [DoctorController::class, 'getSchedule']);
    });

    // Academic Staff routes
    Route::middleware('role:academic_staff')->prefix('academic')->group(function () {
        Route::get('/dashboard', [AcademicStaffController::class, 'dashboard']);
        Route::get('/courses', [AcademicStaffController::class, 'getCourses']);
        Route::post('/courses', [AcademicStaffController::class, 'createCourse']);
        Route::get('/students', [AcademicStaffController::class, 'getStudents']);
        Route::post('/assignments', [AcademicStaffController::class, 'createAssignment']);
        Route::put('/assignments/{id}/grade', [AcademicStaffController::class, 'gradeAssignment']);
        Route::post('/announcements', [AcademicStaffController::class, 'createAnnouncement']);
    });

    // Clinical Staff routes
    Route::middleware('role:clinical_staff')->prefix('clinical')->group(function () {
        Route::get('/dashboard', [ClinicalStaffController::class, 'dashboard']);
        Route::get('/patients', [ClinicalStaffController::class, 'getPatients']);
        Route::put('/patients/{id}', [ClinicalStaffController::class, 'updatePatient']);
        Route::get('/appointments', [ClinicalStaffController::class, 'getAppointments']);
        Route::post('/appointments/schedule', [ClinicalStaffController::class, 'scheduleAppointment']);
        Route::get('/medical-records/{id}', [ClinicalStaffController::class, 'getMedicalRecord']);
    });

    // Admin routes
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        
        // User management
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{id}', [AdminController::class, 'getUser']);
        Route::put('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::put('/users/{id}/role', [AdminController::class, 'updateUserRole']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        
        // System management
        Route::get('/statistics', [AdminController::class, 'getStatistics']);
        Route::get('/logs', [AdminController::class, 'getSystemLogs']);
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::put('/settings', [AdminController::class, 'updateSettings']);
        
        // Role and permission management
        Route::get('/roles', [AdminController::class, 'getRoles']);
        Route::post('/users/{id}/permissions', [AdminController::class, 'assignPermissions']);
    });

    // Routes accessible by medical staff (doctors + clinical staff)
    Route::middleware('role:doctor,clinical_staff')->prefix('medical')->group(function () {
        Route::get('/patients', function (Request $request) {
            // Common patient listing for medical staff
            return response()->json(['message' => 'Medical patients list']);
        });
        
        Route::get('/emergency-contacts', function (Request $request) {
            return response()->json(['message' => 'Emergency contacts']);
        });
    });

    // Routes accessible by academic management (academic staff + admin)
    Route::middleware('role:academic_staff,admin')->prefix('academic-management')->group(function () {
        Route::get('/departments', function (Request $request) {
            return response()->json(['message' => 'Departments list']);
        });
        
        Route::get('/faculty-statistics', function (Request $request) {
            return response()->json(['message' => 'Faculty statistics']);
        });
    });

    // Routes accessible by all staff (excluding students)
    Route::middleware('role:doctor,clinical_staff,academic_staff,admin')->prefix('staff')->group(function () {
        Route::get('/announcements', function (Request $request) {
            return response()->json(['message' => 'Staff announcements']);
        });
        
        Route::get('/calendar', function (Request $request) {
            return response()->json(['message' => 'Staff calendar']);
        });
    });

    // Simple ping test (accessible by all authenticated users)
    Route::get('/ping', function () {
        return response()->json([
            'message' => 'Server is alive',
            'timestamp' => now(),
            'user' => auth()->user()->name,
            'roles' => auth()->user()->getRoleNames(),
        ]);
    });
});

/*
|--------------------------------------------------------------------------
| Additional utility routes
|--------------------------------------------------------------------------
*/

// Health check (public)
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'version' => '1.0.0',
    ]);
});

// Get available roles (public - for registration form)
Route::get('/roles', function () {
    return response()->json([
        'roles' => [
            'student' => 'Student',
            'doctor' => 'Doctor',
            'clinical_staff' => 'Clinical Staff',
            'academic_staff' => 'Academic Staff',
            'admin' => 'Administrator',
        ]
    ]);
});