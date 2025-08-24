<?php
// Create this migration: php artisan make:migration create_medications_table

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
        Schema::create('medications', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('generic_name')->nullable();
            $table->string('dosage');
            $table->enum('frequency', ['daily', 'twice_daily', 'weekly', 'as_needed']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('instructions')->nullable();
            $table->enum('status', ['active', 'discontinued', 'completed'])->default('active');
            $table->foreignId('patient_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('prescription_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamp('administered_at')->nullable();
            $table->foreignId('administered_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
            
            // Add indexes
            $table->index(['patient_id', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medications');
    }
};