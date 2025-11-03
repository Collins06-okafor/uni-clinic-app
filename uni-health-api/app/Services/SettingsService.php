<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    /**
     * Get a setting value with dot notation
     * Example: get('general.site_name')
     */
    public static function get(string $key, $default = null)
    {
        $settings = Cache::remember('system_settings', 3600, function () {
            return SystemSetting::getInstance()->getAllSettings();
        });
        
        return data_get($settings, $key, $default);
    }
    
    /**
     * Check if maintenance mode is enabled
     */
    public static function isMaintenanceMode(): bool
    {
        return self::get('general.maintenance_mode', false);
    }
    
    /**
     * Check if registration is enabled
     */
    public static function isRegistrationEnabled(): bool
    {
        return self::get('general.registration_enabled', true);
    }
    
    /**
     * Get password requirements
     */
    public static function getPasswordRequirements(): array
    {
        return [
            'min_length' => self::get('authentication.password_min_length', 8),
            'require_uppercase' => self::get('authentication.password_require_uppercase', true),
            'require_lowercase' => self::get('authentication.password_require_lowercase', true),
            'require_numbers' => self::get('authentication.password_require_numbers', true),
            'require_symbols' => self::get('authentication.password_require_symbols', false)
        ];
    }
    
    /**
     * Clear settings cache
     */
    public static function clearCache(): void
    {
        Cache::forget('system_settings');
    }
}