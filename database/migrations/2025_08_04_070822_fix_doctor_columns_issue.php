<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('doctors', function (Blueprint $table) {
        // First check if columns exist before modifying them
        if (Schema::hasColumn('doctors', 'doctor_id')) {
            $table->renameColumn('doctor_id', 'user_id');
        }
        
        if (!Schema::hasColumn('doctors', 'is_active')) {
            $table->boolean('is_active')->default(true);
        }
        
        // Only modify medical_license_number if it exists
        if (Schema::hasColumn('doctors', 'medical license_number')) {
            $table->renameColumn('medical license_number', 'medical_license_number');
        } elseif (!Schema::hasColumn('doctors', 'medical_license_number')) {
            $table->string('medical_license_number')->after('id');
        }
    });
}

public function down()
{
    Schema::table('doctors', function (Blueprint $table) {
        if (Schema::hasColumn('doctors', 'user_id')) {
            $table->renameColumn('user_id', 'doctor_id');
        }
        
        if (Schema::hasColumn('doctors', 'medical_license_number')) {
            $table->renameColumn('medical_license_number', 'medical license_number');
        }
    });
}
};
