<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasColumn('users', 'university_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('university_id', 'student_id');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('users', 'student_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('student_id', 'university_id');
            });
        }
    }
};
