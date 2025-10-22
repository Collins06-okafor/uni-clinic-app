<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('cancellation_reason')->nullable();
            $table->boolean('needs_reassignment')->default(false);
            $table->text('reassignment_notes')->nullable();
            $table->timestamp('reassigned_at')->nullable();
            $table->unsignedBigInteger('reassigned_by')->nullable();
            
            $table->foreign('reassigned_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['reassigned_by']);
            $table->dropColumn([
                'cancellation_reason',
                'needs_reassignment',
                'reassignment_notes',
                'reassigned_at',
                'reassigned_by'
            ]);
        });
    }
};