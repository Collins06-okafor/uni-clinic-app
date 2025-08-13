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
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('status')
                  ->default('scheduled') // Default status when creating new appointments
                  ->after('reason'); // Places the column after the 'reason' column
            
            // Optional: Add priority column if needed for emergency cases
            $table->string('priority')
                  ->nullable()
                  ->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['status', 'priority']); // Drops both columns if you need to rollback
        });
    }
};