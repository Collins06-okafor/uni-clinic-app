<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ClinicSettings;
use Illuminate\Support\Facades\Log;

class ClinicSettingsController extends Controller
{
    public function getSettings()
    {
        try {
            $settings = ClinicSettings::first();
            
            if (!$settings) {
                return response()->json([
                    'settings' => $this->getDefaultSettings()
                ]);
            }
            
            return response()->json([
                'settings' => $settings->settings_data
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting clinic settings: ' . $e->getMessage());
            return response()->json([
                'settings' => $this->getDefaultSettings()
            ]);
        }
    }
    
    public function saveSettings(Request $request)
    {
        Log::info('=== Clinic Settings Save Attempt ===');
        Log::info('Request data:', $request->all());
        
        try {
            // Validate input
            $validated = $request->validate([
                'clinic_hours' => 'required|array',
                'appointment_tips' => 'required|array',
                'emergency_contacts' => 'required|array'
            ]);
            
            Log::info('Validation passed');
            
            // Get or create settings record
            $settings = ClinicSettings::first();
            
            if (!$settings) {
                Log::info('Creating new settings record');
                $settings = new ClinicSettings();
            } else {
                Log::info('Updating existing settings record');
            }
            
            // Save the data
            $settings->settings_data = $validated;
            $saved = $settings->save();
            
            Log::info('Save result:', ['success' => $saved]);
            
            if (!$saved) {
                throw new \Exception('Failed to save to database');
            }
            
            return response()->json([
                'message' => 'Settings saved successfully',
                'settings' => $validated
            ], 200);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error:', $e->errors());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('Exception in saveSettings:', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to save settings',
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }
    
    private function getDefaultSettings()
    {
        return [
            'clinic_hours' => [
                ['day' => 'Monday', 'open_time' => '08:00', 'close_time' => '17:00', 'is_closed' => false],
                ['day' => 'Tuesday', 'open_time' => '08:00', 'close_time' => '17:00', 'is_closed' => false],
                ['day' => 'Wednesday', 'open_time' => '08:00', 'close_time' => '17:00', 'is_closed' => false],
                ['day' => 'Thursday', 'open_time' => '08:00', 'close_time' => '17:00', 'is_closed' => false],
                ['day' => 'Friday', 'open_time' => '08:00', 'close_time' => '17:00', 'is_closed' => false],
                ['day' => 'Saturday', 'open_time' => '09:00', 'close_time' => '13:00', 'is_closed' => false],
                ['day' => 'Sunday', 'open_time' => '', 'close_time' => '', 'is_closed' => true]
            ],
            'appointment_tips' => [
                ['title' => 'Arrive early', 'description' => 'Please arrive 15 minutes before your scheduled time.', 'order' => 1],
                ['title' => 'Bring documents', 'description' => "Don't forget your student ID and medical card.", 'order' => 2],
                ['title' => 'Cancellation', 'description' => "Cancel at least 24 hours in advance if you can't make it.", 'order' => 3]
            ],
            'emergency_contacts' => [
                ['name' => 'Campus Emergency', 'phone' => '+90 392 630 1010', 'order' => 1],
                ['name' => 'Ambulance', 'phone' => '112', 'order' => 2],
                ['name' => 'Clinic Reception', 'phone' => '+90 392 630 1234', 'order' => 3]
            ]
        ];
    }
}