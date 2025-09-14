<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // email, sms, in_app, push
            $table->string('category'); // appointment, registration, medical, system
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // Additional data
            $table->string('delivery_method')->default('email'); // email, sms, in_app
            $table->string('status')->default('pending'); // pending, sent, failed, read
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->string('locale', 2)->default('en');
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};