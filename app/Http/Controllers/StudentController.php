<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class StudentController extends Controller
{
    // Sample method for student dashboard
    public function dashboard(Request $request)
    {
        return response()->json([
            'message' => 'Welcome to the student dashboard!',
            'user' => $request->user(),
        ]);
    }
}
