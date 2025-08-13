<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('medical_records', function (Blueprint $table) {
            // Make sure these changes are what you actually need
            $table->string('type')->nullable()->change();
            $table->date('visit_date')->nullable()->change();
            $table->string('diagnosis')->nullable()->change();
            $table->string('treatment')->nullable()->change();
        });
    }

    public function down()
    {
        // Optional: define how to reverse these changes
    }
};