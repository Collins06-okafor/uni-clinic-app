<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up()
{
    // First check if the table exists
    if (!Schema::hasTable('doctors')) {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->unique();
            $table->string('medical_license_number');
            $table->string('specialization');
            $table->json('available_days')->nullable();
            $table->time('working_hours_start')->nullable();
            $table->time('working_hours_end')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    } else {
        // If table exists, modify it safely
        Schema::table('doctors', function (Blueprint $table) {
            // Check and rename doctor_id to user_id if needed
            if (Schema::hasColumn('doctors', 'doctor_id') && !Schema::hasColumn('doctors', 'user_id')) {
                $table->renameColumn('doctor_id', 'user_id');
            }
            
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('doctors', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            
            // Fix medical license number column
            if (Schema::hasColumn('doctors', 'medical license_number')) {
                $table->renameColumn('medical license_number', 'medical_license_number');
            } elseif (!Schema::hasColumn('doctors', 'medical_license_number')) {
                $table->string('medical_license_number')->after('id');
            }
        });
    }
}

public function down()
{
    // Only drop if you're sure - this is destructive
    // Schema::dropIfExists('doctors');
    
    // Safer alternative - just reverse the changes
    Schema::table('doctors', function (Blueprint $table) {
        if (Schema::hasColumn('doctors', 'user_id') && !Schema::hasColumn('doctors', 'doctor_id')) {
            $table->renameColumn('user_id', 'doctor_id');
        }
    });
}
};
