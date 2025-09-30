<?php
// app/Http/Controllers/SuperAdminController.php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperAdminController extends Controller
{
    // Create Doctor/Admin/Clinical Staff
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:doctor,admin,clinical_staff',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'status' => 'active', // Set default status
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ]);
    }

    // Delete a user
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    // List all privileged users
    // In SuperAdminController::index()
    public function index()
    {
        \Log::info('=== SuperAdmin users called ===');
        try {
            $users = User::whereIn('role', ['doctor','admin','clinical_staff'])->get();
            \Log::info('Raw user count: ' . User::count());
            \Log::info('Filtered user count: ' . $users->count());
            \Log::info('Users found: ' . $users->pluck('name', 'role')->toJson());
            
            return response()->json($users);
        } catch (\Exception $e) {
            \Log::error('SuperAdmin error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}