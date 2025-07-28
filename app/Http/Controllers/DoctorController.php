<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DoctorController extends Controller
{
    // Sample method for doctor's dashboard or home
    public function dashboard(Request $request)
    {
        return response()->json([
            'message' => 'Welcome to the doctor dashboard!',
            'user' => $request->user(),
        ]);
    }
}
