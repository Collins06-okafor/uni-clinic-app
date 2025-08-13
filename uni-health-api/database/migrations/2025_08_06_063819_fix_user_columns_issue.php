<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Check if employee_id exists before trying to rename it
            if (Schema::hasColumn('users', 'employee_id')) {
                $table->renameColumn('employee_id', 'staff_no');
            }
            // If not, just add staff_no directly
            elseif (!Schema::hasColumn('users', 'staff_no')) {
                $table->string('staff_no')->nullable()->after('id');
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'staff_no')) {
                $table->renameColumn('staff_no', 'employee_id');
            }
        });
    }
};