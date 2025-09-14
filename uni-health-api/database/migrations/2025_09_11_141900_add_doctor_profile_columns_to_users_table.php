<?php
// Run this command in your terminal:
// php artisan make:migration add_doctor_profile_columns_to_users_table

// Then replace the migration content with this:

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Only add columns that don't already exist
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable()->after('avatar_url');
            }
            if (!Schema::hasColumn('users', 'years_of_experience')) {
                $table->integer('years_of_experience')->nullable()->after('bio');
            }
            if (!Schema::hasColumn('users', 'certifications')) {
                $table->text('certifications')->nullable()->after('years_of_experience');
            }
            if (!Schema::hasColumn('users', 'languages_spoken')) {
                $table->string('languages_spoken')->nullable()->after('certifications');
            }
            if (!Schema::hasColumn('users', 'available_days')) {
                $table->json('available_days')->nullable()->after('languages_spoken');
            }
            if (!Schema::hasColumn('users', 'working_hours_start')) {
                $table->time('working_hours_start')->nullable()->after('available_days');
            }
            if (!Schema::hasColumn('users', 'working_hours_end')) {
                $table->time('working_hours_end')->nullable()->after('working_hours_start');
            }
            if (!Schema::hasColumn('users', 'is_available')) {
                $table->boolean('is_available')->default(true)->after('working_hours_end');
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToCheck = [
                'bio',
                'years_of_experience', 
                'certifications',
                'languages_spoken',
                'available_days',
                'working_hours_start',
                'working_hours_end',
                'is_available'
            ];
            
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};