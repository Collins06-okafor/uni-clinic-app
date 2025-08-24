<?php

// First, rollback the failed migration:
// php artisan migrate:rollback --step=1

// Then create a new migration:
// php artisan make:migration add_missing_profile_fields_to_users_table

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Only add columns that don't exist
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'department')) {
                $table->string('department')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'last_login')) {
                $table->timestamp('last_login')->nullable();
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop columns that exist
            $columnsToDrop = [];
            
            if (Schema::hasColumn('users', 'phone')) {
                $columnsToDrop[] = 'phone';
            }
            if (Schema::hasColumn('users', 'department')) {
                $columnsToDrop[] = 'department';
            }
            if (Schema::hasColumn('users', 'bio')) {
                $columnsToDrop[] = 'bio';
            }
            if (Schema::hasColumn('users', 'avatar_url')) {
                $columnsToDrop[] = 'avatar_url';
            }
            if (Schema::hasColumn('users', 'last_login')) {
                $columnsToDrop[] = 'last_login';
            }
            
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};