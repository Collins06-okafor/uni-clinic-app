<?php

// database/migrations/2025_01_15_000002_create_academic_holidays_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('academic_holidays', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('type', [
                'semester_break', 
                'exam_period', 
                'registration_period', 
                'national_holiday',
                'university_closure',
                'maintenance'
            ]);
            $table->enum('affects_staff_type', ['all', 'academic', 'clinical', 'none'])->default('all');
            $table->json('affected_departments')->nullable(); // Array of department IDs
            $table->boolean('blocks_appointments')->default(true);
            $table->boolean('is_recurring')->default(false); // For annual holidays
            $table->string('recurrence_pattern')->nullable(); // e.g., 'yearly', 'monthly'
            $table->year('academic_year'); // e.g., 2025
            $table->string('source')->default('manual'); // 'manual', 'calendar_sync', 'api'
            $table->string('external_id')->nullable(); // For calendar sync
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['start_date', 'end_date']);
            $table->index(['type', 'affects_staff_type']);
            $table->index(['academic_year', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('academic_holidays');
    }
};