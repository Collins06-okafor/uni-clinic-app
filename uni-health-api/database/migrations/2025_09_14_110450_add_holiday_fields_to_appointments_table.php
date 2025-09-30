<?php

// database/migrations/2025_01_15_000005_add_holiday_fields_to_appointments_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('is_holiday_override')->default(false);
            $table->string('override_reason')->nullable();
            $table->foreignId('blocked_by_holiday_id')->nullable()->constrained('academic_holidays')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['blocked_by_holiday_id']);
            $table->dropColumn(['is_holiday_override', 'override_reason', 'blocked_by_holiday_id']);
        });
    }
};