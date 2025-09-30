<?php
// database/migrations/2025_01_15_000003_create_staff_schedules_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('staff_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('staff_type', ['academic', 'clinical', 'administrative']);
            $table->json('working_days'); // [1,2,3,4,5] for Mon-Fri
            $table->time('working_hours_start')->default('08:00');
            $table->time('working_hours_end')->default('17:00');
            $table->json('custom_availability')->nullable(); // Custom schedule overrides
            $table->boolean('follows_academic_calendar')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['user_id', 'is_active']);
            $table->index(['staff_type', 'department_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('staff_schedules');
    }
};