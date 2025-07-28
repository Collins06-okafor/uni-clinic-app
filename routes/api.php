<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\AcademicStaffController;
use App\Http\Controllers\ClinicalStaffController;

// Public routes: register and login
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes with Sanctum auth
Route::middleware('auth:sanctum')->group(function () {

    // Common authenticated user info & logout
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // Role-protected routes

    Route::middleware('role:student')->group(function () {
        Route::get('/student/dashboard', [StudentController::class, 'dashboard']);
        // Add more student-specific routes here
    });

    Route::middleware('role:doctor')->group(function () {
        Route::get('/doctor/dashboard', [DoctorController::class, 'dashboard']);
        // Add more doctor-specific routes here
    });

    Route::middleware('role:academic_staff')->group(function () {
        Route::get('/academic/dashboard', [AcademicStaffController::class, 'dashboard']);
        // Add more academic staff-specific routes here
    });

    Route::middleware('role:clinical_staff')->group(function () {
        Route::get('/clinical/dashboard', [ClinicalStaffController::class, 'dashboard']);
        // Add more clinical staff-specific routes here
    });

});