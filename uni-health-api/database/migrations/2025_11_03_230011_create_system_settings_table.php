<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->json('general')->nullable();
            $table->json('authentication')->nullable();
            $table->json('email')->nullable();
            $table->json('file_uploads')->nullable();
            $table->json('security')->nullable();
            $table->json('backup')->nullable();
            $table->timestamps();
        });

        // Insert default settings
        DB::table('system_settings')->insert([
            'general' => json_encode([
                'site_name' => 'University Health System',
                'site_description' => 'Comprehensive university Health platform',
                'timezone' => 'UTC+3',
                'default_language' => 'en',
                'maintenance_mode' => false,
                'registration_enabled' => true,
                'email_verification_required' => true
            ]),
            'authentication' => json_encode([
                'password_min_length' => 8,
                'password_require_uppercase' => true,
                'password_require_lowercase' => true,
                'password_require_numbers' => true,
                'password_require_symbols' => false,
                'session_timeout' => 1440,
                'max_login_attempts' => 5,
                'lockout_duration' => 15,
                'two_factor_enabled' => false
            ]),
            'email' => json_encode([
                'smtp_host' => 'smtp.university.edu',
                'smtp_port' => 587,
                'smtp_encryption' => 'tls',
                'from_address' => 'noreply@university.edu',
                'from_name' => 'University Health System',
                'smtp_username' => '',
                'smtp_password' => ''
            ]),
            'file_uploads' => json_encode([
                'max_file_size' => 10240,
                'allowed_extensions' => ['pdf', 'doc', 'docx', 'jpg', 'png'],
                'upload_path' => '/uploads/',
                'antivirus_enabled' => true
            ]),
            'security' => json_encode([
                'force_https' => true,
                'csrf_protection' => true,
                'rate_limiting_enabled' => true,
                'ip_whitelist_enabled' => false,
                'audit_logging_enabled' => true,
                'password_history_count' => 5
            ]),
            'backup' => json_encode([
                'automatic_backups' => true,
                'backup_frequency' => 'daily',
                'backup_retention_days' => 30,
                'backup_location' => 's3://university-backups/',
                'last_backup' => null
            ]),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};