<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run()
    {
        // Create superadmin user
        User::updateOrCreate(
            ['email' => 'superadmin@uni.edu'], // Change email as needed
            [
                'name' => 'Super Administrator',
                'email' => 'superadmin@uni.edu',
                'password' => Hash::make('superadminpassword'), // Change password
                'role' => 'superadmin',
                'status' => 'active',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->command->info('SuperAdmin user created successfully!');
        $this->command->info('Email: superadmin@uni.edu');
        $this->command->info('Password: superadminpassword');
    }
}