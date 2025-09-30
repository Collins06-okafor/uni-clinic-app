<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Add department_id foreign key
            $table->unsignedBigInteger('department_id')->nullable()->after('department');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            
            // Add staff_type column
            $table->enum('staff_type', ['academic', 'clinical', 'administrative'])->nullable()->after('department_id');
            
            // Add index for better performance
            $table->index(['role', 'department_id']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['department_id', 'staff_type']);
            $table->dropIndex(['role', 'department_id']);
        });
    }
};