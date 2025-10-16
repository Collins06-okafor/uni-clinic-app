<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only add columns if they don't exist
            if (!Schema::hasColumn('users', 'emergency_contact_relationship')) {
                $table->string('emergency_contact_relationship')->nullable();
            }
            if (!Schema::hasColumn('users', 'emergency_contact_email')) {
                $table->string('emergency_contact_email')->nullable();
            }
            if (!Schema::hasColumn('users', 'blood_type')) {
                $table->string('blood_type')->default('Unknown');
            }
            if (!Schema::hasColumn('users', 'gender')) {
                $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'emergency_contact_relationship',
                'emergency_contact_email',
                'blood_type',
                'gender'
            ]);
        });
    }
};