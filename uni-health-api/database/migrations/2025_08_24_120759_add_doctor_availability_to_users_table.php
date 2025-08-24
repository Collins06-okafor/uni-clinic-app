<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('available_days')->nullable();
            $table->time('working_hours_start')->nullable();
            $table->time('working_hours_end')->nullable();
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'available_days',
                'working_hours_start',
                'working_hours_end'
            ]);
        });
    }
};