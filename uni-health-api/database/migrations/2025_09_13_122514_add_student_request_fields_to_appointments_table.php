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
            if (!Schema::hasColumn('appointments', 'specialization')) {
                $table->string('specialization')->nullable()->after('date');
            }
            if (!Schema::hasColumn('appointments', 'urgency')) {
                $table->enum('urgency', ['normal', 'high', 'urgent'])
                      ->default('normal')
                      ->after('specialization');
            }
            if (!Schema::hasColumn('appointments', 'type')) {
                $table->string('type')
                      ->default('appointment') // could be: 'student_request', 'walk_in', etc.
                      ->after('urgency');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'specialization')) {
                $table->dropColumn('specialization');
            }
            if (Schema::hasColumn('appointments', 'urgency')) {
                $table->dropColumn('urgency');
            }
            if (Schema::hasColumn('appointments', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
