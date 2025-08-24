<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('rescheduled_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->string('reschedule_reason', 500)->nullable();
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'assigned_at',
                'confirmed_at', 
                'rejected_at',
                'rescheduled_at',
                'rejection_reason',
                'reschedule_reason'
            ]);
        });
    }
};