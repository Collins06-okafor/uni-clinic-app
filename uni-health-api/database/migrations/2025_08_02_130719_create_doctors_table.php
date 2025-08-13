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
        Schema::create('doctors', function (Blueprint $table) {
    $table->id();
    $table->foreignId('doctor_id')->constrained()->unique();
    $table->string('medical_license_number')->unique();
    $table->string('specialization');
    $table->json('available_days')->nullable();
    $table->time('working_hours_start')->default('08:00');
    $table->time('working_hours_end')->default('17:00');
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
