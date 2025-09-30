<?php
// database/migrations/2025_01_15_000001_create_departments_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10)->unique(); // e.g., 'COMP', 'MED', 'ENG'
            $table->text('description')->nullable();
            $table->enum('type', ['academic', 'medical', 'administrative']);
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable(); // For additional department info
            $table->timestamps();
            
            $table->index(['type', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('departments');
    }
};