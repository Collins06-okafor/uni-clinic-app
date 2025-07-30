<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a default Admin
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'), // Use a secure password in production
            'role' => 'Admin',
        ]);

        // Create a test student
        User::create([
            'name' => 'Test Student',
            'email' => 'student@example.com',
            'password' => Hash::make('password'),
            'role' => 'Student',
        ]);

        // Create a test doctor
        User::create([
            'name' => 'Test Doctor',
            'email' => 'doctor@example.com',
            'password' => Hash::make('password'),
            'role' => 'Doctor',
        ]);

        // You can also use factory to generate random users if needed
        // User::factory(10)->create();
    }
}
