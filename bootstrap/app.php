<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Add CORS middleware globally or to API group
        $middleware->api(prepend: [
            \App\Http\Middleware\CorsMiddleware::class,
        ]);
        
        // Or add it globally to all requests
        // $middleware->use([
        //     \App\Http\Middleware\CorsMiddleware::class,
        // ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();