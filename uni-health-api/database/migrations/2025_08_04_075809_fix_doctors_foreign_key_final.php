<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Get all existing foreign key constraints for doctors table
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'doctors' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");

        Schema::table('doctors', function (Blueprint $table) use ($foreignKeys) {
            // Drop all existing foreign keys
            foreach ($foreignKeys as $fk) {
                try {
                    DB::statement("ALTER TABLE doctors DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
                } catch (\Exception $e) {
                    // Continue if constraint doesn't exist
                }
            }
        });

        // Add the correct foreign key constraint
        Schema::table('doctors', function (Blueprint $table) {
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });
    }
};