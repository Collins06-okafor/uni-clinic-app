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
        Schema::table('users', function (Blueprint $table) {
            $table->string('emergency_contact_relationship')->nullable()->after('emergency_contact_phone');
            $table->string('emergency_contact_email')->nullable()->after('emergency_contact_relationship');
            $table->string('blood_type', 10)->nullable()->after('date_of_birth');
            $table->string('gender', 20)->nullable()->after('blood_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
