<?php
// config/cors.php - For token-only authentication

return [
    'paths' => ['api/*', 'clinical/*', 'doctor/*', 'student/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'], // Can use wildcard for token-only auth

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // False for token-only auth
];