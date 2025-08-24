<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Change role column to allow longer values
            $table->string('role', 50)->change(); // Allow up to 50 characters
            
            // OR if you prefer ENUM (but less flexible):
            // $table->enum('role', ['student', 'doctor', 'clinical_staff', 'academic_staff', 'admin', 'superadmin'])->change();
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            // Revert back - adjust based on your original structure
            $table->string('role', 20)->change();
        });
    }
};