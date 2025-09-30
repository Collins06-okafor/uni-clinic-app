<?php
// database/migrations/2025_01_01_000000_create_calendar_sources_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('calendar_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('url_pattern');
            $table->enum('type', ['pdf', 'html', 'api', 'manual'])->default('pdf');
            $table->string('file_pattern')->nullable();
            $table->integer('priority')->default(5); // 1 = highest priority
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_checked')->nullable();
            $table->timestamp('last_successful_sync')->nullable();
            $table->json('sync_metadata')->nullable(); // Store additional sync info
            $table->integer('consecutive_failures')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();
            
            $table->index(['is_active', 'priority']);
            $table->index('last_checked');
        });
    }

    public function down()
    {
        Schema::dropIfExists('calendar_sources');
    }
};
