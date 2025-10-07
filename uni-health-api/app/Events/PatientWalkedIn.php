<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;

class PatientWalkedIn implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment->load(['patient', 'doctor']);
    }

    public function broadcastOn()
    {
        // Broadcast to the specific doctor's channel
        return new Channel('doctor.' . $this->appointment->doctor_id);
    }

    public function broadcastAs()
    {
        return 'patient.walked.in';
    }

    public function broadcastWith()
    {
        return [
            'appointment_id' => $this->appointment->id,
            'patient' => [
                'id' => $this->appointment->patient->id,
                'name' => $this->appointment->patient->name,
                'student_id' => $this->appointment->patient->student_id,
            ],
            'type' => $this->appointment->type,
            'urgency' => $this->appointment->priority,
            'queue_number' => $this->appointment->queue_number ?? 0,
            'scheduled_time' => $this->appointment->time,
            'reason' => $this->appointment->reason,
            'timestamp' => now()->toISOString(),
        ];
    }
}