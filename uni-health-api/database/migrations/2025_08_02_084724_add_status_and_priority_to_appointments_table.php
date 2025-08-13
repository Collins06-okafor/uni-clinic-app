<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Only add status if it doesn't exist
            if (!Schema::hasColumn('appointments', 'status')) {
                $table->string('status')->default('scheduled')->after('reason');
            } else {
                // Optionally modify existing column to ensure correct properties
                $table->string('status')->default('scheduled')->change();
            }

            // Only add priority if it doesn't exist
            if (!Schema::hasColumn('appointments', 'priority')) {
                $table->string('priority')->nullable()->after('status');
            }
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Only drop columns if they exist
            if (Schema::hasColumn('appointments', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('appointments', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};