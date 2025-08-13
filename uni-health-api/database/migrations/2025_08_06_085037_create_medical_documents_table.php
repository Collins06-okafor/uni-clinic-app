<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_documents', function (Blueprint $table) {
            $table->id();

            // Link to patient (User)
            $table->foreignId('patient_id')
                ->constrained('users')
                ->onDelete('cascade');

            // Optional link to a medical record
            $table->foreignId('medical_record_id')
                ->nullable()
                ->constrained('medical_records')
                ->onDelete('cascade');

            // Who uploaded the file
            $table->foreignId('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');

            // Document info
            $table->string('type'); // X-ray, MRI, prescription, etc.
            $table->string('file_path'); // Storage path or URL
            $table->date('document_date')->nullable();
            $table->text('description')->nullable();

            $table->timestamps();

            // Index for quick lookups
            $table->index(['patient_id', 'document_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_documents');
    }
};
