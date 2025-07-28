<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ClinicalStaffController extends Controller
{
    // Sample method for clinical staff dashboard
    public function dashboard(Request $request)
    {
        return response()->json([
            'message' => 'Welcome to the Clinical Staff dashboard!',
            'user' => $request->user(),
        ]);
    }
}
