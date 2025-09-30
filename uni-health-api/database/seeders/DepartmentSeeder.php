<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    public function run()
    {
        $departments = [
            [
                'name' => 'Software Engineering',
                'code' => 'SE',
                'description' => 'Software Engineering Department',
                'type' => 'academic'
            ],
            [
                'name' => 'Dentistry',
                'code' => 'DENT',
                'description' => 'Dentistry Department',
                'type' => 'medical'
            ],
            [
                'name' => 'Pharmacy',
                'code' => 'PHARM',
                'description' => 'Pharmacy Department',
                'type' => 'medical'
            ],
            [
                'name' => 'Psychology',
                'code' => 'PSY',
                'description' => 'Psychology Department',
                'type' => 'academic'
            ],
            [
                'name' => 'International Law',
                'code' => 'LAW',
                'description' => 'International Law Department',
                'type' => 'academic'
            ],
            [
                'name' => 'Business',
                'code' => 'BUS',
                'description' => 'Business Department',
                'type' => 'academic'
            ],
            [
                'name' => 'Architecture',
                'code' => 'ARCH',
                'description' => 'Architecture Department',
                'type' => 'academic'
            ]
        ];

        foreach ($departments as $dept) {
            Department::create($dept);
        }
    }
}