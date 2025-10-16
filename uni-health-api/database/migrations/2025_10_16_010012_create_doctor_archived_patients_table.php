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
        // Option 1: Add status column to users table (if you want system-wide archiving)
        if (!Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('status', ['active', 'archived', 'inactive'])->default('active')->after('role');
                $table->timestamp('archived_at')->nullable()->after('status');
                $table->unsignedBigInteger('archived_by')->nullable()->after('archived_at');
                
                $table->foreign('archived_by')
                      ->references('id')
                      ->on('users')
                      ->onDelete('set null');
            });
        }

        // Option 2: Create a doctor_archived_patients pivot table 
        // (if you want doctor-specific archiving)
        Schema::create('doctor_archived_patients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('doctor_id');
            $table->unsignedBigInteger('patient_id');
            $table->text('archive_reason')->nullable();
            $table->timestamps();
            
            $table->foreign('doctor_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
                  
            $table->foreign('patient_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
                  
            // Prevent duplicate archives
            $table->unique(['doctor_id', 'patient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_archived_patients');
        
        if (Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['archived_by']);
                $table->dropColumn(['status', 'archived_at', 'archived_by']);
            });
        }
    }
};