<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['superadmin','admin','doctor','clinical_staff','student','academic_staff'];
        foreach($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}
