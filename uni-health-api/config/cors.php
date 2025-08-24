<?php
// config/cors.php - For token-only authentication

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000'], // Can use wildcard for token-only auth

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false, // False for token-only auth
];