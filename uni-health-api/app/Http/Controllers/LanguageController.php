<?php

namespace App\Http\Controllers;

class LanguageController extends Controller
{
    public function setLanguage(Request $request)
    {
        $request->validate([
            'language' => 'required|in:en,tr'
        ]);
        
        $user = $request->user();
        if ($user) {
            $user->update(['preferred_language' => $request->language]);
        }
        
        return response()->json([
            'message' => __('messages.language_updated'),
            'language' => $request->language
        ]);
    }
}