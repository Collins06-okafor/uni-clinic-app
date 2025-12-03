<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add vitals tracking columns to medical_records table
 * 
 * This migration adds columns to track patient vital signs over time
 * in the medical_records table, allowing historical vitals tracking.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            // Add vitals columns after notes column
            $table->string('blood_pressure')->nullable()->after('notes')
                ->comment('Blood pressure reading (e.g., 120/80)');
                
            $table->string('heart_rate')->nullable()->after('blood_pressure')
                ->comment('Heart rate in beats per minute');
                
            $table->string('temperature')->nullable()->after('heart_rate')
                ->comment('Body temperature (e.g., 36.8°C or 98.2°F)');
                
            $table->string('respiratory_rate')->nullable()->after('temperature')
                ->comment('Respiratory rate in breaths per minute');
                
            $table->string('oxygen_saturation')->nullable()->after('respiratory_rate')
                ->comment('SpO2 percentage (e.g., 98%)');
                
            $table->decimal('weight', 5, 2)->nullable()->after('oxygen_saturation')
                ->comment('Weight in kg');
                
            $table->decimal('height', 5, 2)->nullable()->after('weight')
                ->comment('Height in cm');
                
            $table->decimal('bmi', 5, 2)->nullable()->after('height')
                ->comment('Body Mass Index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn([
                'blood_pressure',
                'heart_rate',
                'temperature',
                'respiratory_rate',
                'oxygen_saturation',
                'weight',
                'height',
                'bmi'
            ]);
        });
    }
};