<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddProfileFieldsToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'allergies')) {
                $table->text('allergies')->nullable();
            }
            if (!Schema::hasColumn('users', 'has_known_allergies')) {
                $table->boolean('has_known_allergies')->default(false);
            }
            if (!Schema::hasColumn('users', 'allergies_uncertain')) {
                $table->boolean('allergies_uncertain')->default(false);
            }
            if (!Schema::hasColumn('users', 'addictions')) {
                $table->string('addictions')->nullable();
            }
            if (!Schema::hasColumn('users', 'emergency_contact_name')) {
                $table->string('emergency_contact_name')->nullable();
            }
            if (!Schema::hasColumn('users', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone')->nullable();
            }
            if (!Schema::hasColumn('users', 'medical_history')) {
                $table->text('medical_history')->nullable();
            }
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url')->nullable();
            }
            if (!Schema::hasColumn('users', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable();
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'allergies', 'has_known_allergies', 'allergies_uncertain', 
                'addictions', 'emergency_contact_name', 'emergency_contact_phone',
                'medical_history', 'avatar_url', 'date_of_birth'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
}