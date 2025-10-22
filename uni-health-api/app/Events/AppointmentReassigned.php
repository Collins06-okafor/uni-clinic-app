<?php

namespace App\Events;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentReassigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;
    public $doctor;

    public function __construct(Appointment $appointment, User $doctor)
    {
        $this->appointment = $appointment->load('patient');
        $this->doctor = $doctor;
    }

    public function broadcastOn()
    {
        return new Channel('doctor.' . $this->doctor->id);
    }

    public function broadcastAs()
    {
        return 'appointment.reassigned';
    }

    public function broadcastWith()
    {
        return [
            'appointment_id' => $this->appointment->id,
            'patient_name' => $this->appointment->patient->name,
            'priority' => $this->appointment->priority,
            'date' => $this->appointment->date,
            'time' => $this->appointment->time,
            'reassignment_notes' => $this->appointment->reassignment_notes
        ];
    }
}