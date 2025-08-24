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
    Schema::create('profiles', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('phone_number', 20)->nullable();
        $table->date('date_of_birth')->nullable();
        $table->string('emergency_contact_name')->nullable();
        $table->string('emergency_contact_phone', 20)->nullable();
        $table->text('allergies')->nullable();
        $table->boolean('has_known_allergies')->default(false);
        $table->boolean('allergies_uncertain')->default(false);
        $table->text('addictions')->nullable();
        $table->text('medical_history')->nullable();
        $table->string('profile_image')->nullable();
        $table->timestamps();
        
        $table->unique('user_id');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
