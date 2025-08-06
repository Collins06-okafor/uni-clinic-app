<?php

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
        Schema::create('medical_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users');
            $table->foreignId('doctor_id')->constrained('users');
            $table->text('diagnosis');
            $table->text('treatment');
            $table->text('notes')->nullable();
            $table->date('visit_date');
            $table->timestamps();

            // Foreign keys
            $table->foreign('patient_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('doctor_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};
