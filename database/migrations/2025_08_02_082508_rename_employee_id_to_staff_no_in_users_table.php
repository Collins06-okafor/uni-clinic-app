<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // If employee_id exists and staff_no doesn't, rename it
            if (Schema::hasColumn('users', 'employee_id') && 
                !Schema::hasColumn('users', 'staff_no')) {
                $table->renameColumn('employee_id', 'staff_no');
            }
            // If neither exists, create staff_no
            elseif (!Schema::hasColumn('users', 'staff_no')) {
                $table->string('staff_no')->nullable()->after('id');
            }
            // If both exist, keep staff_no and optionally drop employee_id
            elseif (Schema::hasColumn('users', 'employee_id')) {
                // $table->dropColumn('employee_id'); // Uncomment if you want to remove the old column
            }
            // If only staff_no exists (current state), do nothing
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            // Only do something if staff_no exists
            if (Schema::hasColumn('users', 'staff_no')) {
                // If employee_id doesn't exist, rename back
                if (!Schema::hasColumn('users', 'employee_id')) {
                    $table->renameColumn('staff_no', 'employee_id');
                }
                // If both exist, drop staff_no to revert
                else {
                    $table->dropColumn('staff_no');
                }
            }
        });
    }
};