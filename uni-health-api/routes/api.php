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
use App\Http\Controllers\SuperAdminController;

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
        Route::post('/profile', [AuthController::class, 'updateProfile']);
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
    Route::get('/medical-history', [StudentController::class, 'getMedicalHistory']);
    Route::get('/appointments', [StudentController::class, 'getAppointments']);
    Route::post('/appointments/schedule', [StudentController::class, 'scheduleAppointment']);
    Route::put('/appointments/{appointment}/reschedule', [StudentController::class, 'rescheduleAppointment']);
    Route::get('/doctors/availability', [StudentController::class, 'getDoctorAvailability']);
    
});

    // Doctor-specific routes
     Route::middleware('role:doctor')->prefix('doctor')->group(function () {
        Route::get('/dashboard', [DoctorController::class, 'dashboard']);
        Route::get('/patients', [DoctorController::class, 'getPatients']);
        Route::get('/patients/{id}', [DoctorController::class, 'getPatient']);
        Route::post('/patients/{patient}/assign', [DoctorController::class, 'assignPatient']); // ADD THIS LINE
        Route::post('/patients/{id}/records', [DoctorController::class, 'createMedicalRecord']);
        Route::get('/appointments', [DoctorController::class, 'getAppointments']);
        Route::post('/prescriptions', [DoctorController::class, 'createPrescription']);
        Route::get('/prescriptions', [DoctorController::class, 'getPrescriptions']);
        Route::get('/schedule', [DoctorController::class, 'getSchedule']);
        Route::put('/appointments/{id}/status', [DoctorController::class, 'updateAppointmentStatus']);
        Route::get('/statistics', [DoctorController::class, 'getStatistics']);
        Route::put('/availability', [DoctorController::class, 'updateAvailability']);
        Route::get('/patients/{id}/medical-card', [ClinicalStaffController::class, 'getMedicalCard']);
        Route::post('/appointments', [AppointmentController::class, 'store']);

    });

    // Academic Staff routes (Clinic-focused)
Route::group(['prefix' => 'academic-staff', 'middleware' => 'auth:api'], function () {
    // Dashboard
     Route::get('/dashboard', [AcademicStaffController::class, 'dashboard']);
    
    // Medical history
    Route::get('/medical-history', [AcademicStaffController::class, 'getMedicalHistory']);
    
    // Appointments
     Route::get('/appointments', [AcademicStaffController::class, 'getAppointments']);
    Route::post('/schedule-appointment', [AcademicStaffController::class, 'scheduleAppointment']);
    Route::put('/reschedule-appointment/{appointment}', [AcademicStaffController::class, 'rescheduleAppointment']);
    Route::put('/cancel-appointment/{appointment}', [AcademicStaffController::class, 'cancelAppointment']);
    
    // Doctor availability
    Route::get('/doctor-availability', [AcademicStaffController::class, 'getDoctorAvailability']);
    Route::get('/available-slots', [AcademicStaffController::class, 'getAvailableSlots']);
    
    // Profile
    Route::put('/profile', [AcademicStaffController::class, 'updateProfile']);
});

    // Clinical Staff routes
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('clinical')->group(function () {
        // Dashboard
        Route::get('dashboard', [ClinicalStaffController::class, 'dashboard']);
        
        // Appointments
        Route::get('appointments', [ClinicalStaffController::class, 'getAppointments']);
        Route::post('appointments/schedule', [ClinicalStaffController::class, 'scheduleAppointment']);
        Route::put('appointments/{id}', [ClinicalStaffController::class, 'updateAppointment']);
        Route::delete('appointments/{id}', [ClinicalStaffController::class, 'deleteAppointment']);
        Route::post('appointments/{id}/confirm', [ClinicalStaffController::class, 'confirmAppointment']);
        
        // Doctors
        Route::get('available-doctors', [ClinicalStaffController::class, 'getAvailableDoctors']);
        Route::get('doctors', [ClinicalStaffController::class, 'getAllDoctors']); // Add this for the doctors tab
        
        // Patients
        Route::get('patients', [ClinicalStaffController::class, 'getPatients']);
        Route::put('patients/{id}', [ClinicalStaffController::class, 'updatePatient']);
        Route::put('patients/{id}/vital-signs', [ClinicalStaffController::class, 'updateVitalSigns']);
        Route::get('patients/{id}/vital-signs/history', [ClinicalStaffController::class, 'getVitalSignsHistory']);
        Route::post('patients/{id}/medication', [ClinicalStaffController::class, 'recordMedication']);
        Route::get('patients/{id}/medical-card', [ClinicalStaffController::class, 'getMedicalCard']);
        Route::post('patients/{id}/medical-card', [ClinicalStaffController::class, 'updateMedicalCard']);
        
        // Medications
        Route::get('medications', [ClinicalStaffController::class, 'getMedications']);
        Route::post('medications', [ClinicalStaffController::class, 'addMedication']);
        Route::put('medications/{id}', [ClinicalStaffController::class, 'updateMedication']);
        Route::delete('medications/{id}', [ClinicalStaffController::class, 'deleteMedication']);
        Route::get('medication-schedule', [ClinicalStaffController::class, 'getMedicationSchedule']);
        
        // Care Tasks
        Route::get('care-tasks', [ClinicalStaffController::class, 'getCareTasks']);
        Route::post('care-tasks', [ClinicalStaffController::class, 'createCareTask']);
        
        // Medical Records
        Route::get('medical-records/{id}', [ClinicalStaffController::class, 'getMedicalRecord']);
    });
});

    // Admin routes
     // Profile (no need to require role:admin unless you want to)
        Route::get('/profile',          [AdminController::class, 'getProfile']);
        Route::put('/profile',          [AdminController::class, 'updateProfile']);
        Route::post('/profile/avatar',  [AdminController::class, 'uploadAvatar']);
        Route::delete('/profile/avatar',[AdminController::class, 'removeAvatar']);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        
        // User management
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/users', [AdminController::class, 'createUser']); // Add this line for user creation
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

         // Backup routes
    Route::post('/backups', [AdminController::class, 'createBackup']);
    Route::get('/backups', [AdminController::class, 'getBackups']);
    Route::get('/backups/{backupId}/status', [AdminController::class, 'getBackupStatus']);
    Route::post('/backups/{backupId}/restore', [AdminController::class, 'restoreBackup']);

    // Notification routes
    Route::post('/notifications', [AdminController::class, 'sendBulkNotification']);
    Route::get('/notifications/{notificationId}/status', [AdminController::class, 'getNotificationStatus']);
    });
});

Route::middleware(['auth:sanctum','role:superadmin'])->group(function() {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/superadmin/users', [SuperAdminController::class,'index']);
    Route::post('/superadmin/users', [SuperAdminController::class,'store']);
    Route::delete('/superadmin/users/{user}', [SuperAdminController::class,'destroy']);
});

Route::middleware(['auth:sanctum', 'permission'])->group(function () {
    // Protected routes that require permissions
    Route::get('/admin-only', function () {
        // Only accessible by users with permission
    })->middleware('permission:admin-access');
    
    // Other protected routes
});

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