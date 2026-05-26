<?php
return [
    'app_name'          => env('APP_NAME', 'ClinicFlow Pro'),
    'institution_name'  => env('INSTITUTION_NAME', 'Your Institution'),
    'institution_short' => env('INSTITUTION_SHORT', 'INST'),
    'support_email'     => env('SUPPORT_EMAIL', 'support@example.com'),
    'frontend_url'      => env('FRONTEND_URL', 'http://localhost:5173'),
    'timezone'          => env('APP_TIMEZONE', 'UTC'),

    // Email domains allowed for student/staff registration
    // Comma-separated: "university.edu,student.uni.edu"
    'allowed_email_domains' => array_filter(
        explode(',', env('ALLOWED_EMAIL_DOMAINS', ''))
    ),

    // Clinic operating hours (used across controllers)
    'clinic_open'  => env('CLINIC_OPEN_TIME', '09:00'),
    'clinic_close' => env('CLINIC_CLOSE_TIME', '17:00'),

    // Working days: 1=Monday ... 5=Friday
    'clinic_days_start' => (int) env('CLINIC_DAYS_START', 1),
    'clinic_days_end'   => (int) env('CLINIC_DAYS_END', 5),
];