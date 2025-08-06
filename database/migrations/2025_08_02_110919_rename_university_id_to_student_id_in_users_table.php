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
            $table->renameColumn('university_id', 'student_id');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('student_id', 'university_id');
        });
    }
};
