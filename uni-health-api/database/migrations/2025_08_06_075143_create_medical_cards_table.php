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
        Schema::create('medical_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->json('emergency_contact')->nullable();
            $table->json('medical_history')->nullable();
            $table->json('current_medications')->nullable();
            $table->json('allergies')->nullable();
            $table->json('previous_conditions')->nullable();
            $table->json('family_history')->nullable();
            $table->json('insurance_info')->nullable();
            $table->timestamps();
            
            // Add index for better performance
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_cards');
    }
};
