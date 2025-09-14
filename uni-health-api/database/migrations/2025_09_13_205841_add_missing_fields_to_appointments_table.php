<?php

// Create a new migration file: 
// php artisan make:migration add_missing_fields_to_appointments_table --table=appointments

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('appointments', 'urgency')) {
                $table->enum('urgency', ['normal', 'high', 'urgent'])->default('normal')->after('reason');
            }
            
            if (!Schema::hasColumn('appointments', 'priority')) {
                $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal')->after('urgency');
            }
            
            if (!Schema::hasColumn('appointments', 'specialization')) {
                $table->string('specialization')->nullable()->after('doctor_id');
            }
            
            if (!Schema::hasColumn('appointments', 'type')) {
                $table->string('type')->default('consultation')->after('specialization');
            }
            
            // Add indexes for better performance
            $table->index(['status', 'date']);
            $table->index(['patient_id', 'date']);
            $table->index(['doctor_id', 'date', 'time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['urgency', 'priority', 'specialization', 'type']);
            $table->dropIndex(['status', 'date']);
            $table->dropIndex(['patient_id', 'date']);
            $table->dropIndex(['doctor_id', 'date', 'time']);
        });
    }
};