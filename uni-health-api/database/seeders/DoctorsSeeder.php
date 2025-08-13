<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Doctor;

class DoctorsSeeder extends Seeder
{
    public function run()
    {
        // Get all users with doctor role
        $doctorUsers = User::where('role', 'doctor')->get();
        
        echo "Found " . $doctorUsers->count() . " doctor users\n";
        
        $specializations = [
            'Cardiology', 
            'General Medicine',
            'Psychiatry',
            'Pediatrics',
            'Dermatology'
        ];

        foreach ($doctorUsers as $user) {
            // Check if doctor profile already exists
            $existingDoctor = Doctor::where('user_id', $user->id)->first();
            
            if (!$existingDoctor) {
                $doctor = Doctor::create([
                    'user_id' => $user->id,
                    'medical_license_number' => 'MD-' . str_pad($user->id, 4, '0', STR_PAD_LEFT) . '-' . rand(100, 999),
                    'specialization' => $specializations[array_rand($specializations)],
                    'is_active' => true,
                    'available_days' => json_encode(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
                    'working_hours_start' => '09:00:00',
                    'working_hours_end' => '17:00:00'
                ]);
                
                echo "Created doctor profile for: " . $user->name . " (ID: " . $doctor->id . ")\n";
            } else {
                echo "Doctor profile already exists for: " . $user->name . "\n";
            }
        }
        
        echo "Seeding completed!\n";
    }
}