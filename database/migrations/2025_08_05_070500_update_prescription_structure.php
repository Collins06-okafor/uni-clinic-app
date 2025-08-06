<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Check if columns exist before trying to modify them
        if (Schema::hasColumn('prescriptions', 'medication')) {
            Schema::table('prescriptions', function (Blueprint $table) {
                $table->dropColumn('medication');
            });
        }

        if (Schema::hasColumn('prescriptions', 'dosage')) {
            Schema::table('prescriptions', function (Blueprint $table) {
                $table->dropColumn('dosage');
            });
        }

        if (Schema::hasColumn('prescriptions', 'instructions')) {
            Schema::table('prescriptions', function (Blueprint $table) {
                $table->dropColumn('instructions');
            });
        }

        // Add notes column if it doesn't exist
        if (!Schema::hasColumn('prescriptions', 'notes')) {
            Schema::table('prescriptions', function (Blueprint $table) {
                $table->text('notes')->nullable();
            });
        }

        // Create medications table if it doesn't exist
        if (!Schema::hasTable('medications')) {
            Schema::create('medications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('dosage');
                $table->text('instructions');
                $table->date('start_date');
                $table->date('end_date');
                $table->string('status')->default('active');
                $table->timestamps();
                
                $table->index(['start_date', 'end_date']);
            });
        }
    }

    public function down()
    {
        // For rollback - recreate the old columns
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->string('medication')->nullable();
            $table->string('dosage')->nullable();
            $table->text('instructions')->nullable();
        });

        Schema::dropIfExists('medications');

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};