<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AppointmentController extends Controller
{
    // GET /api/appointments
    public function index()
    {
        return response()->json(Appointment::all(), 200);
    }

    // POST /api/appointments
   // In your AppointmentController or DoctorController
    public function store(Request $request)
{
    $validated = $request->validate([
        'patient_id' => 'required|exists:users,id',
        'date' => 'required|date',
        'time' => 'required|date_format:H:i',
        'reason' => 'required|string|max:500'
    ]);

    // Check if patient already has an appointment on this date
    $existingPatientAppointment = Appointment::where('patient_id', $validated['patient_id'])
        ->where('date', $validated['date'])
        ->whereIn('status', ['scheduled', 'confirmed'])
        ->first();

    if ($existingPatientAppointment) {
        return response()->json([
            'message' => 'Patient already has an appointment scheduled for this date',
            'errors' => ['date' => ['Only one appointment per day is allowed per patient']]
        ], 422);
    }

    // Check for existing appointment at the same time
    $existingDoctorAppointment = Appointment::where('doctor_id', $request->user()->id)
        ->where('date', $validated['date'])
        ->where('time', $validated['time'])
        ->whereIn('status', ['scheduled', 'confirmed'])
        ->first();

    if ($existingDoctorAppointment) {
        return response()->json([
            'message' => 'You already have an appointment scheduled at this time',
            'errors' => ['time' => ['This time slot is already booked']]
        ], 422);
    }

    $appointment = Appointment::create([
        'patient_id' => $validated['patient_id'],
        'doctor_id' => $request->user()->id,
        'date' => $validated['date'],
        'time' => $validated['time'],
        'reason' => $validated['reason'],
        'status' => 'scheduled' // Default status
    ]);

    return response()->json([
        'message' => 'Appointment created successfully',
        'appointment' => [
            'id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'date' => $appointment->date->format('Y-m-d'),
            'time' => $appointment->time->format('H:i'),
            'reason' => $appointment->reason,
            'status' => $appointment->status,
            'created_at' => $appointment->created_at,
            'updated_at' => $appointment->updated_at
        ]
    ], 201);
}

    // GET /api/appointments/{id}
    public function show($id)
    {
        $appointment = Appointment::find($id);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        return response()->json($appointment, 200);
    }

    // PUT /api/appointments/{id}
    public function update(Request $request, $id)
    {
        $appointment = Appointment::find($id);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'patient_id' => 'sometimes|exists:users,id',
            'doctor_id' => 'sometimes|exists:users,id',
            'date' => 'sometimes|date',
            'reason' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $appointment->update($validator->validated());

        return response()->json([
            'message' => 'Appointment updated successfully',
            'data' => $appointment
        ]);
    }

    // DELETE /api/appointments/{id}
    public function destroy($id)
    {
        $appointment = Appointment::find($id);

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted successfully']);
    }
}
