<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    protected $fillable = [
        'general',
        'authentication',
        'email',
        'file_uploads',
        'security',
        'backup'
    ];

    protected $casts = [
        'general' => 'array',
        'authentication' => 'array',
        'email' => 'array',
        'file_uploads' => 'array',
        'security' => 'array',
        'backup' => 'array'
    ];

    /**
     * Get all settings as a single array
     */
    public function getAllSettings(): array
    {
        return [
            'general' => $this->general ?? [],
            'authentication' => $this->authentication ?? [],
            'email' => $this->email ?? [],
            'file_uploads' => $this->file_uploads ?? [],
            'security' => $this->security ?? [],
            'backup' => $this->backup ?? []
        ];
    }

    /**
     * Update a specific setting section
     */
    public function updateSection(string $section, array $data): bool
    {
        if (!in_array($section, $this->fillable)) {
            return false;
        }

        return $this->update([$section => $data]);
    }

    /**
     * Get singleton instance (there should only be one settings record)
     */
    public static function getInstance(): self
    {
        $settings = self::first();
        
        if (!$settings) {
            // Create default settings if none exist
            $settings = self::create([
                'general' => [
                    'site_name' => 'University Health System',
                    'site_description' => 'Comprehensive university Health platform',
                    'timezone' => 'UTC+3',
                    'default_language' => 'en',
                    'maintenance_mode' => false,
                    'registration_enabled' => true,
                    'email_verification_required' => true
                ],
                'authentication' => [
                    'password_min_length' => 8,
                    'password_require_uppercase' => true,
                    'password_require_lowercase' => true,
                    'password_require_numbers' => true,
                    'password_require_symbols' => false,
                    'session_timeout' => 1440,
                    'max_login_attempts' => 5,
                    'lockout_duration' => 15,
                    'two_factor_enabled' => false
                ],
                'email' => [
                    'smtp_host' => '',
                    'smtp_port' => 587,
                    'smtp_encryption' => 'tls',
                    'from_address' => '',
                    'from_name' => ''
                ],
                'file_uploads' => [
                    'max_file_size' => 10240,
                    'allowed_extensions' => ['pdf', 'doc', 'docx', 'jpg', 'png'],
                    'upload_path' => '/uploads/',
                    'antivirus_enabled' => true
                ],
                'security' => [
                    'force_https' => true,
                    'csrf_protection' => true,
                    'rate_limiting_enabled' => true,
                    'ip_whitelist_enabled' => false,
                    'audit_logging_enabled' => true,
                    'password_history_count' => 5
                ],
                'backup' => [
                    'automatic_backups' => true,
                    'backup_frequency' => 'daily',
                    'backup_retention_days' => 30,
                    'backup_location' => '',
                    'last_backup' => null
                ]
            ]);
        }
        
        return $settings;
    }
}