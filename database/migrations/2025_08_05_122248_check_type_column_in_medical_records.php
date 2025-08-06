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
    Schema::table('medical_records', function (Blueprint $table) {
        // Check if column exists first
        if (!Schema::hasColumn('medical_records', 'type')) {
            $table->string('type')->nullable()->after('visit_date');
        } else {
            // Modify existing column if needed
            $table->string('type')->nullable()->change();
        }
    });
}

public function down()
{
    // Optional: Only needed if you want to reverse
    Schema::table('medical_records', function (Blueprint $table) {
        $table->dropColumn('type');
    });
}
};
