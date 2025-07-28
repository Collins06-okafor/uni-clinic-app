<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AcademicStaffController extends Controller
{
    // Sample method for academic staff dashboard
    public function dashboard(Request $request)
    {
        return response()->json([
            'message' => 'Welcome to the Academic Staff dashboard!',
            'user' => $request->user(),
        ]);
    }
}
