<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            
            // Foreign keys
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            
            // Prescription details
            $table->string('medication');
            $table->string('dosage');
            $table->text('instructions');
            $table->string('status')->default('active');
            
            // Timestamps
            $table->timestamps();
            
            // Optional: Indexes for better performance
            $table->index(['patient_id', 'doctor_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('prescriptions');
    }
};