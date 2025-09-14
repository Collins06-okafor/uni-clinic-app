<?php
// app/Http/Middleware/SetLocale.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        $locale = $this->getLocaleFromRequest($request);
        
        // Validate locale
        if (!in_array($locale, config('app.available_locales', ['en', 'tr']))) {
            $locale = config('app.locale', 'en');
        }
        
        App::setLocale($locale);
        
        return $next($request);
    }
    
    private function getLocaleFromRequest(Request $request): string
    {
        // Priority 1: URL parameter (?lang=tr)
        if ($request->has('lang')) {
            return $request->get('lang');
        }
        
        // Priority 2: Header (Accept-Language or X-Locale)
        if ($request->hasHeader('X-Locale')) {
            return $request->header('X-Locale');
        }
        
        // Priority 3: User preference (if authenticated) ✅ THIS NOW WORKS
        if ($request->user() && $request->user()->preferred_language) {
            return $request->user()->preferred_language;
        }
        
        // Priority 4: Accept-Language header
        $acceptLanguage = $request->header('Accept-Language');
        if ($acceptLanguage) {
            // Parse Accept-Language header (e.g., "tr-TR,tr;q=0.9,en;q=0.8")
            $languages = $this->parseAcceptLanguage($acceptLanguage);
            foreach ($languages as $lang) {
                $shortLang = substr($lang, 0, 2);
                if (in_array($shortLang, ['tr', 'en'])) {
                    return $shortLang;
                }
            }
        }
        
        // Default fallback
        return config('app.locale', 'en');
    }
    
    private function parseAcceptLanguage(string $acceptLanguage): array
    {
        $languages = [];
        $parts = explode(',', $acceptLanguage);
        
        foreach ($parts as $part) {
            $lang = trim(explode(';', $part)[0]);
            $languages[] = $lang;
        }
        
        return $languages;
    }
}