<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
{
    Schema::table('medical_records', function (Blueprint $table) {
        $table->string('type')->nullable()->after('visit_date');
        // For existing records, you may want to set default values:
        // $table->string('type')->default('general')->after('visit_date');
    });
}

public function down()
{
    Schema::table('medical_records', function (Blueprint $table) {
        $table->dropColumn('type');
    });
}
};
